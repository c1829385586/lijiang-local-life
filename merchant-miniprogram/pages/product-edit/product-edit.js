// pages/product-edit/product-edit.js
const db = wx.cloud.database()

Page({
  data: {
    form: {
      name: '',
      category: '',
      price: '',
      originalPrice: '',
      stock: '',
      description: '',
      images: [],
      canDeliverToRoom: true
    },
    categories: ['特产干货', '手工美食', '小零食', '伴手礼', '酒水饮料', '生鲜果蔬', '其他'],
    isEdit: false,
    editId: '',
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, editId: options.id })
      this.loadProduct(options.id)
    }
  },

  async loadProduct(id) {
    const product = await db.collection('products').doc(id).get()
    if (product.data) {
      this.setData({ form: product.data })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onCategoryChange(e) {
    this.setData({ 'form.category': this.data.categories[e.detail.value] })
  },

  toggleDeliver(e) {
    this.setData({ 'form.canDeliverToRoom': e.detail.value })
  },

  async chooseImage() {
    const res = await wx.chooseMedia({
      count: 9 - this.data.form.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed']
    })

    wx.showLoading({ title: '上传中...' })
    const uploadPromises = res.tempFiles.map(file =>
      wx.cloud.uploadFile({
        cloudPath: `products/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
        filePath: file.tempFilePath
      })
    )

    const results = await Promise.all(uploadPromises)
    const newImages = results.map(r => r.fileID)
    this.setData({
      'form.images': [...this.data.form.images, ...newImages],
      'form.coverImage': this.data.form.coverImage || newImages[0]
    })
    wx.hideLoading()
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.form.images]
    images.splice(index, 1)
    this.setData({
      'form.images': images,
      'form.coverImage': images[0] || ''
    })
  },

  async onSubmit() {
    const { form, isEdit, editId, loading } = this.data
    if (loading) return

    if (!form.name) return wx.showToast({ title: '请输入商品名称', icon: 'none' })
    if (!form.price) return wx.showToast({ title: '请输入售价', icon: 'none' })
    if (!form.stock) return wx.showToast({ title: '请输入库存', icon: 'none' })
    if (!form.images.length) return wx.showToast({ title: '请上传商品图片', icon: 'none' })

    this.setData({ loading: true })

    try {
      const productData = {
        ...form,
        price: Number(form.price),
        originalPrice: Number(form.originalPrice) || 0,
        stock: Number(form.stock),
        coverImage: form.images[0]
      }

      const action = isEdit ? 'updateProduct' : 'addProduct'
      const payload = isEdit
        ? { action, productId: editId, productData }
        : { action, productData }

      const { result } = await wx.cloud.callFunction({
        name: 'merchant',
        data: payload
      })

      if (result.code === 0) {
        wx.showToast({ title: isEdit ? '保存成功' : '添加成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      } else {
        wx.showToast({ title: result.msg || '操作失败', icon: 'none' })
      }
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }

    this.setData({ loading: false })
  }
})
