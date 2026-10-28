"""Support immediate revocation of all user access tokens on logout."""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('token_version', sa.Integer, nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('users') as batch:
        batch.drop_column('token_version')
