const db = wx.cloud.database()
const { addBrowseHistory } = require('../../utils/history')
Page({
  data: { store: {}, nearbyFoods: [], storeId: '', reviews: [], avgRating: 0, reviewCount: 0 },
  onLoad(options) {
    this.setData({ storeId: options.id })
    this.loadDetail(options.id)
  },
  async loadDetail(id) {
    wx.showLoading({ title: '加载中' })
    const [store, foods] = await Promise.all([
      db.collection('stores').doc(id).get(),
      db.collection('stores').where({ type: 'food', status: 1 }).limit(6).get()
    ])
    this.setData({ store: store.data, nearbyFoods: foods.data })
    addBrowseHistory({ id, type: 'travel', name: store.data.name, coverImage: store.data.coverImage })
    this.loadReviews(id)
    wx.hideLoading()
  },
  async loadReviews(storeId) {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'review', data: { action: 'list', storeId, page: 1 } })
      if (result.code === 0) {
        this.setData({ reviews: result.data.slice(0, 3), avgRating: result.avgRating || 0, reviewCount: result.total || 0 })
      }
    } catch (e) {}
  },
  previewImage(e) { wx.previewImage({ urls: e.currentTarget.dataset.urls, current: e.currentTarget.dataset.urls[e.currentTarget.dataset.current] }) },
  openMap() {
    const { store } = this.data
    wx.openLocation({ latitude: store.latitude, longitude: store.longitude, name: store.name, address: store.address, scale: 18 })
  },
  goFood(e) { wx.navigateTo({ url: `/pages/food-detail/food-detail?id=${e.currentTarget.dataset.id}` }) },
  onShareAppMessage() { return { title: this.data.store.name, path: `/pages/travel-detail/travel-detail?id=${this.data.storeId}` } }
})
