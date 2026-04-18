// pages/coupon/coupon.js
const db = wx.cloud.database()
Page({
  data: {
    coupons: [],
    myCoupons: [],
    currentTab: 'available', // available | mine
    loading: false
  },
  onLoad() { this.loadCoupons() },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    if (tab === 'mine') this.loadMyCoupons()
    else this.loadCoupons()
  },

  async loadCoupons() {
    this.setData({ loading: true })
    try {
      const res = await db.collection('coupons').where({ status: 1 }).get()
      this.setData({ coupons: res.data, loading: false })
    } catch (e) {
      // 没有coupons集合时显示示例数据
      this.setData({
        coupons: [
          { _id: 'demo1', name: '新用户专享', type: '满减', value: 20, minPrice: 100, storeName: '全场通用', expireDate: '2026-12-31', status: 1, total: 100, received: 23 },
          { _id: 'demo2', name: '酒店立减', type: '立减', value: 50, minPrice: 200, storeName: '精选民宿', expireDate: '2026-06-30', status: 1, total: 50, received: 12 },
          { _id: 'demo3', name: '美食折扣', type: '折扣', value: 8, minPrice: 50, storeName: '本地美食', expireDate: '2026-09-30', status: 1, total: 200, received: 67 },
          { _id: 'demo4', name: '特产包邮', type: '包邮', value: 0, minPrice: 0, storeName: '特产零食', expireDate: '2026-12-31', status: 1, total: 500, received: 189 }
        ],
        loading: false
      })
    }
  },

  async loadMyCoupons() {
    this.setData({ loading: true })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'db',
        data: { action: 'listMyCoupons' }
      })
      if (result.code === 0) {
        this.setData({ myCoupons: result.data, loading: false })
      }
    } catch (e) {
      // 从本地存储读取
      const myCoupons = wx.getStorageSync('my_coupons') || []
      this.setData({ myCoupons, loading: false })
    }
  },

  async receiveCoupon(e) {
    const id = e.currentTarget.dataset.id
    const coupon = e.currentTarget.dataset.coupon

    // 检查是否已领取
    let myCoupons = wx.getStorageSync('my_coupons') || []
    if (myCoupons.find(c => c._id === id)) {
      wx.showToast({ title: '已领取过', icon: 'none' })
      return
    }

    try {
      // 尝试调用云函数
      await wx.cloud.callFunction({
        name: 'db',
        data: { action: 'receiveCoupon', couponId: id }
      })
    } catch (e) {
      // 本地存储fallback
      myCoupons.push({
        ...coupon,
        receivedAt: new Date().toISOString(),
        used: false
      })
      wx.setStorageSync('my_coupons', myCoupons)
    }

    wx.showToast({ title: '领取成功', icon: 'success' })
  },

  goUse() {
    wx.switchTab({ url: '/pages/home/home' })
  }
})
