from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import delete, select, func
from sqlalchemy.orm import joinedload, selectinload

from app.core.dependencies import Database, StudentUser
from app.models import Job, JobSkill, SavedJob, Skill, StudentProfile, StudentSkill, Employer, Application
from app.schemas.jobs import JobOut
from app.schemas.students import ProfileOut, ProfilePatch

router = APIRouter(prefix='/api/students', tags=['students'])


def own_profile(db, user):
    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id))
    if profile is None:
        raise HTTPException(404, 'Student profile not found')
    return profile


def serialize_profile(db, profile):
    skills = db.scalars(select(Skill).join(StudentSkill).where(
        StudentSkill.student_id == profile.id).order_by(Skill.name)).all()
    return ProfileOut(id=profile.id, name=profile.name, education=profile.education,
                      interests=profile.interests, skills=skills, experience=profile.experience,
                      preferred_location=profile.preferred_location, preferred_category=profile.preferred_category)


@router.get('/me', response_model=ProfileOut)
def get_profile(user: StudentUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return serialize_profile(db, own_profile(db, user))


@router.patch('/me', response_model=ProfileOut)
def patch_profile(payload: ProfilePatch, user: StudentUser, db: Database, response: Response):
    profile = own_profile(db, user)
    changes = payload.model_dump(exclude_unset=True)
    if 'skill_ids' in changes:
        ids = changes.pop('skill_ids')
        found = set(db.scalars(select(Skill.id).where(Skill.id.in_(ids))).all())
        if found != set(ids):
            raise HTTPException(422, 'Unknown skill IDs')
        db.execute(delete(StudentSkill).where(StudentSkill.student_id == profile.id))
        db.add_all(StudentSkill(student_id=profile.id, skill_id=skill_id) for skill_id in ids)
    for key, value in changes.items():
        setattr(profile, key, value)
    db.commit()
    response.headers['Cache-Control'] = 'no-store'
    return serialize_profile(db, profile)


@router.get('/me/overview')
def overview(user: StudentUser, db: Database, response: Response):
    profile = own_profile(db, user)
    skill_ids = set(db.scalars(select(StudentSkill.skill_id).where(StudentSkill.student_id == profile.id)).all())
    jobs = db.scalars(select(Job).join(Employer).where(Job.is_active.is_(True), Employer.approved.is_(True)).options(joinedload(Job.employer),
        selectinload(Job.requirements).joinedload(JobSkill.skill))).all()
    ranked = []
    for job in jobs:
        required = {item.skill_id for item in job.requirements if item.required}
        score = int(len(required & skill_ids) / len(required) * 100 + 0.5) if required else 0
        ranked.append((score, job))
    ranked.sort(key=lambda item: (-item[0], item[1].id))
    response.headers['Cache-Control'] = 'no-store'
    return {'skills_count': len(skill_ids), 'total_jobs': len(jobs),
            'applications_count': db.scalar(select(func.count()).select_from(Application).where(Application.user_id == user.id)),
            'application_statuses': dict(db.execute(select(Application.status, func.count()).where(Application.user_id == user.id).group_by(Application.status)).all()),
            'profile_completion': round(sum([bool(profile.name.strip()), bool(profile.education.strip()), bool(profile.interests.strip()), bool(skill_ids), bool(profile.experience.strip()), bool(profile.preferred_location.strip())]) / 6 * 100),
            'matched_jobs_count': sum(score > 0 for score, job in ranked),
            'highest_coverage': ranked[0][0] if ranked else 0,
            'saved_count': db.scalar(select(func.count()).select_from(SavedJob).where(SavedJob.user_id == user.id)),
            'recommended': [JobOut.model_validate(job) for score, job in ranked[:6]],
            'score_description': 'Required-skill coverage only; not a hiring probability or an ML score.'}
