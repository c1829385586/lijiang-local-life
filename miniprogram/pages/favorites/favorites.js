// pages/favorites/favorites.js
const db = wx.cloud.database()
Page({
  data: { items: [], loading: false },
  onShow() { this.loadFavorites() },

  async loadFavorites() {
    this.setData({ loading: true })
    const favIds = wx.getStorageSync('favorites') || []
    if (!favIds.length) { this.setData({ items: [], loading: false }); return }

    try {
      const items = []
      for (const id of favIds.slice(0, 50)) {
        try {
          const res = await db.collection('products').doc(id).get()
          if (res.data) items.push({ ...res.data, favType: 'product' })
        } catch (e) {
          try {
            const res = await db.collection('stores').doc(id).get()
            if (res.data) items.push({ ...res.data, favType: 'store' })
          } catch (e2) { /* 已删除 */ }
        }
      }
      this.setData({ items, loading: false })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  goDetail(e) {
    const { type, id } = e.currentTarget.dataset
    if (type === 'product') {
      wx.navigateTo({ url: `/pages/store-detail/store-detail?type=product&id=${id}` })
    } else {
      const item = this.data.items.find(i => i._id === id)
      const pages = { hotel: '/pages/hotel-detail/hotel-detail', food: '/pages/food-detail/food-detail', travel: '/pages/travel-detail/travel-detail' }
      wx.navigateTo({ url: `${pages[item?.type] || pages.hotel}?id=${id}` })
    }
  },

  removeFavorite(e) {
    const id = e.currentTarget.dataset.id
    let favorites = wx.getStorageSync('favorites') || []
    favorites = favorites.filter(f => f !== id)
    wx.setStorageSync('favorites', favorites)
    this.loadFavorites()
    wx.showToast({ title: '已取消收藏', icon: 'success' })
  },

  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '确定清空所有收藏？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('favorites', [])
          this.setData({ items: [] })
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  }
})
