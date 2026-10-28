import { useI18n } from '../../i18n/useI18n'
import { useId } from 'react'

export default function SvgPowerChart({ data, selected, setSelected }) {
  const { t } = useI18n()
  const fill = useId()
  const points = data.map((item, index) => ({ ...item, x: 30 + index * 270 / (data.length - 1), y: 150 - item.value * 1.32 }))
  const path = points.reduce((curve, point, index) => {
    if (!index) return `M${point.x},${point.y}`
    const prev = points[index - 1], mid = (prev.x + point.x) / 2
    return `${curve} C${mid},${prev.y} ${mid},${point.y} ${point.x},${point.y}`
  }, '')
  const active = points.find(item => item.month === selected) || points[0]
  return <div className="sh-chart-canvas"><svg viewBox="0 0 320 185" role="img" aria-label={t("Illustrative electricity consumption by month")}><defs><linearGradient id={fill} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffb18c" stopOpacity=".4" /><stop offset="1" stopColor="#fff8f1" stopOpacity=".15" /></linearGradient></defs>
    {[0, 25, 50, 75, 100].map(value => <g key={value}><line x1="29" x2="304" y1={150 - value * 1.32} y2={150 - value * 1.32} stroke="#efedf2" strokeDasharray="3 4" /><text x="0" y={153 - value * 1.32} fill="#b1aebb" fontSize="8">{t(value)}%</text></g>)}
    <path d={`${path} L300,150 L30,150Z`} fill={`url(#${fill})`} /><path d={path} fill="none" stroke="#ff9a72" strokeWidth="2.5" />
    <line x1={active.x} x2={active.x} y1="12" y2="151" stroke="#ffd2bd" strokeDasharray="3 4" />
    {points.map(point => <g key={t(point.month)}><text x={point.x} y="174" textAnchor="middle" fontSize="8" fill={point.month === selected ? '#f2926e' : '#b3afbc'}>{t(point.month)}</text><circle cx={point.x} cy={point.y} r={point.month === selected ? 5 : 3} fill={point.month === selected ? '#ff986d' : '#fff'} stroke="#ffab85" strokeWidth="2" onMouseEnter={() => setSelected(point.month)} /></g>)}
    <g pointerEvents="none"><rect x={Math.min(270, Math.max(25, active.x - 22))} y={Math.max(0, active.y - 30)} width="44" height="21" rx="6" fill="#fff6ee" stroke="#ffe2cf" /><text x={Math.min(292, Math.max(47, active.x))} y={Math.max(14, active.y - 16)} fontSize="9" textAnchor="middle" fill="#d99974">{active.value}%</text></g>
  </svg><div className="sh-chart-month-buttons" role="group" aria-label={t("Inspect monthly consumption")}>{data.map(point => <button aria-label={t("{v0}: {v1}% consumption", {v0: t(point.month), v1: point.value})} aria-pressed={selected === point.month} key={t(point.month)} onClick={() => setSelected(point.month)}>{t(point.month)}</button>)}</div></div>
}
