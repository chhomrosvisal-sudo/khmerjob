import test from 'node:test'
import assert from 'node:assert/strict'
import { changeDevice, clampTemperature, findDevices, initialDevices, initialRoomPower, initialTemperatures } from '../src/smart-home/data/devices.js'
import { chartPeriods, peakUsage } from '../src/smart-home/data/chartData.js'
import { members } from '../src/smart-home/data/members.js'

test('device switching is immutable and shared identity can feed both device widgets', () => {
  const original = initialDevices.find(device => device.id === 'refrigerator')
  const updated = changeDevice(initialDevices, 'refrigerator')
  const mainWidget = updated.find(device => device.id === 'refrigerator')
  const sideWidget = findDevices(updated).find(device => device.id === 'refrigerator')
  assert.equal(original.on, true)
  assert.equal(mainWidget.on, false)
  assert.equal(sideWidget.on, false)
  assert.equal(updated.find(device => device.id === 'router').on, true)
  assert.equal(changeDevice(updated, 'refrigerator').find(device => device.id === 'refrigerator').on, true)
})

test('temperature values stay within 16–30 degrees and room defaults are independent', () => {
  assert.equal(clampTemperature(15), 16)
  assert.equal(clampTemperature(31), 30)
  assert.equal(clampTemperature(24.7), 25)
  assert.equal(initialTemperatures['Living Room'], 25)
  assert.equal(initialRoomPower['Living Room'], initialDevices.find(device => device.id === 'temperature').on)
  assert.equal(initialRoomPower.Bedroom, false)
})

test('device search matches room and device names and combines with status filters', () => {
  assert.equal(findDevices(initialDevices, '  ROUTER  ')[0].id, 'router')
  assert.equal(findDevices(initialDevices, 'Kitchen')[0].id, 'refrigerator')
  assert.equal(findDevices(initialDevices, '', 'off').length, 2)
  assert.deepEqual(findDevices(initialDevices, 'refrigerator', 'off'), [])
  assert.deepEqual(findDevices(initialDevices, 'absent'), [])
})

test('chart periods expose different sample data and the expected July peak', () => {
  assert.deepEqual(peakUsage(chartPeriods['January – August']), { month: 'Jul', value: 73 })
  assert.deepEqual(peakUsage(chartPeriods['September – December']), { month: 'Oct', value: 51 })
  assert.equal(members.length, 5)
  assert.equal(members.find(member => member.name === 'Scarlett').role, 'Admin')
})
