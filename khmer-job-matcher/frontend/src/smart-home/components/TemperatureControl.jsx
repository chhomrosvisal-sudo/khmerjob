import { useI18n } from '../../i18n/useI18n'
import { useId, useRef } from 'react'
import { Zap, Minus, Plus, Thermometer } from 'lucide-react'
import DeviceToggle from './DeviceToggle'
import { clampTemperature } from '../data/devices'

const polar = (r, angle) => ({ x: 150 + r * Math.cos(angle * Math.PI / 180), y: 150 + r * Math.sin(angle * Math.PI / 180) })
function arc(r, end) { const a = polar(r, 135), b = polar(r, end); return `M${a.x},${a.y} A${r},${r} 0 ${end - 135 > 180 ? 1 : 0} 1 ${b.x},${b.y}` }

export default function TemperatureControl({ room, temperature, setTemperature, on, togglePower }) {
  const { t } = useI18n()
  const gradient = useId()
  const dragging = useRef(false)
  const end = 135 + ((temperature - 16) / 14) * 270
  const knob = polar(111, end)
  function adjust(event) {
    if (!on) return
    const box = event.currentTarget.getBoundingClientRect()
    const angle = (Math.atan2(event.clientY - (box.top + box.height / 2), event.clientX - (box.left + box.width / 2)) * 180 / Math.PI + 360) % 360
    let offset = (angle - 135 + 360) % 360
    if (offset > 270) offset = offset > 315 ? 0 : 270
    setTemperature(clampTemperature(16 + offset / 270 * 14))
  }
  return <section className={`sh-temperature ${!on ? 'sh-temperature-off' : ''}`}><div className="sh-temperature-heading"><div><span className="sh-temperature-icon"><Zap size={19} /></span><h2>{t(room)}{t(" Temperature")}</h2></div><DeviceToggle on={on} onChange={togglePower} label={t("{v0} temperature controller power", {v0: t(room)})} /></div>
    <div className="sh-temperature-body"><button className="sh-temperature-step" disabled={!on || temperature <= 16} onClick={() => setTemperature(clampTemperature(temperature - 1))} aria-label={t("Decrease temperature")}><Minus size={20} /></button>
      <div className="sh-dial"><svg viewBox="0 0 300 300" aria-hidden="true" onPointerDown={event => { if (!on) return; dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); adjust(event) }} onPointerMove={event => { if (dragging.current) adjust(event) }} onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }} style={{ touchAction: on ? 'none' : 'auto' }}>
        <defs><linearGradient id={gradient} x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#7c3aed" /><stop offset="70%" stopColor="#9e64f3" /><stop offset="100%" stopColor="#ffbf96" /></linearGradient></defs>
        {Array.from({ length: 55 }, (_, index) => { const angle = 135 + index * 5; const a = polar(132, angle), b = polar(index % 5 === 0 ? 140 : 136, angle); return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#d9d6df" strokeWidth={index % 5 === 0 ? 1.7 : 1} /> })}
        <path d={arc(111, 405)} stroke="#efedf4" strokeWidth="14" fill="none" strokeLinecap="round" /><path className="sh-dial-arc" d={arc(111, 405)} pathLength="100" strokeDasharray="100" strokeDashoffset={100 - ((temperature - 16) / 14) * 100} stroke={`url(#${gradient})`} strokeWidth="14" fill="none" strokeLinecap="round" opacity={on ? 1 : .22} />
        <circle cx="150" cy="150" r="84" fill="#fff" stroke="#f2f0f6" /><circle cx={knob.x} cy={knob.y} r="10" fill={on ? '#8b4aef' : '#c8c1d2'} stroke="#fff" strokeWidth="4" />
      </svg><div className="sh-dial-center"><Thermometer size={21} /><output aria-live="polite" aria-label={t("Current target temperature")}>{temperature}<sup>°</sup></output><span>{t("Celsius")}</span><small>{on ? t("Heating is on") : t("Controller is off")}</small></div><span className="sh-dial-min">16°</span><span className="sh-dial-max">30°</span></div>
      <button className="sh-temperature-step" disabled={!on || temperature >= 30} onClick={() => setTemperature(clampTemperature(temperature + 1))} aria-label={t("Increase temperature")}><Plus size={20} /></button></div>
    <label className="sh-temperature-range"><span className="sr-only">{t(room)}{t(" target temperature")}</span><input type="range" min="16" max="30" step="1" value={temperature} disabled={!on} onChange={event => setTemperature(Number(event.target.value))} aria-valuetext={t("{temperature} degrees Celsius", { temperature })} /></label><div className="sh-temperature-footer"><span className={on ? 'sh-live-dot on' : 'sh-live-dot'} />{on ? t("Keeping your space comfortable") : t("Turn on to adjust your temperature")}<span>{t("Simulated control")}</span></div>
  </section>
}
