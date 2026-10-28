"""Run python -m app.seed after migrations. Adds fictional data without deleting rows."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models import Employer, Job, JobSkill, Skill

DEMO_JOBS = [
    ('frontend', 'Mekong Digital Studio', 'Junior Frontend Developer', 'Phnom Penh', 'Full-time',
     ['HTML', 'CSS', 'JavaScript', 'React', 'Git'], 'Build accessible, responsive interfaces alongside a mentor.'),
    ('web-intern', 'Lotus Learning Lab', 'Web Development Intern', 'Siem Reap', 'Internship',
     ['HTML', 'CSS', 'JavaScript'], 'Maintain educational demo websites and test mobile experiences.'),
    ('analyst', 'Tonle Insights', 'Junior Data Analyst', 'Phnom Penh', 'Full-time',
     ['Python', 'SQL', 'Excel'], 'Clean sample datasets and explain reports to a research team.'),
    ('react-intern', 'Palm Creative', 'React Developer Intern', 'Remote', 'Internship',
     ['React', 'JavaScript', 'Git', 'TypeScript'], 'Build reusable components and learn team code reviews.'),
]


def seed(session: Session):
    for key, company, title, location, job_type, names, description in DEMO_JOBS:
        demo_key = f'initial-{key}'
        if session.scalar(select(Job).where(Job.demo_key == demo_key)):
            continue
        employer = session.scalar(select(Employer).where(Employer.demo_key == demo_key))
        if employer is None:
            employer = Employer(name=company, is_demo=True, demo_key=demo_key)
            session.add(employer)
            session.flush()
        job = Job(employer_id=employer.id, title=title, location=location,
                  job_type=job_type, description=f'DEMONSTRATION ONLY — fictional employer and vacancy. {description}',
                  is_demo=True, demo_key=demo_key, category='technology')
        for name in names:
            skill = session.scalar(select(Skill).where(Skill.name == name))
            if skill is None:
                skill = Skill(name=name)
                session.add(skill)
                session.flush()
            job.requirements.append(JobSkill(skill_id=skill.id, required=True, proficiency='beginner'))
        session.add(job)
        session.flush()


if __name__ == '__main__':
    with Session(get_engine()) as session, session.begin():
        seed(session)
    print('Fictional demo seed complete. Existing jobs were preserved.')
