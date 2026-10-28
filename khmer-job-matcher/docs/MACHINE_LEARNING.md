# Job recommendation model

This is an unsupervised text model with an explainable hybrid ranking formula. It does not predict employment outcomes or learn from application acceptance decisions.

## Use it

1. Log in as a job seeker, open **My Profile**, and save skills, education, experience, interests, and location/category preferences.
2. Open `/account/recommendations`. Results include similarity estimates, matched requirements, missing skills, learning suggestions, and weighted score components.
3. Administrators can view model status and retrain from `/dashboard`. Public users cannot access training controls.

The current catalog has four fictional development vacancies. More varied, well-written jobs and accurate required skills are needed for useful real-world results.

## Pipeline

`app/ml/text.py` normalizes Unicode, whitespace, and curated English/Khmer aliases. Character n-grams of length 3–5 provide partial-word matching without a separate Khmer tokenizer. Job text includes title, description, category, experience level, and required skills. Boilerplate sample-data disclaimers are excluded.

`app/ml/model.py` fits TF-IDF on approved, open job listings only. It uses smoothed inverse document frequency, sublinear term frequency, L2 normalization, and up to 50,000 features. Profiles never enter the fitted corpus. At prediction time, profile text is projected into the saved vocabulary and cosine similarity compares the normalized sparse vectors.

Training uses scikit-learn's `TfidfVectorizer` when installed; portable inference uses the exported learned weights. A built-in implementation permits offline development. The actual fitting engine is shown in API/UI metadata. The built-in and scikit-learn vocabulary selection can differ when the feature cap is reached.

`app/ml/matching.py` combines 65 points of required-skill coverage, 25 points of text similarity, five points of location preference, and five points of category preference. Skill coverage compares catalog IDs; duplicate requirements do not inflate coverage. Missing preferences contribute zero points. Jobs with no required skills receive zero skill-coverage points. Scores are compatibility estimates, never hiring probabilities.

## Train and configure

Run from `backend`:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m app.ml.train --engine sklearn
```

Restart FastAPI after installing packages. Alternatively, `--engine auto` selects the available engine, and `--engine builtin` explicitly selects the offline fitter. Strict `sklearn` training returns an actionable error when its package is missing.

Optional `backend/.env` settings:

```dotenv
ML_ENGINE=auto
# Optional absolute directory writable by the API process:
ML_MODEL_DIR=
```

The default artifact is `backend/.local_models/job-matcher.json`, excluded from source control. It stores vocabulary, IDF weights, normalized job vectors, job IDs, and training metadata. HMAC signing uses the server secret with a distinct domain prefix; the file is JSON rather than executable pickle. Changing the secret invalidates the saved signature and triggers retraining. No candidate profile or resume text is saved in it.

The API caches the fitted model. A fingerprint of public job text detects catalog changes, including approval/closure changes, and refreshes the artifact before ranking. Atomic replacement prevents partial writes. Deployments with many workers should run training in a coordinated maintenance process; this version uses a process-local lock and synchronous training suitable for the local catalog.

## API

| Endpoint | Role | Purpose |
|---|---|---|
| `POST /api/match` | Job seeker | Ranked results; `page`, `page_size`, `min_score`, `job_type` query parameters |
| `GET /api/match/status` | Job seeker | Model readiness and metadata |
| `GET /api/admin/ml/status` | Admin | Catalog/model status |
| `POST /api/admin/ml/train` | Admin | Train with JSON body `{"engine":"auto"}`; also accepts `builtin` or `sklearn` |

The recommendation response includes the formula, model version/engine, limitations, profile readiness, total count, score components, and text contribution signals. Character-fragment signals explain overlap; they are not independent proof of skill proficiency.

## Evaluate ranking

```powershell
.\venv\Scripts\python.exe -m app.ml.evaluate --labels app/ml/evaluation.example.csv --k 3 --dataset-kind synthetic
.\venv\Scripts\python.exe -m pytest -q
```

The example CSV has two synthetic profiles and labels for the four seeded job IDs. It is a sanity check only. It must be updated if the catalog changes. Columns include a consistent profile ID, profile fields, pipe-separated catalog skill names, job ID, and graded relevance from 0 (irrelevant) to 3 (highly relevant). pandas reads the CSV when installed; the standard-library CSV reader is the offline fallback.

For meaningful evaluation, collect independently reviewed, consented or anonymized profile/job judgments and use `--dataset-kind human`. Label the complete candidate catalog where practical: unjudged jobs count as irrelevant. The report includes label coverage, precision, recall, graded nDCG, and reciprocal rank at K. Precision divides by the number of returned slots when fewer than K jobs exist. Do not use private resumes in committed datasets. Keep a held-out human evaluation set when tuning weights; do not describe synthetic metrics as accuracy.

Locally verified: 36 backend tests passed and the optional real scikit-learn parity test was skipped because the package is unavailable. Training saved four jobs and 990 learned features. The two-profile synthetic evaluation completed. The scikit-learn and pandas branches require installation and rerunning checks; browser interaction tests remain pending.

## Limits and references

Character similarity does not understand Khmer semantics, infer skills reliably from arbitrary prose, verify qualifications, or measure fairness. Catalog-ID coverage needs a maintained skill taxonomy. Large catalogs need background training and a scalable retrieval strategy. Human relevance judgments and ongoing monitoring are still required before claiming recommendation quality.

Primary implementation references: [scikit-learn TF-IDF vectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html) and [cosine similarity](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html).
