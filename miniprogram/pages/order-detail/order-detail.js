// pages/order-detail/order-detail.js
const db = wx.cloud.database()
Page({
  data: {
    order: {},
    statusMap: {
      pending: '待支付', paid: '已支付', completed: '已完成',
      cancelled: '已取消', rejected: '已拒绝', refunded: '已退款'
    },
    canReview: false
  },

  onLoad(options) { this.loadOrder(options.id) },

  async loadOrder(id) {
    wx.showLoading({ title: '加载中' })
    try {
      const res = await db.collection('orders').doc(id).get()
      this.setData({ order: res.data })
      // 检查是否可评价
      if (res.data.status === 'completed' && !res.data.hasReviewed) {
        this.setData({ canReview: true })
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    wx.hideLoading()
  },

  async cancelOrder() {
    const res = await wx.showModal({ title: '提示', content: '确定取消该订单？' })
    if (!res.confirm) return
    try {
      await wx.cloud.callFunction({ name: 'order', data: { action: 'cancel', orderId: this.data.order._id } })
      wx.showToast({ title: '已取消', icon: 'success' })
      this.loadOrder(this.data.order._id)
    } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }) }
  },

  async goPay() {
    const order = this.data.order
    const orderData = encodeURIComponent(JSON.stringify({
      type: order.type, storeId: order.storeId, storeName: order.storeName,
      totalPrice: order.totalPrice, coverImage: order.coverImage
    }))
    wx.navigateTo({ url: `/pages/order-confirm/order-confirm?data=${orderData}` })
  },

  async confirmOrder() {
    const res = await wx.showModal({ title: '确认', content: '确认已入住/收货？' })
    if (!res.confirm) return
    try {
      await wx.cloud.callFunction({ name: 'order', data: { action: 'confirm', orderId: this.data.order._id } })
      wx.showToast({ title: '已确认', icon: 'success' })
      this.loadOrder(this.data.order._id)
    } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }) }
  },

  goReview() {
    const order = this.data.order
    wx.showModal({
      title: '评价',
      editable: true,
      placeholderText: '请输入评价内容',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            await wx.cloud.callFunction({
              name: 'review',
              data: {
                action: 'create',
                reviewData: { orderId: order._id, rating: 5, content: res.content }
              }
            })
            wx.showToast({ title: '评价成功', icon: 'success' })
            this.loadOrder(order._id)
          } catch (e) { wx.showToast({ title: '评价失败', icon: 'none' }) }
        }
      }
    })
  },

  goStore() {
    const order = this.data.order
    const pages = {
      hotel: '/pages/hotel-detail/hotel-detail',
      food: '/pages/food-detail/food-detail',
      travel: '/pages/travel-detail/travel-detail',
      product: '/pages/store-detail/store-detail?type=product'
    }
    wx.navigateTo({ url: `${pages[order.type] || pages.hotel}?id=${order.storeId}` })
  }
})
