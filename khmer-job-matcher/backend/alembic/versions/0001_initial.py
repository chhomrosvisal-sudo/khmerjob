"""Initial schema. Kept explicit so future model edits cannot change history."""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('email', sa.String(254), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("role IN ('student', 'employer', 'admin')", name='ck_users_role'))
    op.create_table('student_profiles',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('name', sa.String(80), nullable=False),
        sa.Column('education', sa.String(160), nullable=False),
        sa.Column('interests', sa.Text, nullable=False))
    op.create_table('skills',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('name_km', sa.String(150)))
    op.create_table('student_skills',
        sa.Column('student_id', sa.Integer, sa.ForeignKey('student_profiles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('skill_id', sa.Integer, sa.ForeignKey('skills.id', ondelete='CASCADE'), primary_key=True))
    op.create_table('employers',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='SET NULL'), unique=True),
        sa.Column('name', sa.String(160), nullable=False),
        sa.Column('is_demo', sa.Boolean, nullable=False),
        sa.Column('demo_key', sa.String(80), unique=True))
    op.create_table('jobs',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('employer_id', sa.Integer, sa.ForeignKey('employers.id'), nullable=False),
        sa.Column('title', sa.String(160), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('location', sa.String(100), nullable=False),
        sa.Column('job_type', sa.String(40), nullable=False),
        sa.Column('is_demo', sa.Boolean, nullable=False),
        sa.Column('demo_key', sa.String(80), unique=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False))
    for column in ('employer_id', 'title', 'location', 'job_type'):
        op.create_index(f'ix_jobs_{column}', 'jobs', [column])
    op.create_table('job_skills',
        sa.Column('job_id', sa.Integer, sa.ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('skill_id', sa.Integer, sa.ForeignKey('skills.id'), primary_key=True),
        sa.Column('required', sa.Boolean, nullable=False),
        sa.Column('proficiency', sa.String(30), nullable=False))
    op.create_table('saved_jobs',
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('job_id', sa.Integer, sa.ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True))
    op.create_table('applications',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_id', sa.Integer, sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(30), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'job_id', name='uq_application_user_job'))


def downgrade():
    for table in ('applications', 'saved_jobs', 'job_skills', 'jobs', 'employers',
                  'student_skills', 'skills', 'student_profiles', 'users'):
        op.drop_table(table)
