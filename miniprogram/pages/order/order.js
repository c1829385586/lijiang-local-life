// utils/date.js helper embedded
function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return String(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

Page({
  data: {
    orders: [],
    currentTab: 'all',
    page: 1,
    loading: false,
    hasMore: true,
    showSubscribe: true,
    statusMap: {
      pending: '待支付',
      paid: '已支付',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款'
    }
  },

  onLoad(options) {
    if (options.status) {
      this.setData({ currentTab: options.status })
    }
    // 从 storage 读取状态（wx.switchTab 不支持 query）
    const savedStatus = wx.getStorageSync('order_tab_status')
    if (savedStatus) {
      this.setData({ currentTab: savedStatus })
      wx.removeStorageSync('order_tab_status')
    }
    // 检查是否已订阅过
    const hasSubscribed = wx.getStorageSync('order_subscribed')
    this.setData({ showSubscribe: !hasSubscribed })
  },

  onShow() {
    this.loadOrders(true)
  },

  onPullDownRefresh() {
    this.loadOrders(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadOrders(false)
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.loadOrders(true)
  },

  async loadOrders(refresh) {
    if (this.data.loading) return
    this.setData({ loading: true })

    const page = refresh ? 1 : this.data.page
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'list',
          status: this.data.currentTab,
          page
        }
      })

      // 格式化时间
      const orders = (result.data || []).map(o => ({
        ...o,
        createdAtStr: formatTime(o.createdAt)
      }))

      const allOrders = refresh ? orders : [...this.data.orders, ...orders]
      this.setData({
        orders: allOrders,
        page: page + 1,
        hasMore: result.hasMore,
        loading: false
      })
    } catch (e) {
      console.error('加载订单失败', e)
      this.setData({ loading: false })
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  async cancelOrder(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({ title: '提示', content: '确定取消该订单？' })
    if (!res.confirm) return

    try {
      await wx.cloud.callFunction({
        name: 'order',
        data: { action: 'cancel', orderId: id }
      })
      wx.showToast({ title: '已取消', icon: 'success' })
      this.loadOrders(true)
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 支付已有订单（模拟支付直接标记为已支付）
  async goPay(e) {
    const id = e.currentTarget.dataset.id
    const order = this.data.orders.find(o => o._id === id)
    if (!order) return

    wx.showModal({
      title: '确认支付',
      content: `支付 ¥${order.totalPrice}？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          wx.showLoading({ title: '支付中...' })
          // 模拟支付：直接调用 pay 云函数
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
          this.loadOrders(true)
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '支付失败', icon: 'none' })
        }
      }
    })
  },

  async confirmOrder(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({ title: '确认入住', content: '确认已入住/收货？' })
    if (!res.confirm) return

    try {
      await wx.cloud.callFunction({
        name: 'order',
        data: { action: 'confirm', orderId: id }
      })
      wx.showToast({ title: '已确认', icon: 'success' })
      this.loadOrders(true)
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 订阅订单通知
  subscribeNotifications() {
    const tmplIds = [
      'TMPL_ORDER_PAID',
      'TMPL_ORDER_COMPLETED',
      'TMPL_ORDER_CANCELLED'
    ]

    wx.requestSubscribeMessage({
      tmplIds,
      success: (res) => {
        const subscribedIds = tmplIds.filter(id => res[id] === 'accept')
        if (subscribedIds.length > 0) {
          wx.cloud.callFunction({
            name: 'notify',
            data: { action: 'subscribe', templateIds: subscribedIds }
          }).catch(() => {})
          wx.showToast({ title: '已开启通知', icon: 'success' })
        }
        wx.setStorageSync('order_subscribed', true)
        this.setData({ showSubscribe: false })
      },
      fail: () => {
        wx.setStorageSync('order_subscribed', true)
        this.setData({ showSubscribe: false })
      }
    })
  },

  // 关闭订阅横幅
  closeSubscribe() {
    wx.setStorageSync('order_subscribed', true)
    this.setData({ showSubscribe: false })
  }
})
