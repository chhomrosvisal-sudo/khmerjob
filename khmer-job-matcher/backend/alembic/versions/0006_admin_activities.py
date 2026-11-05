"""Persist administrator mutations without storing account or resume content."""
from alembic import op
import sqlalchemy as sa

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('admin_activities',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('actor_id', sa.Integer, sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('action', sa.String(60), nullable=False),
        sa.Column('target_type', sa.String(30), nullable=False),
        sa.Column('target_id', sa.Integer, nullable=False),
        sa.Column('changes', sa.JSON, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False))
    for column in ['actor_id', 'action', 'created_at']:
        op.create_index('ix_admin_activities_' + column, 'admin_activities', [column])


def downgrade():
    op.drop_table('admin_activities')
