App({
  globalData: {
    merchantInfo: null,
    isLogin: false
  },

  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'local-life-xxxxx', // 替换为你的云开发环境ID（和用户端同一个）
        traceUser: true
      })
    }
    this.checkLogin()
  },

  async checkLogin() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'merchant', data: { action: 'check' } })
      if (result.code === 0 && result.merchant) {
        this.globalData.merchantInfo = result.merchant
        this.globalData.isLogin = true
      }
    } catch (e) {
      console.log('未登录')
    }
  }
})
