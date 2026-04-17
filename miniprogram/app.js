App({
  globalData: {
    userInfo: null,
    location: null,
    merchantInfo: null,
    isMerchantLogin: false
  },

  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-5gtgqlar51205e68',
        traceUser: true
      })
    }

    // 获取用户位置
    this.getLocation()

    // 检查商户登录状态
    this.checkMerchantLogin()
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.globalData.location = {
          latitude: res.latitude,
          longitude: res.longitude
        }
      },
      fail: () => {
        console.warn('获取位置失败')
      }
    })
  },

  // 全局登录
  async login() {
    const { result } = await wx.cloud.callFunction({ name: 'login' })
    this.globalData.openid = result.openid
    this.globalData.userInfo = result.userInfo
    return result
  },

  // 检查商户登录状态
  async checkMerchantLogin() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'merchant',
        data: { action: 'check' }
      })
      if (result.code === 0 && result.merchant) {
        this.globalData.merchantInfo = result.merchant
        this.globalData.isMerchantLogin = true
      }
    } catch (e) {
      console.log('商户未登录')
    }
  }
})
