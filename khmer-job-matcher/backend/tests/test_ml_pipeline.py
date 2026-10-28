import json
import math
from types import SimpleNamespace
import pytest
from sqlalchemy.orm import Session
from app.ml.model import (fit_records, ensure_model, load_model, save_model, model_path,
                          model_status, ModelUnavailable, sklearn_available)
from app.ml.text import normalize, extract_skills
from app.ml.evaluate import ranking_metrics, read_labels
from app.ml.matching import rank_jobs
from test_completion import seeker, privileged


def test_fit_learns_catalog_only_and_queries_do_not_modify_idf():
    records = [{'id': 1, 'text': 'Python data analysis SQL'}, {'id': 2, 'text': 'React frontend JavaScript'}]
    model = fit_records(records, engine='builtin')
    before = json.dumps(model.payload, sort_keys=True)
    assert model.predict('Python SQL')[0] > model.predict('Python SQL')[1]
    assert model.predict('')[0] == 0
    assert model.predict('ZZZZZZZ') == [0, 0]
    assert json.dumps(model.payload, sort_keys=True) == before
    assert 'private candidate sentence' not in json.dumps(model.payload)
    assert all(math.isfinite(value) and 0 <= value <= 1 for value in model.predict('Python SQL React'))
    assert model.explanation_terms('Python SQL', 0)


def test_saved_model_round_trip_and_integrity_check(tmp_path):
    model = fit_records([{'id': 1, 'text': 'Python web engineer'}], engine='builtin')
    path = tmp_path / 'model.json'
    save_model(model, path)
    loaded = load_model(path)
    assert loaded.predict('Python') == model.predict('Python')
    value = json.loads(path.read_text())
    value['payload']['idf'][0] += 1
    path.write_text(json.dumps(value))
    with pytest.raises(ModelUnavailable, match='integrity'):
        load_model(path)


def test_cache_refreshes_when_job_text_changes(client, engine):
    from app.routers.matching import catalog
    with Session(engine) as db:
        jobs = catalog(db)
        first = ensure_model(jobs, engine='builtin')
        second = ensure_model(jobs, engine='builtin')
        assert first is second
        jobs[0].description += ' Additional Python data responsibilities.'
        changed = ensure_model(jobs, engine='builtin')
        assert changed.payload['fingerprint'] != first.payload['fingerprint']
        assert model_status(jobs)['available']
        assert model_path().is_file()


def test_empty_and_tiny_catalogs_and_alias_boundaries():
    assert fit_records([], engine='builtin').predict('anything') == []
    assert fit_records([{'id': 1, 'text': 'x'}], engine='builtin').predict('x') == [0]
    assert normalize('React.js JS Python3 HTML5 CSS3 MySQL') == 'react javascript python html css sql'
    assert normalize('  ＰＹＴＨＯＮ\u200b ') == 'python'
    skills = [SimpleNamespace(id=1, name='React', name_km=None), SimpleNamespace(id=2, name='SQL', name_km=None)]
    assert extract_skills('React.js with MySQL', skills) == [1, 2]
    assert extract_skills('reactive sequel', skills) == []
    assert fit_records([{'id': 1, 'text': 'ការងារកម្ពុជា'}, {'id': 2, 'text': 'unrelated'}], engine='builtin').predict('ការងារកម្ពុជា')[0] > .99


def test_matching_api_metadata_filtering_and_admin_training(client, engine):
    headers = seeker(client, 'ml-pipeline@example.com')
    admin = privileged(client, engine, 'admin', 'ml-admin@example.com')
    assert client.post('/api/admin/ml/train', headers=headers, json={'engine': 'builtin'}).status_code == 403
    trained = client.post('/api/admin/ml/train', headers=admin, json={'engine': 'builtin'})
    assert trained.status_code == 200, trained.text
    assert trained.json()['document_count'] == 4
    assert trained.json()['feature_count'] > 0
    result = client.post('/api/match?page=1&page_size=1', headers=headers)
    assert result.status_code == 200, result.text
    assert result.json()['total'] == 4 and len(result.json()['items']) == 1
    assert not result.json()['profile_ready']
    assert result.json()['model']['version'] == 'tfidf-char-v2'
    assert set(result.json()['items'][0]['weighted_points']) == {'skill_coverage', 'text_similarity', 'location', 'category'}
    assert client.post('/api/match?min_score=100', headers=headers).json()['total'] == 0
    assert client.post('/api/match?job_type=Internship', headers=headers).json()['total'] == 2
    assert client.post('/api/match?page_size=101', headers=headers).status_code == 422
    assert client.post('/api/match?min_score=-1', headers=headers).status_code == 422
    assert client.get('/api/match/status', headers=headers).json()['available']
    assert client.get('/api/admin/ml/status', headers=headers).status_code == 403
    assert client.post('/api/admin/ml/train', headers=admin, json={'engine': 'bogus'}).status_code == 422
    if not sklearn_available():
        assert client.post('/api/admin/ml/train', headers=admin, json={'engine': 'sklearn'}).status_code == 503


def test_hybrid_scores_deduplicate_required_skills_and_handle_missing_requirements():
    skill = SimpleNamespace(id=1, name='Python', name_km=None)
    required = SimpleNamespace(skill=skill, required=True)
    job = SimpleNamespace(id=1, title='Python Developer', description='Python services', experience_level='', category='technology',
                          location='Phnom Penh', requirements=[required, required], is_demo=False)
    profile = SimpleNamespace(education='', interests='', experience='', preferred_location='Phnom Penh', preferred_category='technology')
    ranked, _ = rank_jobs(profile, [skill, skill], [job])
    assert ranked[0]['matched_skills'] == ['Python']
    assert ranked[0]['components']['skill_coverage'] == 100
    assert ranked[0]['weighted_points']['skill_coverage'] == 65
    assert ranked[0]['weighted_points']['location'] == 5
    job.requirements = []
    ranked, _ = rank_jobs(profile, [], [job])
    assert ranked[0]['components']['skill_coverage'] == 0
    assert ranked[0]['score'] == 10  # Only explicit location/category preferences match.


def test_evaluation_metrics_and_label_validation(tmp_path):
    perfect = ranking_metrics([1, 2, 3], {1: 3, 2: 1, 3: 0}, k=2)
    assert perfect == {'precision_at_k': 1, 'recall_at_k': 1, 'ndcg_at_k': 1, 'reciprocal_rank_at_k': 1}
    reversed_order = ranking_metrics([3, 2, 1], {1: 3, 2: 1, 3: 0}, k=2)
    assert reversed_order['ndcg_at_k'] < 1
    assert ranking_metrics([], {}, 5)['precision_at_k'] == 0
    bad = tmp_path / 'bad.csv'
    bad.write_text('profile_id,job_id,relevance\nexample,1,3\n')
    with pytest.raises(ValueError, match='CSV needs'):
        read_labels(bad)
    # CSV example is explicitly synthetic and includes every seeded catalog job.
    from pathlib import Path
    cases, loader = read_labels(Path('app/ml/evaluation.example.csv'))
    assert len(cases) == 2 and loader in ['csv', 'pandas']


def test_sklearn_fit_and_portable_inference_agree():
    sklearn = pytest.importorskip('sklearn')
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    documents = ['python data sql engineer', 'react frontend javascript']
    vectorizer = TfidfVectorizer(analyzer='char', ngram_range=(3, 5), lowercase=False, sublinear_tf=True, norm='l2')
    matrix = vectorizer.fit_transform(documents)
    expected = cosine_similarity(vectorizer.transform(['python sql']), matrix).ravel().tolist()
    model = fit_records([{'id': i + 1, 'text': text} for i, text in enumerate(documents)], engine='sklearn')
    assert model.payload['library_version'] == sklearn.__version__
    assert model.predict('python sql') == pytest.approx(expected, abs=1e-10)
