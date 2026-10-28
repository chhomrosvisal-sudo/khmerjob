"""Google/Facebook identities and single-use browser-bound OAuth transactions."""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('social_identities',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(20), nullable=False),
        sa.Column('subject', sa.String(255).with_variant(sa.String(255, collation='utf8mb4_bin'), 'mysql'), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('provider', 'subject', name='uq_social_provider_subject'),
        sa.UniqueConstraint('user_id', 'provider', name='uq_social_user_provider'))
    op.create_index('ix_social_identities_user_id', 'social_identities', ['user_id'])
    op.create_table('oauth_flows',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('provider', sa.String(20), nullable=False),
        sa.Column('browser_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('used', sa.Boolean, nullable=False),
        sa.Column('link_user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('link_token_version', sa.Integer))
    op.create_index('ix_oauth_flows_expires_at', 'oauth_flows', ['expires_at'])


def downgrade():
    op.drop_table('oauth_flows')
    op.drop_table('social_identities')
