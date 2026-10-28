import { useI18n } from '../../i18n/useI18n'
import { Droplets, Thermometer, ChevronDown } from 'lucide-react'
import DeviceCard from './DeviceCard'
import { rooms } from '../data/devices'

export default function DeviceOverview({ devices, toggle, room, setRoom, query }) {
  const { t } = useI18n()
  return <section className="sh-overview"><div className="sh-section-title"><h2>{t("Scarlett's Home")}</h2><label className="sh-room-select"><span className="sr-only">{t("Select room")}</span><select value={room} onChange={event => setRoom(event.target.value)}>{rooms.map(value => <option key={value} value={value}>{t(value)}</option>)}</select><ChevronDown size={13} /></label></div>
    <div className="sh-room-metrics"><span><Droplets size={15} />35%<small>{t("Humidity")}</small></span><span><Thermometer size={15} />15°C<small>{t("Indoor temperature")}</small></span><small className="sh-metric-demo">{t("Demo readings")}</small></div>
    <div className="sh-overview-grid">{devices.map(device => <DeviceCard key={device.id} device={device} toggle={toggle} />)}</div>{!devices.length && <p className="sh-empty">{t("No devices match “")}{query}{t("”. Try another device name or room.")}</p>}
  </section>
}
