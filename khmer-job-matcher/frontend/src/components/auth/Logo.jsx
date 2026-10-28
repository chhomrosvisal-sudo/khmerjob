import { useI18n } from '../../i18n/useI18n'
import { Link } from 'react-router-dom'
import { Layers2 } from 'lucide-react'

export default function Logo() {
  const { t } = useI18n()
  return <Link className="au-logo" to="/" aria-label={t("KhmerJob home")}><span><Layers2 size={23} strokeWidth={2.2} /></span>Khmer<span className="au-logo-word">Job</span></Link>
}
