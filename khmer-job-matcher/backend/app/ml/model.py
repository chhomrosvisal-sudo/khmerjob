"""Fit a catalog TF-IDF index and predict with portable learned weights.

Only public job text is fitted. Query/profile text never changes IDF or enters the artifact.
Artifacts contain signed JSON, never executable pickle/joblib objects.
"""
import hashlib
import hmac
import importlib.util
import json
import math
import os
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock

from app.core.config import get_settings
from app.ml.text import char_ngrams, job_text, normalize

MODEL_VERSION = 'tfidf-char-v2'
MAX_FEATURES = 50000
MAX_ARTIFACT_BYTES = 64 * 1024 * 1024
_lock = RLock()
_cache = {}


class ModelUnavailable(ValueError):
    pass


def sklearn_available():
    return importlib.util.find_spec('sklearn') is not None


def canonical(data):
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode('utf-8')


def catalog_records(jobs):
    return [{'id': job.id, 'text': job_text(job)} for job in sorted(jobs, key=lambda item: item.id)]


def fingerprint(records):
    return hashlib.sha256(canonical({'version': MODEL_VERSION, 'records': records, 'max_features': MAX_FEATURES})).hexdigest()


def l2(vector):
    norm = math.sqrt(sum(value * value for value in vector.values()))
    return {key: value / norm for key, value in vector.items()} if norm else {}


class CatalogModel:
    def __init__(self, payload):
        self.payload = payload
        self.vocabulary = payload['vocabulary']
        self.idf = payload['idf']
        self.vectors = [{int(key): float(value) for key, value in row.items()} for row in payload['vectors']]

    def query_vector(self, text):
        counts = char_ngrams(text)
        vector = {self.vocabulary[term]: (1 + math.log(count)) * self.idf[self.vocabulary[term]]
                  for term, count in counts.items() if term in self.vocabulary}
        return l2(vector)

    def predict(self, text):
        vector = self.query_vector(text)
        return [min(1.0, max(0.0, sum(vector.get(index, 0) * weight for index, weight in row.items())))
                for row in self.vectors]

    def explanation_terms(self, text, job_index, limit=5):
        vector = self.query_vector(text)
        names = {index: term for term, index in self.vocabulary.items()}
        contributions = sorted(((names[index], weight * vector.get(index, 0))
                                for index, weight in self.vectors[job_index].items() if vector.get(index, 0)),
                               key=lambda item: (-item[1], item[0]))
        return [{'text': text, 'contribution': round(weight, 4)} for text, weight in contributions[:limit]]

    def metadata(self):
        return {key: self.payload[key] for key in ['version', 'engine', 'library_version', 'trained_at', 'fingerprint', 'document_count', 'feature_count']}


def fit_records(records, engine='auto'):
    if engine not in ['auto', 'builtin', 'sklearn']:
        raise ModelUnavailable('Choose auto, builtin, or sklearn as the training engine.')
    docs = [normalize(item['text']) for item in records]
    payload = {'version': MODEL_VERSION, 'job_ids': [item['id'] for item in records],
               'fingerprint': fingerprint(records), 'trained_at': datetime.now(timezone.utc).isoformat(),
               'document_count': len(records), 'engine': 'built-in TF-IDF', 'library_version': None}
    vectorizer_type = None
    if engine != 'builtin':
        try:
            import sklearn
            from sklearn.feature_extraction.text import TfidfVectorizer
            vectorizer_type = TfidfVectorizer
            payload.update(engine='scikit-learn TF-IDF', library_version=sklearn.__version__)
        except ImportError as error:
            if engine == 'sklearn':
                raise ModelUnavailable('scikit-learn is unavailable. Install backend requirements in the active virtual environment.') from error
    if vectorizer_type and docs and any(char_ngrams(text) for text in docs):
        vectorizer = vectorizer_type(analyzer='char', ngram_range=(3, 5), lowercase=False,
                                     sublinear_tf=True, smooth_idf=True, norm='l2', max_features=MAX_FEATURES)
        matrix = vectorizer.fit_transform(docs).tocsr()
        payload.update(vocabulary={term: int(index) for term, index in vectorizer.vocabulary_.items()},
                       idf=vectorizer.idf_.tolist(), vectors=[
                           {str(int(matrix.indices[index])): float(matrix.data[index])
                            for index in range(matrix.indptr[row], matrix.indptr[row + 1])}
                           for row in range(matrix.shape[0])])
    else:
        counts = [char_ngrams(text) for text in docs]
        frequency = Counter(term for document in counts for term in document)
        totals = sum(counts, Counter())
        chosen = sorted(sorted(totals, key=lambda term: (-totals[term], term))[:MAX_FEATURES])
        vocabulary = {term: index for index, term in enumerate(chosen)}
        idf = [math.log((1 + len(docs)) / (1 + frequency[term])) + 1 for term in chosen]
        vectors = [l2({vocabulary[term]: (1 + math.log(count)) * idf[vocabulary[term]]
                       for term, count in document.items() if term in vocabulary}) for document in counts]
        payload.update(vocabulary=vocabulary, idf=idf, vectors=[{str(key): value for key, value in vector.items()} for vector in vectors])
    payload['feature_count'] = len(payload['vocabulary'])
    return CatalogModel(payload)


def model_path():
    settings = get_settings()
    directory = Path(settings.ml_model_dir) if settings.ml_model_dir else Path(__file__).resolve().parents[2] / '.local_models'
    return directory.resolve() / 'job-matcher.json'


def signature(payload):
    key = get_settings().jwt_secret.get_secret_value().encode('utf-8')
    return hmac.new(key, b'khmerjob-ml-artifact\0' + canonical(payload), hashlib.sha256).hexdigest()


def save_model(model, path=None):
    target = path or model_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    encoded = canonical({'payload': model.payload, 'signature': signature(model.payload)})
    if len(encoded) > MAX_ARTIFACT_BYTES:
        raise ModelUnavailable('The fitted model exceeds the supported artifact size.')
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix='model-', suffix='.tmp', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(encoded)
        os.replace(temporary, target)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def load_model(path=None):
    target = path or model_path()
    if target.stat().st_size > MAX_ARTIFACT_BYTES:
        raise ModelUnavailable('Model file is too large.')
    wrapper = json.loads(target.read_text(encoding='utf-8'))
    payload = wrapper['payload']
    if payload.get('version') != MODEL_VERSION or not hmac.compare_digest(wrapper['signature'], signature(payload)):
        raise ModelUnavailable('Model integrity/version check failed. Retrain the catalog model.')
    if len(payload['job_ids']) != len(payload['vectors']) or len(payload['idf']) != payload['feature_count']:
        raise ModelUnavailable('Model dimensions are invalid. Retrain the catalog model.')
    return CatalogModel(payload)


def ensure_model(jobs, force=False, engine=None):
    records = catalog_records(jobs)
    key = fingerprint(records)
    selected = engine or get_settings().ml_engine
    target = model_path()
    cache_key = (str(target), key, selected)
    with _lock:
        if not force and cache_key in _cache:
            cached = _cache[cache_key]
            # Auto upgrades a built-in index when scikit-learn becomes available after installation.
            upgrade = selected != 'builtin' and cached.payload['engine'] == 'built-in TF-IDF' and sklearn_available()
            if not upgrade:
                return cached
        if not force:
            try:
                stored = load_model(target)
                correct_engine = selected == 'auto' or (selected == 'sklearn') == (stored.payload['engine'] == 'scikit-learn TF-IDF')
                upgrade = selected == 'auto' and stored.payload['engine'] == 'built-in TF-IDF' and sklearn_available()
                if stored.payload['fingerprint'] == key and correct_engine and not upgrade:
                    _cache[cache_key] = stored
                    return stored
            except (OSError, ValueError, KeyError, TypeError):
                pass
        fitted = fit_records(records, selected)
        save_model(fitted, target)
        _cache.clear()  # Bound memory; workers can safely reload the atomically replaced JSON artifact.
        _cache[cache_key] = fitted
        return fitted


def model_status(jobs):
    expected = fingerprint(catalog_records(jobs))
    result = {'available': False, 'catalog_job_count': len(jobs), 'sklearn_installed': sklearn_available(),
              'configured_engine': get_settings().ml_engine, 'version': MODEL_VERSION}
    try:
        stored = load_model()
        result.update(stored.metadata(), available=stored.payload['fingerprint'] == expected)
        result['stale'] = not result['available']
    except (OSError, ValueError, KeyError, TypeError):
        result.update(stale=True, message='Model has not been trained for this catalog yet.')
    return result
