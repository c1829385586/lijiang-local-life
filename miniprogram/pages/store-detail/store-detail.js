const db = wx.cloud.database()
Page({
  data: { item: {}, quantity: 1, type: 'product' },
  onLoad(options) {
    this.setData({ type: options.type || 'product' })
    this.loadItem(options.id)
  },
  async loadItem(id) {
    wx.showLoading({ title: '加载中' })
    const collection = this.data.type === 'product' ? 'products' : 'stores'
    const res = await db.collection(collection).doc(id).get()
    this.setData({ item: res.data })
    wx.hideLoading()
  },
  previewImage(e) { wx.previewImage({ urls: e.currentTarget.dataset.urls }) },
  increaseQty() { this.setData({ quantity: this.data.quantity + 1 }) },
  decreaseQty() { if (this.data.quantity > 1) this.setData({ quantity: this.data.quantity - 1 }) },
  onBuyNow() {
    const { item, quantity } = this.data
    const orderData = encodeURIComponent(JSON.stringify({
      type: 'product',
      storeId: item._id,
      storeName: item.name,
      productName: item.name,
      coverImage: item.coverImage,
      totalPrice: (item.price * quantity).toFixed(2),
      quantity
    }))
    wx.navigateTo({ url: `/pages/order-confirm/order-confirm?data=${orderData}` })
  }
})
