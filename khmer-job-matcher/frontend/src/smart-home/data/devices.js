export const rooms = ['Living Room', 'Bedroom', 'Kitchen']
export const initialDevices = [
  { id: 'refrigerator', name: 'Refrigerator', kind: 'fridge', room: 'Kitchen', on: true, tone: 'purple' },
  { id: 'temperature', name: 'Temperature', kind: 'temperature', room: 'Living Room', on: true, tone: 'purple' },
  { id: 'air-conditioner', name: 'Air Conditioner', kind: 'air', room: 'Living Room', on: false, tone: 'plain' },
  { id: 'lights', name: 'Lights', kind: 'light', room: 'Living Room', on: false, tone: 'plain' },
  { id: 'router', name: 'Router', kind: 'router', room: 'Living Room', on: true, tone: 'yellow' },
  { id: 'music', name: 'Music System', kind: 'music', room: 'Living Room', on: true, tone: 'orange' },
  { id: 'lamps', name: 'Lamps', kind: 'lamp', room: 'Bedroom', on: true, tone: 'cyan' },
]

export const initialTemperatures = { 'Living Room': 25, Bedroom: 23, Kitchen: 22 }
export const initialRoomPower = { 'Living Room': true, Bedroom: false, Kitchen: false }

export function clampTemperature(value) { return Math.min(30, Math.max(16, Math.round(value))) }

export function changeDevice(devices, id) {
  return devices.map(device => device.id === id ? { ...device, on: !device.on } : device)
}

export function findDevices(devices, query = '', status = 'all', translate = value => value) {
  const term = query.trim().toLowerCase()
  return devices.filter(device => `${device.name} ${device.room} ${translate(device.name)} ${translate(device.room)}`.toLowerCase().includes(term) && (status === 'all' || device.on === (status === 'on')))
}
