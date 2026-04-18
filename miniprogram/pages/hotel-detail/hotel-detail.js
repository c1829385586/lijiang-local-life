// pages/hotel-detail/hotel-detail.js
const db = wx.cloud.database()
const { addBrowseHistory } = require('../../utils/history')

Page({
  data: {
    storeId: '',
    store: {},
    rooms: [],
    nearbyFoods: [],
    nearbyProducts: [],
    selectedRoom: null,
    checkInDate: '',
    checkOutDate: '',
    nights: 1,
    totalPrice: 0,
    reviews: [],
    avgRating: 0,
    reviewCount: 0,
    defaultServices: [
      { icon: '🅿️', name: '免费停车' },
      { icon: '📶', name: '免费WiFi' },
      { icon: '🍳', name: '含早餐' },
      { icon: '🚿', name: '独立卫浴' },
      { icon: '🧹', name: '每日保洁' },
      { icon: '🔑', name: '自助入住' }
    ]
  },

  onLoad(options) {
    const storeId = options.id
    this.setData({ storeId })
    this.initDates()
    this.loadStoreDetail(storeId)
  },

  initDates() {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 86400000)
    const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    this.setData({
      checkInDate: formatDate(today),
      checkOutDate: formatDate(tomorrow)
    })
  },

  async loadStoreDetail(id) {
    wx.showLoading({ title: '加载中' })
    try {
      const store = await db.collection('stores').doc(id).get()
      const rooms = await db.collection('rooms').where({ storeId: id, status: 1 }).get()
      const foods = await db.collection('stores').where({ type: 'food', status: 1 }).limit(6).get()
      const products = await db.collection('products').where({ status: 1 }).limit(6).get()

      this.setData({
        store: store.data,
        rooms: rooms.data,
        nearbyFoods: foods.data,
        nearbyProducts: products.data
      })

      // 记录浏览历史
      addBrowseHistory({
        id,
        type: 'hotel',
        name: store.data.name,
        coverImage: store.data.coverImage
      })

      // 加载评价
      this.loadReviews(id)
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    wx.hideLoading()
  },

  async loadReviews(storeId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'review',
        data: { action: 'list', storeId, page: 1 }
      })
      if (result.code === 0) {
        this.setData({
          reviews: result.data.slice(0, 2),
          avgRating: result.avgRating || 0,
          reviewCount: result.total || 0
        })
      }
    } catch (e) { /* no reviews */ }
  },

  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({ urls, current: urls[current] })
  },

  openMap() {
    const { store } = this.data
    wx.openLocation({
      latitude: store.latitude,
      longitude: store.longitude,
      name: store.name,
      address: store.address,
      scale: 18
    })
  },

  selectRoom(e) {
    const room = e.currentTarget.dataset.room
    if (room.stock <= 0) {
      wx.showToast({ title: '已满房', icon: 'none' })
      return
    }
    this.setData({ selectedRoom: room })
    this.calcPrice()
  },

  onDateChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ [type === 'in' ? 'checkInDate' : 'checkOutDate']: e.detail.value })
    this.calcPrice()
  },

  calcPrice() {
    const { selectedRoom, checkInDate, checkOutDate } = this.data
    if (!selectedRoom) return

    const inDate = new Date(checkInDate)
    const outDate = new Date(checkOutDate)
    const nights = Math.max(1, Math.ceil((outDate - inDate) / 86400000))
    const totalPrice = selectedRoom.price * nights

    this.setData({ nights, totalPrice })
  },

  onBookNow() {
    const { selectedRoom, store, checkInDate, checkOutDate, nights, totalPrice } = this.data
    if (!selectedRoom) {
      wx.showToast({ title: '请先选择房型', icon: 'none' })
      return
    }

    // 跳转到订单确认页
    const orderData = encodeURIComponent(JSON.stringify({
      type: 'hotel',
      storeId: store._id,
      storeName: store.name,
      roomId: selectedRoom._id,
      roomName: selectedRoom.name,
      checkInDate,
      checkOutDate,
      nights,
      totalPrice,
      coverImage: store.images ? store.images[0] : ''
    }))

    wx.navigateTo({ url: `/pages/order-confirm/order-confirm?data=${orderData}` })
  },

  goFood(e) {
    wx.navigateTo({ url: `/pages/food-detail/food-detail?id=${e.currentTarget.dataset.id}` })
  },

  goProduct(e) {
    wx.navigateTo({ url: `/pages/store-detail/store-detail?type=product&id=${e.currentTarget.dataset.id}` })
  },

  onShareAppMessage() {
    const { store } = this.data
    return {
      title: store.name,
      path: `/pages/hotel-detail/hotel-detail?id=${this.data.storeId}`
    }
  }
})
