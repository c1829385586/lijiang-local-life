Page({
  data: {
    merchant: {},
    typeMap: { hotel: '酒店民宿', food: '美食餐饮', travel: '周边游玩', product: '特产商店' }
  },

  onShow() {
    const app = getApp()
    this.setData({ merchant: app.globalData.merchantInfo || {} })
  },

  goStoreEdit() { wx.navigateTo({ url: '/pages/store-edit/store-edit?edit=1' }) },
  goRoomManage() { wx.navigateTo({ url: '/pages/room-manage/room-manage' }) },
  goProductManage() { wx.navigateTo({ url: '/pages/product-manage/product-manage' }) },
  goStats() { wx.switchTab({ url: '/pages/stats/stats' }) },

  async toggleStatus() {
    const newStatus = this.data.merchant.status === 1 ? 2 : 1
    try {
      await wx.cloud.callFunction({
        name: 'merchant',
        data: { action: 'updateStore', storeData: { status: newStatus } }
      })
      this.data.merchant.status = newStatus
      getApp().globalData.merchantInfo = this.data.merchant
      this.setData({ merchant: this.data.merchant })
      wx.showToast({ title: newStatus === 1 ? '已开启营业' : '已歇业', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  contactSupport() { wx.makePhoneCall({ phoneNumber: '4000000000' }) },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          getApp().globalData.merchantInfo = null
          getApp().globalData.isLogin = false
          wx.redirectTo({ url: '/pages/login/login' })
        }
      }
    })
  }
})
