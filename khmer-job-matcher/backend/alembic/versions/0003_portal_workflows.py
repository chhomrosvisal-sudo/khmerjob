"""Extend the portal without resetting existing data."""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.true()))
    for name, kind in [('experience', sa.Text), ('preferred_location', sa.String(100)), ('preferred_category', sa.String(80))]:
        op.add_column('student_profiles', sa.Column(name, kind, nullable=True))
        op.execute(sa.text(f"UPDATE student_profiles SET {name} = '' WHERE {name} IS NULL"))
    for name, kind in [('description', sa.Text), ('location', sa.String(100)), ('website', sa.String(250))]:
        op.add_column('employers', sa.Column(name, kind, nullable=True))
        op.execute(sa.text(f"UPDATE employers SET {name} = '' WHERE {name} IS NULL"))
    op.add_column('employers', sa.Column('approved', sa.Boolean, nullable=False, server_default=sa.true()))
    op.add_column('jobs', sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.true()))
    op.add_column('jobs', sa.Column('category', sa.String(80), nullable=False, server_default='other'))
    op.add_column('jobs', sa.Column('experience_level', sa.String(80), nullable=False, server_default='Not specified'))
    op.add_column('jobs', sa.Column('salary_min', sa.Integer, nullable=True))
    op.add_column('jobs', sa.Column('salary_max', sa.Integer, nullable=True))
    op.execute(sa.text("UPDATE jobs SET category = 'technology' WHERE demo_key IN ('initial-frontend', 'initial-web-intern', 'initial-analyst', 'initial-react-intern')"))
    op.create_table('resumes', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(150), nullable=False), sa.Column('media_type', sa.String(80), nullable=False),
        sa.Column('size', sa.Integer, nullable=False), sa.Column('content', sa.LargeBinary(length=16777215), nullable=False),
        sa.Column('detected_skill_ids', sa.JSON, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()))
    op.create_index('ix_resumes_user_id', 'resumes', ['user_id'])
    with op.batch_alter_table('applications') as batch:
        batch.add_column(sa.Column('resume_id', sa.Integer, nullable=True))
        batch.create_foreign_key('fk_applications_resume', 'resumes', ['resume_id'], ['id'], ondelete='SET NULL')
    op.create_table('password_resets', sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code_hash', sa.String(64), nullable=False), sa.Column('token_hash', sa.String(64)),
        sa.Column('expires_at', sa.DateTime, nullable=False), sa.Column('attempts', sa.Integer, nullable=False),
        sa.Column('used', sa.Boolean, nullable=False))
    op.create_index('ix_password_resets_user_id', 'password_resets', ['user_id'])
    op.create_table('rate_limits', sa.Column('key', sa.String(64), primary_key=True),
        sa.Column('window_start', sa.DateTime, nullable=False), sa.Column('count', sa.Integer, nullable=False))
    op.create_table('notifications', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message', sa.String(300), nullable=False), sa.Column('is_read', sa.Boolean, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()))
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])


def downgrade():
    op.drop_table('notifications')
    op.drop_table('rate_limits')
    op.drop_table('password_resets')
    with op.batch_alter_table('applications') as batch:
        batch.drop_constraint('fk_applications_resume', type_='foreignkey')
        batch.drop_column('resume_id')
    op.drop_table('resumes')
    for table, columns in [('jobs', ['salary_max', 'salary_min', 'experience_level', 'category', 'is_active']),
                           ('employers', ['approved', 'website', 'location', 'description']),
                           ('student_profiles', ['preferred_category', 'preferred_location', 'experience']),
                           ('users', ['is_active'])]:
        with op.batch_alter_table(table) as batch:
            for column in columns:
                batch.drop_column(column)
