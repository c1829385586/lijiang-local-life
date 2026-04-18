Page({
  data: { userInfo: {}, isMerchant: false, favoriteCount: 0, historyCount: 0 },
  onShow() {
    const app = getApp()
    const favorites = wx.getStorageSync('favorites') || []
    const history = wx.getStorageSync('browse_history') || []
    this.setData({
      userInfo: app.globalData.userInfo || {},
      isMerchant: !!app.globalData.isMerchantLogin,
      favoriteCount: favorites.length,
      historyCount: history.length
    })
  },
  goOrders(e) {
    const status = e.currentTarget.dataset.status || 'all'
    wx.setStorageSync('order_tab_status', status)
    wx.switchTab({ url: '/pages/order/order' })
  },
  goAddress() { wx.navigateTo({ url: '/pages/address/address' }) },
  goCart() { wx.navigateTo({ url: '/pages/cart/cart' }) },
  goFavorites() { wx.navigateTo({ url: '/pages/favorites/favorites' }) },
  goHistory() { wx.navigateTo({ url: '/pages/browse-history/browse-history' }) },
  goMyReviews() { wx.navigateTo({ url: '/pages/my-reviews/my-reviews' }) },
  goCoupon() { wx.navigateTo({ url: '/pages/coupon/coupon' }) },
  contactService() { wx.makePhoneCall({ phoneNumber: '4000000000' }) },
  goAbout() { wx.showModal({ title: '本地生活', content: '多商家本地生活平台\n丽江·酒店·美食·游玩·特产', showCancel: false }) },
  goMerchantCenter() {
    const app = getApp()
    if (app.globalData.isMerchantLogin) {
      wx.navigateTo({ url: '/pages/merchant-dashboard/merchant-dashboard' })
    } else {
      wx.navigateTo({ url: '/pages/merchant-login/merchant-login' })
    }
  }
})
