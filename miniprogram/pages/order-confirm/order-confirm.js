// pages/order-confirm/order-confirm.js
const db = wx.cloud.database()

Page({
  data: {
    orderData: {},
    address: null,
    guestName: '',
    guestPhone: '',
    remark: '',
    loading: false
  },

  onLoad(options) {
    if (options.data) {
      const orderData = JSON.parse(decodeURIComponent(options.data))
      this.setData({ orderData })
    }
  },

  chooseAddress() {
    wx.chooseAddress({
      success: (res) => {
        this.setData({ address: res })
      }
    })
  },

  onGuestInput(e) {
    this.setData({ guestName: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ guestPhone: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  // 请求订阅消息授权
  requestOrderSubscribe(orderId) {
    // 模板ID —— 替换为你在微信公众平台获取的实际模板ID
    const tmplIds = [
      'TMPL_ORDER_PAID',        // 支付成功通知
      'TMPL_ORDER_COMPLETED',    // 订单完成通知
      'TMPL_ORDER_CANCELLED'     // 订单取消通知
    ]

    wx.requestSubscribeMessage({
      tmplIds,
      success: (res) => {
        // 记录订阅结果到云函数
        const subscribedIds = tmplIds.filter(id => res[id] === 'accept')
        if (subscribedIds.length > 0) {
          wx.cloud.callFunction({
            name: 'notify',
            data: { action: 'subscribe', templateIds: subscribedIds }
          }).catch(() => {})
        }
      },
      fail: () => {} // 用户拒绝也静默处理
    })
  },

  // 微信支付
  async onPay() {
    const { orderData, address, guestName, guestPhone, remark, loading } = this.data
    if (loading) return

    // 校验
    if (orderData.type === 'product' && !address) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }
    if (orderData.type === 'hotel' && (!guestName || !guestPhone)) {
      wx.showToast({ title: '请填写入住信息', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      // 1. 创建订单
      const orderResult = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'create',
          orderData: {
            ...orderData,
            address: address ? {
              name: address.userName,
              phone: address.telNumber,
              province: address.provinceName,
              city: address.cityName,
              district: address.countyName,
              detail: address.detailInfo,
              postalCode: address.postalCode
            } : null,
            guestName,
            guestPhone,
            remark
          }
        }
      })

      const { orderId, payment } = orderResult.result
      if (!payment) {
        throw new Error('创建支付参数失败')
      }

      // 2. 判断是否为模拟支付
      if (payment.mock) {
        // 模拟支付：直接成功
        wx.showToast({ title: '下单成功', icon: 'success' })
      } else {
        // 真实微信支付
        await wx.requestPayment({
          timeStamp: payment.timeStamp,
          nonceStr: payment.nonceStr,
          package: payment.package,
          signType: payment.signType,
          paySign: payment.paySign
        })
        wx.showToast({ title: '支付成功', icon: 'success' })
      }

      // 3. 请求订阅消息（支付成功后引导用户订阅）
      this.requestOrderSubscribe(orderId)

      // 4. 跳转订单列表
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/order/order?status=paid`
        })
      }, 1500)

    } catch (e) {
      console.error('支付失败', e)
      if (e.errMsg && e.errMsg.includes('cancel')) {
        wx.showToast({ title: '已取消支付', icon: 'none' })
      } else {
        wx.showToast({ title: '支付失败，请重试', icon: 'none' })
      }
    }

    this.setData({ loading: false })
  }
})
