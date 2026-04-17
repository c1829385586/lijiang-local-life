Page({
  data: { form: { name: '', phone: '', address: '', description: '', tags: [], images: [] }, newTag: '', loading: false },

  onLoad() { this.loadStore() },

  async loadStore() {
    const { result } = await wx.cloud.callFunction({ name: 'merchant', data: { action: 'getStore' } })
    if (result.code === 0) this.setData({ form: result.data })
  },

  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }) },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({ 'form.address': res.name || res.address, 'form.latitude': res.latitude, 'form.longitude': res.longitude })
      }
    })
  },

  addTag(e) {
    const tag = e.detail.value.trim()
    if (!tag) return
    const tags = [...(this.data.form.tags || []), tag]
    this.setData({ 'form.tags': tags, newTag: '' })
  },

  removeTag(e) {
    const tags = [...this.data.form.tags]
    tags.splice(e.currentTarget.dataset.index, 1)
    this.setData({ 'form.tags': tags })
  },

  async chooseImage() {
    const res = await wx.chooseMedia({ count: 9 - this.data.form.images.length, mediaType: ['image'], sizeType: ['compressed'] })
    wx.showLoading({ title: '上传中' })
    const uploads = await Promise.all(res.tempFiles.map(f =>
      wx.cloud.uploadFile({ cloudPath: `store/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`, filePath: f.tempFilePath })
    ))
    const newImages = uploads.map(u => u.fileID)
    this.setData({ 'form.images': [...this.data.form.images, ...newImages] })
    wx.hideLoading()
  },

  deleteImage(e) {
    const images = [...this.data.form.images]
    images.splice(e.currentTarget.dataset.index, 1)
    this.setData({ 'form.images': images })
  },

  async onSubmit() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      await wx.cloud.callFunction({
        name: 'merchant',
        data: { action: 'updateStore', storeData: this.data.form }
      })
      getApp().globalData.merchantInfo = { ...getApp().globalData.merchantInfo, ...this.data.form }
      wx.showToast({ title: '保存成功', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
    this.setData({ loading: false })
  }
})
