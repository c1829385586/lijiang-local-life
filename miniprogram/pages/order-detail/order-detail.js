const db = wx.cloud.database()

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return String(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

Page({
  data: {
    order: {},
    statusMap: {
      pending: '待支付', paid: '已支付', completed: '已完成',
      cancelled: '已取消', rejected: '已拒绝', refunded: '已退款'
    },
    canReview: false,
    createdAtStr: '',
    paidAtStr: ''
  },

  onLoad(options) { this.loadOrder(options.id) },

  async loadOrder(id) {
    wx.showLoading({ title: '加载中' })
    try {
      const res = await db.collection('orders').doc(id).get()
      const order = res.data
      this.setData({
        order,
        createdAtStr: formatTime(order.createdAt),
        paidAtStr: order.paidAt ? formatTime(order.paidAt) : '',
        canReview: order.status === 'completed' && !order.hasReviewed
      })
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

  // 支付已有订单（不再创建新订单）
  async goPay() {
    const order = this.data.order
    wx.showModal({
      title: '确认支付',
      content: `支付 ¥${order.totalPrice}？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          wx.showLoading({ title: '支付中...' })
          await wx.cloud.callFunction({
            name: 'pay',
            data: {
              action: 'unifiedOrder',
              body: `${order.storeName} - 订单`,
              orderNo: order.orderNo,
              totalFee: Math.round(order.totalPrice * 100),
              orderId: order._id
            }
          })
          wx.hideLoading()
          wx.showToast({ title: '支付成功', icon: 'success' })
          this.loadOrder(order._id)
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '支付失败', icon: 'none' })
        }
      }
    })
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
    wx.navigateTo({ url: `/pages/review-create/review-create?orderId=${order._id}` })
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
