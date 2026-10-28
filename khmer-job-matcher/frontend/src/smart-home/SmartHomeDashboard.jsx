import { useI18n } from '../i18n/useI18n'
import { useMemo, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { ArrowUpRight, Zap, Leaf, Wifi, ShieldCheck, LockKeyhole, Camera, DoorOpen } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import WelcomeBanner from './components/WelcomeBanner'
import DeviceOverview from './components/DeviceOverview'
import DeviceCard from './components/DeviceCard'
import DeviceToggle from './components/DeviceToggle'
import TemperatureControl from './components/TemperatureControl'
import MyDevices from './components/MyDevices'
import FamilyMembers from './components/FamilyMembers'
import Avatar from './components/Avatar'
import PowerChart from './components/PowerChart'
import Modal from './components/Modal'
import { initialDevices, initialTemperatures, initialRoomPower, rooms, changeDevice, findDevices, clampTemperature } from './data/devices'
import { members } from './data/members'
import { chartPeriods } from './data/chartData'
import './smart-home.css'

export default function SmartHomeDashboard({ onSignOut } = {}) {
  const { t } = useI18n()
  const location = useLocation()
  const section = location.pathname.replace('/smart-home', '').split('/')[1] || 'overview'
  const [devices, setDevices] = useState(initialDevices)
  const [temperatures, setTemperatures] = useState(initialTemperatures)
  const [roomPower, setRoomPower] = useState(initialRoomPower)
  const [room, setRoom] = useState('Living Room')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [modal, setModal] = useState(null)
  const [notifications, setNotifications] = useState(true)
  const [preferences, setPreferences] = useState({ reducedMotion: false, notifications: true })
  const [security, setSecurity] = useState({ alarm: true, camera: false, lock: true })
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    try { await onSignOut() } finally { setLoggingOut(false) }
  }

  function toggle(id) {
    setDevices(current => changeDevice(current, id))
    if (id === 'temperature') setRoomPower(current => ({ ...current, 'Living Room': !current['Living Room'] }))
  }
  function toggleRoomPower() {
    if (room === 'Living Room') toggle('temperature')
    else setRoomPower(current => ({ ...current, [room]: !current[room] }))
  }
  function setTemperature(value) { setTemperatures(current => ({ ...current, [room]: clampTemperature(value) })) }
  const allFiltered = useMemo(() => findDevices(devices, search, 'all', t), [devices, search, t])
  const overview = useMemo(() => {
    if (search.trim()) return allFiltered
    const roomDevices = room === 'Living Room' ? devices.slice(0, 4) : devices.filter(device => device.room === room || device.id === 'temperature')
    return roomDevices.map(device => device.id === 'temperature' ? { ...device, room, on: roomPower[room] } : device)
  }, [devices, room, roomPower, search, allFiltered])
  const sideDevices = useMemo(() => findDevices(devices.filter(device => ['refrigerator', 'router', 'music', 'lamps'].includes(device.id)), search, status, t), [devices, search, status, t])
  const activeCount = devices.filter(device => device.on).length
  function resetDemo() {
    setDevices(initialDevices); setTemperatures(initialTemperatures); setRoomPower(initialRoomPower); setRoom('Living Room'); setSearch(''); setStatus('all'); setSecurity({ alarm: true, camera: false, lock: true }); setNotifications(true)
  }
  const powerWidget = <PowerChart openDetails={period => setModal({ type: 'power', period })} />
  return <div className={`smart-home ${preferences.reducedMotion ? 'sh-reduce-motion' : ''}`}><a className="skip-link" href="#smart-main">{t("Skip to dashboard")}</a><div className="sh-demo-top"><span><i />{t("SMART HOME · INTERACTIVE DEMO")}</span><Link to="/">{t("Back to KhmerJob ")}<ArrowUpRight size={13} /></Link></div>
    <div className="sh-shell"><Sidebar onSignOut={onSignOut ? logout : undefined} loggingOut={loggingOut} /><Header search={search} setSearch={setSearch} openSettings={() => setModal({ type: 'settings' })} notifications={notifications} setNotifications={setNotifications} notificationsEnabled={preferences.notifications} onSignOut={onSignOut ? logout : undefined} loggingOut={loggingOut} />
      <main className="sh-main" id="smart-main" tabIndex={-1}>
        {section === 'overview' && <WelcomeBanner />}
        {section !== 'overview' && <div className="sh-page-heading"><span className="sh-eyebrow">{t("SCARLETT'S CONNECTED HOME")}</span><h1>{t(({ devices: 'All your devices', security: 'Peace of mind, at home', rooms: 'A space for every mood', members: 'Your favorite people', analytics: 'A little energy insight' })[section] || "Page not found")}</h1><p>{search ? t("Searching devices for “{v0}”", {v0: search}) : t("Make yourself at home. Every control here is a simulation.")}</p></div>}
        {section === 'overview' && <><DeviceOverview devices={overview} toggle={id => id === 'temperature' && !search.trim() ? toggleRoomPower() : toggle(id)} room={room} setRoom={setRoom} query={search} /><TemperatureControl room={room} temperature={temperatures[room]} setTemperature={setTemperature} on={roomPower[room]} togglePower={toggleRoomPower} />
          <div className="sh-home-insights"><div><span className="sh-insight-icon"><Wifi size={19} /></span><span><strong>{t("Everything in sync")}</strong><small>{activeCount}{t(" of ")}{devices.length}{t(" simulated devices on")}</small></span><span className="sh-live-dot on" /></div><div><span className="sh-insight-icon green"><Leaf size={19} /></span><span><strong>{t("A little less energy")}</strong><small>{t("Switch off devices you aren't using.")}</small></span><Link to="/smart-home/analytics" aria-label={t("Explore energy analytics")}><ArrowUpRight size={19} /></Link></div></div></>}
        {section === 'devices' && <section className="sh-directory"><div className="sh-section-title"><h2>{allFiltered.length}{t(" devices")}</h2><span>{activeCount}{t(" online · Demo")}</span></div><div className="sh-directory-grid">{allFiltered.map(device => <DeviceCard key={device.id} device={device} toggle={toggle} colorful={device.tone !== 'plain'} />)}</div>{!allFiltered.length && <p className="sh-empty">{t("No devices found. Change your search to try again.")}</p>}</section>}
        {section === 'rooms' && <><div className="sh-room-grid">{rooms.map(value => <button className={room === value ? 'selected' : ''} key={value} onClick={() => setRoom(value)}><DoorOpen size={26} /><strong>{t(value)}</strong><span>{temperatures[value]}{t("°C target")}</span><small>{roomPower[value] ? t("Temperature on") : t("Temperature off")}</small></button>)}</div><TemperatureControl room={room} temperature={temperatures[room]} setTemperature={setTemperature} on={roomPower[room]} togglePower={toggleRoomPower} /></>}
        {section === 'security' && <section className="sh-security"><div className="sh-security-banner"><ShieldCheck size={42} /><h2>{t("Your simulated home, protected.")}</h2><p>{t("Demo controls only. No real cameras, locks, or emergency services are connected.")}</p></div>{[[LockKeyhole, 'lock', 'Front door lock'], [ShieldCheck, 'alarm', 'Home alarm'], [Camera, 'camera', 'Entryway camera']].map(([Icon, id, title]) => <div className="sh-security-row" key={id}><Icon size={24} /><span><strong>{t(title)}</strong><small>{security[id] ? t("Enabled in demo") : t("Disabled in demo")}</small></span><DeviceToggle on={security[id]} label={t("{v0} simulation", {v0: title})} onChange={() => setSecurity(current => ({ ...current, [id]: !current[id] }))} /></div>)}</section>}
        {section === 'members' && <section className="sh-member-directory">{members.map(member => <button key={member.id} onClick={() => setModal({ type: 'member', id: member.id })}><Avatar member={member} size={65} /><h2>{member.name}</h2><span>{t(member.role)}</span><small>{t("View profile ")}<ArrowUpRight size={13} /></small></button>)}</section>}
        {section === 'analytics' && <><div className="sh-analytics-summary"><span className="sh-insight-icon"><Zap size={26} /></span><div><h2>{t("Your home at a glance")}</h2><p>{activeCount}{t(" active simulated devices. Energy percentages below are sample data, independent of device toggles.")}</p></div></div>{powerWidget}</>}
        {!['overview', 'devices', 'rooms', 'security', 'members', 'analytics'].includes(section) && <Link to="/smart-home">{t("Return to dashboard")}</Link>}
        <div className="sh-main-footnote"><span className="sh-live-dot" />{t("Demo mode. No physical devices are connected. Changes reset on refresh.")}</div>
      </main>
      <aside className="sh-right"><MyDevices devices={sideDevices} toggle={toggle} status={status} setStatus={setStatus} /><FamilyMembers showMember={id => setModal({ type: 'member', id })} />{section !== 'analytics' ? powerWidget : <div className="sh-energy-tip"><Leaf size={28} /><h3>{t("Small changes, better habits.")}</h3><p>{t("Turn off lights when you leave a room. Your real energy provider can help you understand your actual consumption.")}</p></div>}</aside>
    </div><div className="sh-bottom-caption">{t("A calmer home. A little more you. ")}<span>{t("Designed as an interactive frontend concept.")}</span></div>
    {modal?.type === 'settings' && <Modal title={t("Home preferences")} onClose={() => setModal(null)}><p className="sh-dialog-note">{t("Preferences apply to this demo session.")}</p><div className="sh-preference"><span><strong>{t("Reduce motion")}</strong><small>{t("Keep transitions and animations minimal.")}</small></span><DeviceToggle on={preferences.reducedMotion} onChange={() => setPreferences(current => ({ ...current, reducedMotion: !current.reducedMotion }))} label={t("Reduce dashboard motion")} /></div><div className="sh-preference"><span><strong>{t("Demo notifications")}</strong><small>{t("Show the sample home status notification.")}</small></span><DeviceToggle on={preferences.notifications} onChange={() => setPreferences(current => ({ ...current, notifications: !current.notifications }))} label={t("Enable demo notifications")} /></div><button className="sh-purple-button" onClick={resetDemo}>{t("Reset demo controls")}</button><p className="sh-dialog-note">{t("This resets device switches, temperatures, room selection, search, security controls, and notification status. Preferences stay as selected.")}</p></Modal>}
    {modal?.type === 'member' && <Modal title={modal.id === 'all' ? t("Your home members") : t("{v0}'s profile", {v0: members.find(member => member.id === modal.id)?.name})} onClose={() => setModal(null)}><div className="sh-member-details">{members.filter(member => modal.id === 'all' || member.id === modal.id).map(member => <div key={member.id}><Avatar member={member} size={54} /><span><strong>{member.name}</strong><small>{t(member.role)}</small><span>{t("Favorite space: ")}{t(member.room)}</span></span></div>)}</div><p className="sh-dialog-note">{t("Illustrative family profiles. No real accounts or permission changes.")}</p></Modal>}
    {modal?.type === 'power' && <Modal title={t("Electricity consumption details")} onClose={() => setModal(null)}><p className="sh-dialog-note">{modal.period}{t(" · Sample percentages of an illustrative energy budget; not real meter readings or bills.")}</p><table className="sh-data-table"><thead><tr><th>{t("Month")}</th><th>{t("Consumption")}</th></tr></thead><tbody>{chartPeriods[modal.period].map(point => <tr key={t(point.month)}><td>{t(point.month)}</td><td>{point.value}%</td></tr>)}</tbody></table></Modal>}
  </div>
}
