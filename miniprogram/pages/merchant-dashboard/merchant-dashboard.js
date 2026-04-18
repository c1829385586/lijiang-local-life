// pages/merchant-dashboard/merchant-dashboard.js
const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    merchant: {},
    todayStats: {},
    pendingOrders: [],
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
  },

  checkLogin() {
    const app = getApp()
    if (!app.globalData.isMerchantLogin) {
      wx.redirectTo({ url: '/pages/merchant-login/merchant-login' })
      return
    }
    this.setData({ merchant: app.globalData.merchantInfo || {} })
  },

  async loadData() {
    const app = getApp()
    const merchant = app.globalData.merchantInfo
    if (!merchant) return

    // Use storeId (关联的店铺ID) to query orders, not merchant._id
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

  async handleOrder(e) {
    const { id, action } = e.currentTarget.dataset
    const status = action === 'accept' ? 'paid' : 'rejected'

    try {
      await wx.cloud.callFunction({
        name: 'merchant',
        data: { action: 'handleOrder', orderId: id, status }
      })
      wx.showToast({ title: action === 'accept' ? '已接单' : '已拒绝', icon: 'success' })
      this.loadData()
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  goStoreEdit() { wx.navigateTo({ url: '/pages/merchant-store-edit/merchant-store-edit' }) },
  goRoomManage() { wx.navigateTo({ url: '/pages/merchant-room-manage/merchant-room-manage' }) },
  goProductManage() { wx.navigateTo({ url: '/pages/merchant-product-manage/merchant-product-manage' }) },
  goOrderManage() { wx.navigateTo({ url: '/pages/merchant-order-manage/merchant-order-manage' }) },
  goDashboard() { /* 当前页 */ },
  goStats() { wx.navigateTo({ url: '/pages/merchant-stats/merchant-stats' }) },
  goProfile() { wx.navigateTo({ url: '/pages/merchant-profile/merchant-profile' }) }
})
