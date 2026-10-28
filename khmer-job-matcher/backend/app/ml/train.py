"""Fit the current approved/open job catalog: python -m app.ml.train --engine auto."""
import argparse
import json
from sqlalchemy.orm import Session
from app.db.session import get_engine
from app.ml.model import ensure_model, ModelUnavailable
from app.routers.matching import catalog


def main():
    parser = argparse.ArgumentParser(description='Fit an unsupervised TF-IDF job recommendation model. No student data is saved.')
    parser.add_argument('--engine', choices=['auto', 'sklearn', 'builtin'], default='auto')
    args = parser.parse_args()
    try:
        with Session(get_engine()) as db:
            model = ensure_model(catalog(db), force=True, engine=args.engine)
        print(json.dumps({**model.metadata(), 'artifact_format': 'signed JSON', 'training_data': 'approved, open job listings only'}, indent=2))
    except (ModelUnavailable, OSError) as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
