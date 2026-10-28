import { useI18n } from '../../i18n/useI18n'
import { ArrowUpRight } from 'lucide-react'
import Avatar from './Avatar'
import { members } from '../data/members'

export default function FamilyMembers({ showMember }) {
  const { t } = useI18n()
  return <section className="sh-members"><div className="sh-section-title"><h2>{t("Members")}</h2><button className="sh-section-arrow" aria-label={t("View member details")} onClick={() => showMember('all')}><ArrowUpRight size={18} /></button></div><div className="sh-members-card">{members.map(member => <button key={member.id} onClick={() => showMember(member.id)} aria-label={t("View {v0}, {v1}", {v0: member.name, v1: member.role})}><Avatar member={member} size={40} /><strong>{member.name}</strong><span>{t(member.role)}</span></button>)}</div></section>
}
