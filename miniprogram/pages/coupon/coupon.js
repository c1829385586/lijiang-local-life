// pages/coupon/coupon.js
const db = wx.cloud.database()
Page({
  data: {
    coupons: [],
    loading: false
  },
  onLoad() { this.loadCoupons() },
  async loadCoupons() {
    this.setData({ loading: true })
    try {
      const res = await db.collection('coupons').where({ status: 1 }).get()
      this.setData({ coupons: res.data, loading: false })
    } catch (e) {
      // 没有coupons集合时显示示例数据
      this.setData({
        coupons: [
          { _id: '1', name: '新用户专享', type: '满减', value: 20, minPrice: 100, storeName: '全场通用', expireDate: '2026-12-31', status: 1, used: false },
          { _id: '2', name: '酒店立减', type: '立减', value: 50, minPrice: 200, storeName: '精选民宿', expireDate: '2026-06-30', status: 1, used: false },
          { _id: '3', name: '美食折扣', type: '折扣', value: 8, minPrice: 50, storeName: '本地美食', expireDate: '2026-09-30', status: 1, used: false },
          { _id: '4', name: '特产包邮', type: '包邮', value: 0, minPrice: 0, storeName: '特产零食', expireDate: '2026-12-31', status: 1, used: false }
        ],
        loading: false
      })
    }
  },
  async receiveCoupon(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({ title: '领取成功', icon: 'success' })
  },
  goUse() {
    wx.switchTab({ url: '/pages/home/home' })
  }
})
