"""Add 20 fictional vacancies: python -m app.seed_more_jobs. Safe to rerun."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models import Job
from app.seed import seed


EXTRA_JOBS = [
    ('extra-python-api', 'Mekong Digital Studio', 'Junior Python API Developer', 'Phnom Penh', 'Full-time', ['Python', 'FastAPI', 'SQL', 'Git'], 'Develop REST endpoints, validate requests, and write API tests with senior guidance.'),
    ('extra-fullstack', 'Mekong Digital Studio', 'Junior Full-Stack Developer', 'Phnom Penh', 'Full-time', ['React', 'JavaScript', 'Python', 'SQL'], 'Connect responsive React pages to backend APIs and review changes with a mentor.'),
    ('extra-qa', 'Mekong Digital Studio', 'Software QA Intern', 'Phnom Penh', 'Internship', ['Software Testing', 'Git', 'Communication'], 'Test student-facing workflows, document defects, and maintain regression checklists.'),
    ('extra-mobile', 'Palm Creative', 'Junior Mobile Developer', 'Remote', 'Full-time', ['React Native', 'JavaScript', 'Git'], 'Build mobile screens and test accessibility and API integration on Android devices.'),
    ('extra-ui', 'Palm Creative', 'UI/UX Design Intern', 'Phnom Penh', 'Internship', ['Figma', 'UI/UX Design', 'Communication'], 'Prototype accessible interfaces and summarize usability feedback for the design team.'),
    ('extra-design', 'Palm Creative', 'Junior Graphic Designer', 'Siem Reap', 'Part-time', ['Adobe Photoshop', 'Adobe Illustrator', 'Graphic Design'], 'Prepare social media graphics and print layouts using a consistent visual identity.'),
    ('extra-sql', 'Tonle Insights', 'Database Assistant', 'Phnom Penh', 'Full-time', ['SQL', 'MySQL', 'Excel'], 'Validate imports, prepare reporting queries, and document database quality checks.'),
    ('extra-bi', 'Tonle Insights', 'Business Intelligence Intern', 'Remote', 'Internship', ['SQL', 'Power BI', 'Excel'], 'Build dashboard prototypes and explain reporting metrics with an analyst mentor.'),
    ('extra-ml', 'Tonle Insights', 'Machine Learning Intern', 'Phnom Penh', 'Internship', ['Python', 'Scikit-learn', 'Data Analysis'], 'Evaluate baseline models on sample data and document their limitations.'),
    ('extra-research', 'Tonle Insights', 'Research Data Assistant', 'Battambang', 'Part-time', ['Excel', 'Data Analysis', 'Communication'], 'Clean survey spreadsheets, check consistency, and prepare research summaries.'),
    ('extra-support', 'Lotus Learning Lab', 'IT Support Intern', 'Siem Reap', 'Internship', ['IT Support', 'Networking', 'Communication'], 'Assist staff with device setup and document common troubleshooting steps.'),
    ('extra-content', 'Lotus Learning Lab', 'Khmer Educational Content Assistant', 'Siem Reap', 'Part-time', ['Khmer', 'Content Writing', 'Communication'], 'Draft Khmer learning materials and review language clarity with educators.'),
    ('extra-english', 'Lotus Learning Lab', 'English Learning Facilitator', 'Battambang', 'Part-time', ['English', 'Communication', 'Teaching'], 'Support beginner practice sessions and organize student learning resources.'),
    ('extra-marketing', 'Palm Creative', 'Digital Marketing Intern', 'Phnom Penh', 'Internship', ['Digital Marketing', 'Content Writing', 'Excel'], 'Plan sample campaigns and summarize engagement metrics for team review.'),
    ('extra-social', 'Palm Creative', 'Social Media Assistant', 'Remote', 'Part-time', ['Social Media Marketing', 'Khmer', 'Graphic Design'], 'Prepare a content calendar and coordinate bilingual social posts.'),
    ('extra-accounting', 'Mekong Digital Studio', 'Junior Accounting Assistant', 'Phnom Penh', 'Full-time', ['Accounting', 'Excel', 'Communication'], 'Reconcile practice invoices and organize monthly bookkeeping records under supervision.'),
    ('extra-hr', 'Lotus Learning Lab', 'Human Resources Intern', 'Siem Reap', 'Internship', ['Human Resources', 'Excel', 'Communication'], 'Coordinate interview schedules and maintain confidential recruitment documentation.'),
    ('extra-sales', 'Mekong Digital Studio', 'Sales Support Assistant', 'Sihanoukville', 'Full-time', ['Sales', 'English', 'Communication'], 'Prepare product information and assist the team with customer follow-up records.'),
    ('extra-project', 'Mekong Digital Studio', 'Junior Project Coordinator', 'Phnom Penh', 'Full-time', ['Project Management', 'Excel', 'Communication'], 'Track tasks, prepare meeting notes, and communicate delivery updates.'),
    ('extra-ecommerce', 'Palm Creative', 'E-commerce Operations Intern', 'Siem Reap', 'Internship', ['Excel', 'Customer Service', 'Content Writing'], 'Review product listings and support order tracking in a training storefront.'),
]


def add_jobs(session):
    # Reuse the existing fictional companies instead of creating duplicates.
    for key, company, title, location, job_type, names, description in EXTRA_JOBS:
        demo_key = f'initial-{key}'
        if session.scalar(select(Job.id).where(Job.demo_key == demo_key)):
            continue
        seed(session, [(key, company, title, location, job_type, names, description)])
        job = session.scalar(select(Job).where(Job.demo_key == demo_key))
        if key in {'extra-design', 'extra-ui'}:
            job.category = 'design'
        elif key in {'extra-marketing', 'extra-social'}:
            job.category = 'marketing'
        elif key == 'extra-accounting':
            job.category = 'accounting'
        elif key in {'extra-content', 'extra-english', 'extra-hr', 'extra-sales', 'extra-project', 'extra-ecommerce'}:
            job.category = 'other'


if __name__ == '__main__':
    with Session(get_engine()) as session, session.begin():
        before = session.scalar(select(func.count()).select_from(Job))
        add_jobs(session)
        session.flush()
        after = session.scalar(select(func.count()).select_from(Job))
    print(f'Added {after - before} fictional demo jobs. Total jobs: {after}. Existing jobs preserved.')
