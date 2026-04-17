Page({
  data: { userInfo: {}, isMerchant: false },
  onShow() {
    const app = getApp()
    this.setData({
      userInfo: app.globalData.userInfo || {},
      isMerchant: !!app.globalData.isMerchantLogin
    })
  },
  goOrders(e) { wx.switchTab({ url: '/pages/order/order?status=' + (e.currentTarget.dataset.status || 'all') }) },
  goAddress() { wx.navigateTo({ url: '/pages/address/address' }) },
  goCart() { wx.navigateTo({ url: '/pages/cart/cart' }) },
  contactService() { wx.makePhoneCall({ phoneNumber: '4000000000' }) },
  goAbout() { wx.showModal({ title: '本地生活', content: '多商家本地生活平台\n酒店·美食·游玩·特产', showCancel: false }) },
  goMerchantCenter() {
    const app = getApp()
    if (app.globalData.isMerchantLogin) {
      wx.navigateTo({ url: '/pages/merchant-dashboard/merchant-dashboard' })
    } else {
      wx.navigateTo({ url: '/pages/merchant-login/merchant-login' })
    }
  }
})
