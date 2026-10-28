export const chartPeriods = {
  'January – August': [25, 35, 50, 42, 52, 58, 73, 60].map((value, i) => ({ month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i], value })),
  'September – December': [44, 51, 39, 47].map((value, i) => ({ month: ['Sep', 'Oct', 'Nov', 'Dec'][i], value })),
}

export function peakUsage(data) { return data.reduce((best, point) => point.value > best.value ? point : best, data[0]) }
