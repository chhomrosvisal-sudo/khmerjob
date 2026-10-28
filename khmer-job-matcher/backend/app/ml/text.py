"""Shared, versioned normalization for fitting, inference, and resume suggestions."""
import re
import unicodedata
from collections import Counter

ALIASES = {
    'react.js': 'react', 'reactjs': 'react', 'javascript es6': 'javascript', 'js': 'javascript',
    'python3': 'python', 'python 3': 'python', 'py': 'python', 'html5': 'html', 'css3': 'css',
    'mysql': 'sql', 'postgresql': 'sql', 'mssql': 'sql', 'ms excel': 'excel',
    'ភាសាអង់គ្លេស': 'english', 'គណនេយ្យ': 'accounting', 'ទីផ្សារ': 'marketing',
}


def normalize(text):
    value = unicodedata.normalize('NFKC', text or '').casefold().replace('\u200b', ' ')
    # Long aliases must be expanded first: "React.js" must not become "React.javascript".
    for alias in sorted(ALIASES, key=len, reverse=True):
        value = re.sub(r'(?<!\w)' + re.escape(alias) + r'(?!\w)', ALIASES[alias], value)
    return ' '.join(value.split())


def char_ngrams(text):
    value = normalize(text)
    return Counter(value[start:start + size] for size in (3, 4, 5)
                   for start in range(max(0, len(value) - size + 1)))


def extract_skills(text, skills):
    value = normalize(text)
    return [skill.id for skill in skills if any(
        re.search(r'(?<!\w)' + re.escape(normalize(name)) + r'(?!\w)', value)
        for name in [skill.name, skill.name_km] if name)]


def job_text(job):
    description = job.description or ''
    if getattr(job, 'is_demo', False):
        description = re.sub(r'^DEMONSTRATION ONLY\s*[—–-]\s*fictional employer and vacancy\.\s*', '', description, flags=re.I)
    experience = getattr(job, 'experience_level', '') or ''
    category = getattr(job, 'category', '') or ''
    return normalize(' '.join([job.title or '', description,
        '' if experience == 'Not specified' else experience,
        '' if category == 'other' else category,
        *(item.skill.name for item in job.requirements)]))


def profile_text(profile, skills):
    return normalize(' '.join([getattr(profile, field, '') or '' for field in ['education', 'interests', 'experience']] +
                              [skill.name for skill in skills]))
