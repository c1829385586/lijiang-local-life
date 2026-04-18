// pages/dashboard/dashboard.js
const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    merchant: {},
    todayStats: {},
    pendingOrders: [],
    showSubscribe: true,
    typeMap: {
      hotel: '酒店民宿',
      food: '美食餐饮',
      travel: '周边游玩',
      product: '特产商店'
    }
  },

  onShow() {
    this.checkLogin()
    this.loadData()
    // 检查是否已订阅
    const hasSubscribed = wx.getStorageSync('merchant_subscribed')
    this.setData({ showSubscribe: !hasSubscribed })
  },

  checkLogin() {
    const app = getApp()
    if (!app.globalData.isLogin) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ merchant: app.globalData.merchantInfo || {} })
  },

  async loadData() {
    const app = getApp()
    const merchant = app.globalData.merchantInfo
    if (!merchant) return

    // 使用 storeId 查询订单，而非 merchant._id
    const storeId = merchant.storeId || merchant._id
    if (!storeId) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [ordersToday, pendingOrders, allOrders] = await Promise.all([
        db.collection('orders').where({
          storeId: storeId,
          createdAt: _.gte(today)
        }).count(),
        db.collection('orders').where({
          storeId: storeId,
          status: 'pending'
        }).orderBy('createdAt', 'desc').limit(5).get(),
        db.collection('orders').where({
          storeId: storeId,
          createdAt: _.gte(today)
        }).get()
      ])

      const revenue = allOrders.data
        .filter(o => o.status === 'paid' || o.status === 'completed')
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0)

      this.setData({
        todayStats: {
          orderCount: ordersToday.total,
          revenue: revenue.toFixed(2),
          pendingCount: pendingOrders.data.length,
          viewCount: 0
        },
        pendingOrders: pendingOrders.data
      })
    } catch (e) {
      console.error('加载数据失败', e)
    }
  },

  // 接单/拒绝
  async handleOrder(e) {
    const { id, action } = e.currentTarget.dataset
    const status = action === 'accept' ? 'paid' : 'rejected'

    try {
      await wx.cloud.callFunction({
        name: 'merchant',
        data: {
          action: 'handleOrder',
          orderId: id,
          status
        }
      })
      wx.showToast({ title: action === 'accept' ? '已接单' : '已拒绝', icon: 'success' })
      this.loadData()
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  goStoreEdit() { wx.navigateTo({ url: '/pages/store-edit/store-edit' }) },
  goRoomManage() { wx.navigateTo({ url: '/pages/room-manage/room-manage' }) },
  goProductManage() { wx.navigateTo({ url: '/pages/product-manage/product-manage' }) },
  goOrderManage() { wx.switchTab({ url: '/pages/order-manage/order-manage' }) },

  // 订阅新订单通知
  subscribeNewOrder() {
    const tmplId = 'TMPL_NEW_ORDER'

    wx.requestSubscribeMessage({
      tmplIds: [tmplId],
      success: (res) => {
        if (res[tmplId] === 'accept') {
          wx.cloud.callFunction({
            name: 'notify',
            data: { action: 'subscribe', templateIds: [tmplId] }
          }).catch(() => {})
          wx.showToast({ title: '已开启新订单通知', icon: 'success' })
        }
        wx.setStorageSync('merchant_subscribed', true)
        this.setData({ showSubscribe: false })
      },
      fail: () => {
        wx.setStorageSync('merchant_subscribed', true)
        this.setData({ showSubscribe: false })
      }
    })
  },

  closeSubscribe() {
    wx.setStorageSync('merchant_subscribed', true)
    this.setData({ showSubscribe: false })
  }
})
