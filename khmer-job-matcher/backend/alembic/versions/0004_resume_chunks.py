"""Support 5 MB private resumes even on MySQL installations with 1 MB packets."""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('resume_chunks',
        sa.Column('resume_id', sa.Integer, sa.ForeignKey('resumes.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('part', sa.Integer, primary_key=True),
        sa.Column('content', sa.LargeBinary(length=500000), nullable=False))


def downgrade():
    op.drop_table('resume_chunks')
