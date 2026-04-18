// pages/browse-history/browse-history.js
Page({
  data: { items: [], loading: false },
  onShow() { this.loadHistory() },

  loadHistory() {
    const history = wx.getStorageSync('browse_history') || []
    this.setData({ items: history.reverse().slice(0, 100) })
  },

  goDetail(e) {
    const { type, id } = e.currentTarget.dataset
    const pages = {
      hotel: '/pages/hotel-detail/hotel-detail',
      food: '/pages/food-detail/food-detail',
      travel: '/pages/travel-detail/travel-detail',
      product: '/pages/store-detail/store-detail?type=product'
    }
    wx.navigateTo({ url: `${pages[type] || pages.hotel}?id=${id}` })
  },

  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '确定清空浏览历史？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('browse_history', [])
          this.setData({ items: [] })
        }
      }
    })
  }
})
