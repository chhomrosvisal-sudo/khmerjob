"""Hybrid ranking using a fitted catalog model and explicit skill IDs."""
from app.ml.text import normalize, char_ngrams, extract_skills, profile_text
from app.ml.model import fit_records, catalog_records

WEIGHTS = {'skill_coverage': .65, 'text_similarity': .25, 'location': .05, 'category': .05}
FORMULA = '65% required-skill coverage + 25% catalog-fitted TF-IDF similarity + 5% location + 5% category'
LIMITATIONS = ('Compatibility estimate, not a hiring probability. Character n-grams compare Khmer text without understanding '
               'its semantics. Education/experience contribute text signals, not qualification verification. '
               'Ranking quality has not been human-validated.')


def similarities(profile_text_value, job_texts, engine='auto'):
    model = fit_records([{'id': index + 1, 'text': text} for index, text in enumerate(job_texts)], engine=engine)
    return model.predict(profile_text_value), model.payload['engine']


def rank_jobs(profile, skills, jobs, model=None):
    model = model or fit_records(catalog_records(jobs))
    query = profile_text(profile, skills)
    text_scores = model.predict(query)
    indices = {job_id: index for index, job_id in enumerate(model.payload['job_ids'])}
    ids = {skill.id for skill in skills}
    results = []
    for job in jobs:
        if job.id not in indices:
            raise ValueError('The fitted model does not match the current job catalog.')
        index = indices[job.id]
        similarity = text_scores[index]
        required = {item.skill.id: item.skill for item in job.requirements if item.required}
        matched = [skill.name for key, skill in required.items() if key in ids]
        missing = [skill.name for key, skill in required.items() if key not in ids]
        coverage = len(matched) / len(required) if required else 0
        location = float(bool(profile.preferred_location) and normalize(profile.preferred_location) == normalize(job.location))
        category = float(bool(profile.preferred_category) and normalize(profile.preferred_category) == normalize(job.category))
        weighted = {'skill_coverage': round(100 * WEIGHTS['skill_coverage'] * coverage, 2),
                    'text_similarity': round(100 * WEIGHTS['text_similarity'] * similarity, 2),
                    'location': round(100 * WEIGHTS['location'] * location, 2),
                    'category': round(100 * WEIGHTS['category'] * category, 2)}
        score = round(min(100, max(0, sum(weighted.values()))), 1)
        results.append({'job_id': job.id, 'score': score, 'matched_skills': matched, 'missing_skills': missing,
                        'learning_topics': missing, 'weighted_points': weighted,
                        'text_signals': model.explanation_terms(query, index),
                        'components': {'skill_coverage': round(coverage * 100, 1),
                        'text_similarity': round(similarity * 100, 1), 'location_match': bool(location), 'category_match': bool(category)}})
    return sorted(results, key=lambda item: (-item['score'], item['job_id'])), model.payload['engine']
