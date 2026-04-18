const db = wx.cloud.database()
const { addBrowseHistory } = require('../../utils/history')
Page({
  data: { item: {}, quantity: 1, type: 'product', isFavorite: false, reviews: [], avgRating: 0, reviewCount: 0 },
  onLoad(options) {
    this.setData({ type: options.type || 'product' })
    this.loadItem(options.id)
    this.checkFavorite(options.id)
    this.loadReviews(options.id)
  },
  async loadItem(id) {
    wx.showLoading({ title: '加载中' })
    const collection = this.data.type === 'product' ? 'products' : 'stores'
    const res = await db.collection(collection).doc(id).get()
    this.setData({ item: res.data })
    addBrowseHistory({
      id,
      type: this.data.type === 'product' ? 'product' : (res.data.type || 'product'),
      name: res.data.name,
      coverImage: res.data.coverImage
    })
    wx.hideLoading()
  },
  async loadReviews(id) {
    try {
      // For products, use the storeId to load store reviews
      const storeId = this.data.type === 'product' ? (this.data.item.storeId || id) : id
      const { result } = await wx.cloud.callFunction({
        name: 'review',
        data: { action: 'list', storeId, page: 1 }
      })
      if (result.code === 0) {
        this.setData({
          reviews: result.data.slice(0, 3),
          avgRating: result.avgRating || 0,
          reviewCount: result.total || 0
        })
      }
    } catch (e) { /* 无评价 */ }
  },
  checkFavorite(id) {
    const favorites = wx.getStorageSync('favorites') || []
    this.setData({ isFavorite: favorites.includes(id) })
  },
  toggleFavorite() {
    const { item, isFavorite } = this.data
    let favorites = wx.getStorageSync('favorites') || []
    if (isFavorite) {
      favorites = favorites.filter(f => f !== item._id)
    } else {
      favorites.push(item._id)
    }
    wx.setStorageSync('favorites', favorites)
    this.setData({ isFavorite: !isFavorite })
    wx.showToast({ title: isFavorite ? '已取消收藏' : '已收藏', icon: 'success' })
  },
  previewImage(e) { wx.previewImage({ urls: e.currentTarget.dataset.urls }) },
  increaseQty() { this.setData({ quantity: this.data.quantity + 1 }) },
  decreaseQty() { if (this.data.quantity > 1) this.setData({ quantity: this.data.quantity - 1 }) },
  onAddToCart() {
    const { item, quantity } = this.data
    let cart = wx.getStorageSync('cart') || []
    const exist = cart.find(c => c._id === item._id)
    if (exist) {
      exist.quantity += quantity
    } else {
      cart.push({
        _id: item._id,
        name: item.name,
        coverImage: item.coverImage,
        price: item.price,
        storeId: item.storeId, // 保留 storeId 以便关联商户
        canDeliverToRoom: item.canDeliverToRoom,
        quantity,
        checked: true
      })
    }
    wx.setStorageSync('cart', cart)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },
  onBuyNow() {
    const { item, quantity } = this.data
    const orderData = encodeURIComponent(JSON.stringify({
      type: 'product',
      storeId: item.storeId || item._id, // 优先使用商品关联的 storeId
      storeName: item.name,
      productName: item.name,
      coverImage: item.coverImage,
      totalPrice: (item.price * quantity).toFixed(2),
      quantity
    }))
    wx.navigateTo({ url: `/pages/order-confirm/order-confirm?data=${orderData}` })
  },
  goCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  },
  goReviewList() {
    wx.navigateTo({ url: `/pages/store-detail/store-detail?type=product&id=${this.data.item._id}` })
  }
})
