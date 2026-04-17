Page({
  data: {
    form: {
      name: '',
      type: '',
      contactName: '',
      phone: '',
      address: '',
      latitude: 0,
      longitude: 0,
      description: '',
      images: []
    },
    typeOptions: ['酒店民宿', '美食餐饮', '周边游玩', '特产商店'],
    typeMap: {
      hotel: '酒店民宿',
      food: '美食餐饮',
      travel: '周边游玩',
      product: '特产商店'
    },
    typeValues: ['hotel', 'food', 'travel', 'product'],
    agreed: false,
    loading: false,
    isEdit: false
  },

  onLoad(options) {
    if (options.edit) {
      this.setData({ isEdit: true })
      this.loadMerchantInfo()
    }
  },

  async loadMerchantInfo() {
    const { result } = await wx.cloud.callFunction({
      name: 'merchant',
      data: { action: 'getStore' }
    })
    if (result.code === 0) {
      this.setData({ form: result.data })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onTypeChange(e) {
    const index = e.detail.value
    this.setData({ 'form.type': this.data.typeValues[index] })
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'form.address': res.name || res.address,
          'form.latitude': res.latitude,
          'form.longitude': res.longitude
        })
      }
    })
  },

  async chooseImage() {
    const res = await wx.chooseMedia({
      count: 9 - this.data.form.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed']
    })

    const uploadPromises = res.tempFiles.map(file =>
      wx.cloud.uploadFile({
        cloudPath: `merchant/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
        filePath: file.tempFilePath
      })
    )

    const uploadResults = await Promise.all(uploadPromises)
    const newImages = uploadResults.map(r => r.fileID)

    this.setData({
      'form.images': [...this.data.form.images, ...newImages]
    })
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.form.images
    images.splice(index, 1)
    this.setData({ 'form.images': images })
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  async onSubmit() {
    const { form, agreed, loading, isEdit } = this.data
    if (loading) return

    if (!form.name) return wx.showToast({ title: '请输入店铺名称', icon: 'none' })
    if (!form.type) return wx.showToast({ title: '请选择店铺类型', icon: 'none' })
    if (!form.contactName) return wx.showToast({ title: '请输入联系人', icon: 'none' })
    if (!form.phone || form.phone.length !== 11) return wx.showToast({ title: '请输入正确手机号', icon: 'none' })
    if (!form.address) return wx.showToast({ title: '请选择店铺地址', icon: 'none' })
    if (!agreed) return wx.showToast({ title: '请先同意服务协议', icon: 'none' })

    this.setData({ loading: true })

    try {
      const action = isEdit ? 'updateStore' : 'register'
      const dataKey = isEdit ? 'storeData' : 'merchant'

      const { result } = await wx.cloud.callFunction({
        name: 'merchant',
        data: { action, [dataKey]: form }
      })

      if (result.code === 0) {
        wx.showToast({ title: isEdit ? '保存成功' : '入驻成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/merchant-dashboard/merchant-dashboard' })
        }, 1500)
      } else {
        wx.showToast({ title: result.msg || '操作失败', icon: 'none' })
      }
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '提交失败', icon: 'none' })
    }

    this.setData({ loading: false })
  }
})
