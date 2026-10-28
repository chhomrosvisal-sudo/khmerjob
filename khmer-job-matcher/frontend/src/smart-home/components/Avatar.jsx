import { useI18n } from '../../i18n/useI18n'
export default function Avatar({ member, size = 40 }) {
  const { t } = useI18n()
  return <svg width={size} height={size} viewBox="0 0 48 48" className="sh-avatar" role="img" aria-label={t("{v0}'s illustrated avatar", {v0: member.name})}><circle cx="24" cy="24" r="24" fill={member.color} /><path d="M8 48c0-14 8-18 16-18s16 4 16 18" fill={member.shirt} /><path d="M13 22c-3-17 25-20 23 0l-2 12H15z" fill={member.hair} /><ellipse cx="24" cy="23" rx="9" ry="11" fill="#f4c4a0" /><path d="M14 19c0-12 20-13 21 0-6-1-10-7-11-8-2 6-7 8-10 8" fill={member.hair} /><circle cx="21" cy="23" r=".8" fill="#573e39" /><circle cx="28" cy="23" r=".8" fill="#573e39" /><path d="M22 28q3 2 5-1" fill="none" stroke="#b16e66" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
