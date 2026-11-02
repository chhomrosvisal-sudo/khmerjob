"""Read-only aggregates; never substitute demonstration or fabricated metrics."""
from datetime import date, datetime, time, timedelta

from fastapi import HTTPException
from sqlalchemy import extract, func, select

from app.models import Application, Employer, Job, JobSkill, Skill, User


def dashboard_data(db, start: date | None, end: date | None):
    end = end or date.today()
    start = start or date(end.year, 1, 1)
    if start > end or (end - start).days > 3660 or end == date.max:
        raise HTTPException(422, 'Choose an ordered date range of at most ten years')
    lower = datetime.combine(start, time.min)
    upper = datetime.combine(end + timedelta(days=1), time.min)

    def within(column):
        return (column >= lower, column < upper)

    def count(model, *conditions):
        return db.scalar(select(func.count()).select_from(model).where(*conditions))

    def monthly(model, *conditions):
        year, month = extract('year', model.created_at), extract('month', model.created_at)
        rows = db.execute(select(year, month, func.count()).where(
            *within(model.created_at), *conditions).group_by(year, month).order_by(year, month))
        counts = {f'{int(y):04d}-{int(m):02d}': n for y, m, n in rows}
        result = []
        cursor = start.replace(day=1)
        while cursor <= end:
            key = cursor.strftime('%Y-%m')
            result.append({'month': key, 'count': counts.get(key, 0)})
            if cursor.year == end.year and cursor.month == end.month:
                break
            cursor = date(cursor.year + (cursor.month == 12), cursor.month % 12 + 1, 1)
        return result

    demand = db.execute(select(Skill.name, func.count(JobSkill.job_id)).join(JobSkill).join(Job).join(Employer)
                        .where(JobSkill.required.is_(True), Job.is_active.is_(True), Employer.approved.is_(True),
                               *within(Job.created_at)).group_by(Skill.id, Skill.name)
                        .order_by(func.count(JobSkill.job_id).desc(), Skill.name).limit(10))
    activities = []
    # These are timestamped platform records, not an administrative audit trail.
    for model, label, path in [(User, 'Account registered', '/dashboard/students'),
                               (Job, 'Job posted', '/dashboard/jobs'),
                               (Application, 'Application submitted', '/dashboard/applications')]:
        statement = select(model.id, model.created_at).where(*within(model.created_at))
        if model is User:
            statement = statement.where(User.role == 'student')
        for record_id, timestamp in db.execute(statement.order_by(model.created_at.desc(), model.id.desc()).limit(10)):
            activities.append({'label': label, 'record_id': record_id, 'created_at': timestamp, 'path': path})
    activities.sort(key=lambda row: (row['created_at'], row['record_id']), reverse=True)
    return {
        'start': start, 'end': end,
        'students': count(User, User.role == 'student', *within(User.created_at)),
        'employers': count(User, User.role == 'employer', *within(User.created_at)),
        'verified_companies': count(Employer, Employer.approved.is_(True)),
        'active_jobs': db.scalar(select(func.count()).select_from(Job).join(Employer).where(
            Job.is_active.is_(True), Employer.approved.is_(True), *within(Job.created_at))),
        'applications': count(Application, *within(Application.created_at)),
        'ai_matches': None, 'pending_jobs': None,
        'pending_employers': count(Employer, Employer.approved.is_(False)),
        'student_registrations': monthly(User, User.role == 'student'),
        'job_postings': monthly(Job),
        'application_statuses': [{'name': status, 'count': n} for status, n in db.execute(
            select(Application.status, func.count()).where(*within(Application.created_at)).group_by(Application.status))],
        'top_skills': [{'name': name, 'count': n} for name, n in demand],
        'activities': activities[:10],
        'notes': [
            'Registration, job, application and skill metrics use the selected creation dates.',
            'Company approval and pending employer counts are current totals; approval means publishing access, not document verification.',
            'Active jobs require an active listing and approved employer. Demo records remain included and labeled in management pages.',
            'AI match history and job approval states are not stored yet; their counts are unavailable.',
            'Recent activity shows record creation, not administrator audit history.',
        ],
    }
