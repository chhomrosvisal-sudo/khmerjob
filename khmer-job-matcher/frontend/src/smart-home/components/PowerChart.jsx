import { useI18n } from '../../i18n/useI18n'
import { useState } from 'react'
import { ArrowUpRight, Zap } from 'lucide-react'
import Chart from '@smart-home-power-chart'
import { chartPeriods, peakUsage } from '../data/chartData'

export default function PowerChart({ openDetails }) {
  const { t } = useI18n()
  const [period, setPeriod] = useState('January – August')
  const [selected, setSelected] = useState('Jul')
  const data = chartPeriods[period]
  const point = data.find(item => item.month === selected) || peakUsage(data)
  return <section className="sh-power"><div className="sh-section-title"><h2>{t("Power Consumed")}</h2><div><label><span className="sr-only">{t("Power chart period")}</span><select value={period} onChange={event => { setPeriod(event.target.value); setSelected(peakUsage(chartPeriods[event.target.value]).month) }}>{Object.keys(chartPeriods).map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label><button className="sh-section-arrow" onClick={() => openDetails(period)} aria-label={t("View power consumption details")}><ArrowUpRight size={18} /></button></div></div><div className="sh-power-card"><div className="sh-chart-title"><span><Zap size={14} />{t("Electricity Consumed")}</span><span><strong>{point.value}%</strong>{t(" Spending")}</span></div><Chart data={data} selected={t(point.month)} setSelected={setSelected} /><div className="sh-chart-caption"><span className="sh-orange-dot" /><span aria-live="polite">{t(point.month)}: {point.value}{t("% of illustrative energy budget")}</span></div></div></section>
}
