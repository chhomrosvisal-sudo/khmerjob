import { useI18n } from '../../i18n/useI18n'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import DeviceCard from './DeviceCard'

export default function MyDevices({ devices, toggle, status, setStatus }) {
  const { t } = useI18n()
  return <section className="sh-my-devices"><div className="sh-section-title"><h2>{t("My Devices")}</h2><div><label><span className="sr-only">{t("Filter My Devices by status")}</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">{t("All status")}</option><option value="on">{t("On")}</option><option value="off">{t("Off")}</option></select></label><Link className="sh-section-arrow" to="/smart-home/devices" aria-label={t("View all devices")}><ArrowUpRight size={18} /></Link></div></div><div className="sh-my-devices-grid">{devices.map(device => <DeviceCard key={device.id} device={device} toggle={toggle} colorful />)}</div>{!devices.length && <p className="sh-empty">{t("No devices match this status or search.")}</p>}</section>
}
