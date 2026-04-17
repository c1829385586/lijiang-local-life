const db = wx.cloud.database()
Page({
  data: { form: { name: '', price: '', stock: '', description: '', image: '' }, isEdit: false, editId: '', loading: false },
  onLoad(options) {
    if (options.id) { this.setData({ isEdit: true, editId: options.id }); this.loadRoom(options.id) }
  },
  async loadRoom(id) { const r = await db.collection('rooms').doc(id).get(); this.setData({ form: r.data }) },
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }) },
  async chooseImage() {
    const res = await wx.chooseMedia({ count: 1, mediaType: ['image'], sizeType: ['compressed'] })
    const upload = await wx.cloud.uploadFile({ cloudPath: `rooms/${Date.now()}.jpg`, filePath: res.tempFiles[0].tempFilePath })
    this.setData({ 'form.image': upload.fileID })
  },
  async onSubmit() {
    const { form, isEdit, editId, loading } = this.data
    if (loading) return
    if (!form.name || !form.price || !form.stock) return wx.showToast({ title: '请填写完整', icon: 'none' })
    this.setData({ loading: true })
    const data = { ...form, price: Number(form.price), stock: Number(form.stock) }
    const action = isEdit ? 'updateRoom' : 'addRoom'
    const payload = isEdit ? { action, roomId: editId, roomData: data } : { action, roomData: data }
    const { result } = await wx.cloud.callFunction({ name: 'merchant', data: payload })
    if (result.code === 0) { wx.showToast({ title: '成功', icon: 'success' }); setTimeout(() => wx.navigateBack(), 1500) }
    else wx.showToast({ title: result.msg || '失败', icon: 'none' })
    this.setData({ loading: false })
  }
})
