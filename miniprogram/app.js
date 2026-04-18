App({
  globalData: {
    userInfo: null,
    location: null,
    openid: null,
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

    // 自动登录
    this.login()

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
        console.warn('获取位置失败，使用默认丽江坐标')
        // 默认丽江古城坐标
        this.globalData.location = {
          latitude: 26.8721,
          longitude: 100.2299
        }
      }
    })
  },

  // 全局登录
  async login() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'login' })
      if (result && result.code === 0) {
        this.globalData.openid = result.openid
        this.globalData.userInfo = result.userInfo
      }
    } catch (e) {
      console.error('登录失败:', e)
    }
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
