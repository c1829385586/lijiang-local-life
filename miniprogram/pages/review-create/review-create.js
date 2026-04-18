// pages/review-create/review-create.js
Page({
  data: {
    orderId: '',
    order: {},
    rating: 5,
    content: '',
    images: [],
    submitting: false,
    ratingTexts: ['很差', '较差', '一般', '较好', '非常好']
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({ orderId: options.orderId })
      this.loadOrder(options.orderId)
    }
  },

  async loadOrder(orderId) {
    wx.showLoading({ title: '加载中' })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'review',
        data: { action: 'canReview', orderId }
      })
      if (result.code === 0) {
        this.setData({ order: result.order })
      } else {
        wx.showToast({ title: result.msg, icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    wx.hideLoading()
  },

  // 选择评分
  onSelectRating(e) {
    this.setData({ rating: e.currentTarget.dataset.rating })
  },

  // 输入评价
  onInput(e) {
    this.setData({ content: e.detail.value })
  },

  // 选择图片
  async chooseImage() {
    const remaining = 9 - this.data.images.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传9张', icon: 'none' })
      return
    }
    try {
      const res = await wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })
      wx.showLoading({ title: '上传中...' })
      const uploadPromises = res.tempFiles.map(file =>
        wx.cloud.uploadFile({
          cloudPath: `reviews/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
          filePath: file.tempFilePath
        })
      )
      const results = await Promise.all(uploadPromises)
      const newImages = results.map(r => r.fileID)
      this.setData({ images: [...this.data.images, ...newImages] })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      if (!e.errMsg?.includes('cancel')) {
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  },

  // 删除图片
  removeImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  // 预览图片
  previewImage(e) {
    wx.previewImage({ urls: this.data.images, current: e.currentTarget.dataset.src })
  },

  // 提交评价
  async onSubmit() {
    const { orderId, rating, content, images, submitting } = this.data
    if (submitting) return
    if (!content.trim() && images.length === 0) {
      wx.showToast({ title: '请填写评价内容或上传图片', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'review',
        data: {
          action: 'create',
          reviewData: {
            orderId,
            rating,
            content: content.trim(),
            images
          }
        }
      })

      if (result.code === 0) {
        wx.showToast({ title: '评价成功', icon: 'success' })
        setTimeout(() => {
          // 返回订单列表或订单详情
          const pages = getCurrentPages()
          if (pages.length > 1) {
            wx.navigateBack()
          } else {
            wx.redirectTo({ url: '/pages/order/order' })
          }
        }, 1500)
      } else {
        wx.showToast({ title: result.msg || '评价失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '评价失败', icon: 'none' })
    }

    this.setData({ submitting: false })
  }
})
