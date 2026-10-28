"""Offline ranking evaluation. Labels must be explicitly supplied; no accuracy is invented."""
import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from types import SimpleNamespace
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_engine
from app.models import Skill
from app.ml.matching import rank_jobs
from app.ml.model import ensure_model
from app.ml.text import normalize
from app.routers.matching import catalog

FIELDS = ['education', 'interests', 'experience', 'preferred_location', 'preferred_category', 'skill_names']


def ranking_metrics(ranked_ids, relevance, k=5):
    selected = ranked_ids[:k]
    positive = {key for key, grade in relevance.items() if grade > 0}
    hits = sum(item in positive for item in selected)
    gain = lambda grades: sum((2 ** grade - 1) / math.log2(index + 2) for index, grade in enumerate(grades))
    actual = gain([relevance.get(item, 0) for item in selected])
    ideal = gain(sorted(relevance.values(), reverse=True)[:k])
    first = next((1 / (index + 1) for index, item in enumerate(selected) if item in positive), 0)
    return {'precision_at_k': hits / len(selected) if selected else 0, 'recall_at_k': hits / len(positive) if positive else 0,
            'ndcg_at_k': actual / ideal if ideal else 0, 'reciprocal_rank_at_k': first}


def read_labels(path):
    if path.stat().st_size > 10 * 1024 * 1024:
        raise ValueError('Evaluation files must be at most 10 MB.')
    loader = 'csv'
    try:
        import pandas as pd
    except ImportError:
        with path.open(encoding='utf-8-sig', newline='') as stream:
            rows = list(csv.DictReader(stream))
    else:
        rows = pd.read_csv(path, dtype=str, keep_default_na=False).to_dict(orient='records')
        loader = 'pandas'
    if not rows or not set(['profile_id', 'job_id', 'relevance', *FIELDS]).issubset(rows[0]):
        raise ValueError('CSV needs profile_id, job_id, relevance, education, interests, experience, preferred_location, preferred_category, skill_names.')
    grouped = {}
    for row in rows:
        profile_id = row['profile_id'].strip()
        if not profile_id:
            raise ValueError('Every evaluation row needs an anonymized profile_id.')
        if any(len(row[field]) > 5000 for field in FIELDS):
            raise ValueError('Evaluation profile fields are limited to 5,000 characters.')
        job_id, grade = int(row['job_id']), int(row['relevance'])
        if job_id < 1 or not 0 <= grade <= 3:
            raise ValueError('Job IDs must be positive, and relevance must be 0–3.')
        fields = {key: row[key].strip() for key in FIELDS}
        if profile_id not in grouped:
            grouped[profile_id] = {'profile': fields, 'labels': {}}
        case = grouped[profile_id]
        if case['profile'] != fields or job_id in case['labels']:
            raise ValueError('Each profile must have consistent fields and one label per job.')
        case['labels'][job_id] = grade
    return list(grouped.values()), loader


def evaluate_cases(cases, jobs, skills, model, k=5):
    valid_ids = {job.id for job in jobs}
    exact = {skill.name.casefold(): skill for skill in skills}
    aliases = {normalize(skill.name): skill for skill in skills}
    totals = defaultdict(float)
    coverage = []
    for case in cases:
        if not set(case['labels']).issubset(valid_ids):
            raise ValueError('Labels reference missing/closed/unapproved jobs; update the evaluation dataset.')
        fields = case['profile']
        selected = []
        for name in fields['skill_names'].split('|'):
            if not name.strip():
                continue
            skill = exact.get(name.strip().casefold()) or aliases.get(normalize(name))
            if skill is None:
                raise ValueError('Evaluation skill names must exist in the catalog.')
            selected.append(skill)
        profile = SimpleNamespace(**{key: value for key, value in fields.items() if key != 'skill_names'})
        ranked, _ = rank_jobs(profile, selected, jobs, model=model)
        for name, value in ranking_metrics([item['job_id'] for item in ranked], case['labels'], k).items():
            totals[name] += value
        coverage.append(len(case['labels']) / len(jobs) if jobs else 0)
    return {'profiles_evaluated': len(cases), 'k': k,
            'metrics': {key: round(value / len(cases), 4) for key, value in totals.items()},
            'mean_catalog_label_coverage': round(sum(coverage) / len(coverage), 4) if coverage else 0}


def main():
    parser = argparse.ArgumentParser(description='Evaluate ranking with explicit graded relevance labels. Unjudged jobs count as irrelevant.')
    parser.add_argument('--labels', required=True, type=Path)
    parser.add_argument('--k', type=int, default=5)
    parser.add_argument('--dataset-kind', choices=['synthetic', 'human'], default='synthetic')
    args = parser.parse_args()
    if not 1 <= args.k <= 100:
        parser.error('k must be between 1 and 100')
    try:
        cases, loader = read_labels(args.labels)
        with Session(get_engine()) as db:
            jobs = catalog(db)
            model = ensure_model(jobs)
            report = evaluate_cases(cases, jobs, db.scalars(select(Skill)).all(), model, args.k)
        print(json.dumps({**report, 'dataset_kind': args.dataset_kind, 'loader': loader,
                          'model': model.metadata(), 'warning': 'Synthetic fixtures are sanity checks, not evidence of real-world ranking quality.' if args.dataset_kind == 'synthetic' else 'Dataset provenance must be reviewed by the operator; these are ranking metrics, not hiring accuracy.'}, indent=2))
    except (ValueError, OSError) as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
