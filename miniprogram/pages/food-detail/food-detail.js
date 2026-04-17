const db = wx.cloud.database()
Page({
  data: { store: {}, storeId: '' },
  onLoad(options) {
    this.setData({ storeId: options.id })
    this.loadDetail(options.id)
  },
  async loadDetail(id) {
    wx.showLoading({ title: '加载中' })
    const res = await db.collection('stores').doc(id).get()
    this.setData({ store: res.data })
    wx.hideLoading()
  },
  previewImage(e) { wx.previewImage({ urls: e.currentTarget.dataset.urls, current: e.currentTarget.dataset.urls[e.currentTarget.dataset.current] }) },
  openMap() {
    const { store } = this.data
    wx.openLocation({ latitude: store.latitude, longitude: store.longitude, name: store.name, address: store.address, scale: 18 })
  },
  callPhone() { wx.makePhoneCall({ phoneNumber: this.data.store.phone }) },
  onShareAppMessage() {
    return { title: this.data.store.name, path: `/pages/food-detail/food-detail?id=${this.data.storeId}` }
  }
})
