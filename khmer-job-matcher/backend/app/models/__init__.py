from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint, func, LargeBinary, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = 'users'
    __table_args__ = (CheckConstraint("role IN ('student', 'employer', 'admin')", name='ck_users_role'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default='student')
    token_version: Mapped[int] = mapped_column(default=0, server_default='0')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default='1')
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class StudentProfile(Base):
    __tablename__ = 'student_profiles'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    education: Mapped[str] = mapped_column(String(160), default='')
    interests: Mapped[str] = mapped_column(Text, default='')
    experience: Mapped[str] = mapped_column(Text, default='')
    preferred_location: Mapped[str] = mapped_column(String(100), default='')
    preferred_category: Mapped[str] = mapped_column(String(80), default='')


class Skill(Base):
    __tablename__ = 'skills'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    name_km: Mapped[str | None] = mapped_column(String(150))


class StudentSkill(Base):
    __tablename__ = 'student_skills'
    student_id: Mapped[int] = mapped_column(ForeignKey('student_profiles.id', ondelete='CASCADE'), primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey('skills.id', ondelete='CASCADE'), primary_key=True)


class Employer(Base):
    __tablename__ = 'employers'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    demo_key: Mapped[str | None] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(Text, default='')
    location: Mapped[str] = mapped_column(String(100), default='')
    website: Mapped[str] = mapped_column(String(250), default='')
    approved: Mapped[bool] = mapped_column(Boolean, default=True, server_default='1')


class Job(Base):
    __tablename__ = 'jobs'
    id: Mapped[int] = mapped_column(primary_key=True)
    employer_id: Mapped[int] = mapped_column(ForeignKey('employers.id'), index=True)
    title: Mapped[str] = mapped_column(String(160), index=True)
    description: Mapped[str] = mapped_column(Text)
    location: Mapped[str] = mapped_column(String(100), index=True)
    job_type: Mapped[str] = mapped_column(String(40), index=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    demo_key: Mapped[str | None] = mapped_column(String(80), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default='1')
    category: Mapped[str] = mapped_column(String(80), default='other')
    experience_level: Mapped[str] = mapped_column(String(80), default='Not specified')
    salary_min: Mapped[int | None] = mapped_column()
    salary_max: Mapped[int | None] = mapped_column()
    employer: Mapped[Employer] = relationship()
    requirements: Mapped[list['JobSkill']] = relationship(cascade='all, delete-orphan')


class JobSkill(Base):
    __tablename__ = 'job_skills'
    job_id: Mapped[int] = mapped_column(ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey('skills.id'), primary_key=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    proficiency: Mapped[str] = mapped_column(String(30), default='beginner')
    skill: Mapped[Skill] = relationship()


class SavedJob(Base):
    __tablename__ = 'saved_jobs'
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True)


class Application(Base):
    __tablename__ = 'applications'
    __table_args__ = (UniqueConstraint('user_id', 'job_id', name='uq_application_user_job'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    job_id: Mapped[int] = mapped_column(ForeignKey('jobs.id', ondelete='CASCADE'))
    status: Mapped[str] = mapped_column(String(30), default='submitted')
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    job: Mapped[Job] = relationship()
    resume_id: Mapped[int | None] = mapped_column(ForeignKey('resumes.id', ondelete='SET NULL'))


class Resume(Base):
    __tablename__ = 'resumes'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    filename: Mapped[str] = mapped_column(String(150))
    media_type: Mapped[str] = mapped_column(String(80))
    size: Mapped[int] = mapped_column()
    content: Mapped[bytes] = mapped_column(LargeBinary(length=16777215))
    detected_skill_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    chunks: Mapped[list['ResumeChunk']] = relationship(cascade='all, delete-orphan', order_by='ResumeChunk.part')


class ResumeChunk(Base):
    __tablename__ = 'resume_chunks'
    resume_id: Mapped[int] = mapped_column(ForeignKey('resumes.id', ondelete='CASCADE'), primary_key=True)
    part: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[bytes] = mapped_column(LargeBinary(length=500000))


class PasswordReset(Base):
    __tablename__ = 'password_resets'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    token_hash: Mapped[str | None] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    attempts: Mapped[int] = mapped_column(default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)


class RateLimit(Base):
    __tablename__ = 'rate_limits'
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    window_start: Mapped[datetime] = mapped_column(DateTime)
    count: Mapped[int] = mapped_column(default=0)


class Notification(Base):
    __tablename__ = 'notifications'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    message: Mapped[str] = mapped_column(String(300))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SocialIdentity(Base):
    __tablename__ = 'social_identities'
    __table_args__ = (UniqueConstraint('provider', 'subject', name='uq_social_provider_subject'),
                     UniqueConstraint('user_id', 'provider', name='uq_social_user_provider'))
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    provider: Mapped[str] = mapped_column(String(20))
    subject: Mapped[str] = mapped_column(String(255).with_variant(String(255, collation='utf8mb4_bin'), 'mysql'))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class OAuthFlow(Base):
    __tablename__ = 'oauth_flows'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(String(20))
    browser_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    link_user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    link_token_version: Mapped[int | None] = mapped_column()
