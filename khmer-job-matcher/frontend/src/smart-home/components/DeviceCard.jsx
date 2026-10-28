import { useI18n } from '../../i18n/useI18n'
import { Refrigerator, Zap, AirVent, Lightbulb, Router, Music2, LampDesk } from 'lucide-react'
import DeviceToggle from './DeviceToggle'

const deviceIcons = { fridge: Refrigerator, temperature: Zap, air: AirVent, light: Lightbulb, router: Router, music: Music2, lamp: LampDesk }

export default function DeviceCard({ device, toggle, colorful = false }) {
  const { t } = useI18n()
  const Icon = deviceIcons[device.kind]
  const active = colorful || (device.id === 'temperature' && device.on)
  return <article className={`sh-device ${active ? `sh-device-${colorful ? device.tone : 'purple'}` : ''} ${device.on ? 'device-on' : ''}`}>
    <div className="sh-device-status"><span>{device.on ? t("ON") : t("OFF")}</span><DeviceToggle on={device.on} onChange={() => toggle(device.id)} label={t("{v0}{v1} power", {v0: t(device.name), v1: t(colorful ? ' in My Devices' : ' in Home')})} /></div>
    <Icon className="sh-device-icon" size={colorful ? 35 : 31} strokeWidth={1.55} />
    <h3>{t(device.name)}</h3>{colorful && <small>{t(device.room)}</small>}
  </article>
}
