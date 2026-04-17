Page({
  data: { stats: {}, dayOptions: ['近7天', '近14天', '近30天'], dayValues: [7, 14, 30], dayIndex: 0, maxOrders: 1 },
  onShow() { this.loadStats() },
  onDayChange(e) { this.setData({ dayIndex: e.detail.value }); this.loadStats() },
  async loadStats() {
    const days = this.data.dayValues[this.data.dayIndex]
    const { result } = await wx.cloud.callFunction({ name: 'merchant', data: { action: 'stats', days } })
    if (result.code === 0) {
      const stats = result.data
      const maxOrders = Math.max(1, ...stats.dailyStats.map(d => d.orders))
      this.setData({ stats, maxOrders })
    }
  }
})
