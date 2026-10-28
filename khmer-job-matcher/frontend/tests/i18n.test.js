import test from 'node:test'
import assert from 'node:assert/strict'
import { languages, translate, validLanguage, localeFor } from '../src/i18n/core.js'
import { messages } from '../src/i18n/messages.js'
import { salaryLabel, postedLabel } from '../src/services/job-display.js'
import { notificationText } from '../src/i18n/notifications.js'
import { findDevices, initialDevices } from '../src/smart-home/data/devices.js'

test('language selection supports only English, Khmer and Simplified Chinese', () => {
  assert.deepEqual(languages.map(item => item.code), ['en', 'km', 'zh'])
  for (const code of ['en', 'km', 'zh']) assert.ok(validLanguage(code))
  for (const value of ['', null, 'cn', 'fr', '__proto__', {}]) assert.equal(validLanguage(value), false)
  assert.equal(localeFor('km'), 'km-KH')
  assert.equal(localeFor('zh'), 'zh-CN')
  assert.equal(localeFor('invalid'), 'en-US')
})

test('every authored message has Khmer and Chinese text and preserves interpolation names', () => {
  const names = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  assert.ok(Object.keys(messages).length > 750)
  for (const [key, values] of Object.entries(messages)) {
    assert.match(values.km, /[\u1780-\u17ff]/, key)
    assert.match(values.zh, /[\u3400-\u9fff]/, key)
    assert.deepEqual(names(values.km), names(key), key)
    assert.deepEqual(names(values.zh), names(key), key)
  }
})

test('translation preserves unknown content and interpolates values without treating them as markup', () => {
  assert.equal(translate('zh', 'Home'), '首页')
  assert.equal(translate('km', 'Home'), 'ទំព័រដើម')
  assert.equal(translate('en', 'Home'), 'Home')
  assert.equal(translate('zh', ' My profile '), ' 我的资料 ')
  const company = 'Original company name and job description'
  assert.equal(translate('zh', company), company)
  assert.equal(translate('zh', 'View {v0}', { v0: '<script>private user text</script>' }), '查看 <script>private user text</script>')
  assert.equal(translate('km', 25), 25)
  assert.equal(translate('zh', 'View {v0}'), '查看 {v0}')
  assert.equal(translate('invalid', 'Home'), 'Home')
})

test('localized salaries and dates retain numeric values and handle missing data', () => {
  assert.equal(salaryLabel({ salary_min: 500, salary_max: 900 }, 'zh'), '$500–$900 / 月')
  assert.match(salaryLabel({ salary_min: 500 }, 'km'), /500/)
  assert.equal(salaryLabel({}, 'zh'), '薪资未公开')
  assert.match(postedLabel('2026-10-20', 'zh'), /^发布于 /)
  assert.equal(postedLabel('bad-date', 'zh'), '未提供发布日期')
})

test('known application notifications localize status without rewriting the original job title', () => {
  const result = notificationText('Your application for Customer Service is now shortlisted.', 'zh')
  assert.equal(result, '您对 Customer Service 的申请状态现为：已入围。')
  assert.equal(notificationText('Original private notification', 'zh'), 'Original private notification')
})

test('demo device searches accept translated names while status values stay unchanged', () => {
  const t = key => translate('zh', key)
  assert.equal(findDevices(initialDevices, '冰箱', 'all', t)[0].id, 'refrigerator')
  assert.ok(findDevices(initialDevices, '客厅', 'on', t).every(device => device.on))
  assert.equal(findDevices(initialDevices, 'Refrigerator', 'all', t)[0].id, 'refrigerator')
})
