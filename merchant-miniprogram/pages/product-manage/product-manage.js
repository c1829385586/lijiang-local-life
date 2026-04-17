// pages/product-manage/product-manage.js
Page({
  data: {
    products: [],
    loading: false
  },

  onShow() {
    this.loadProducts()
  },

  onPullDownRefresh() {
    this.loadProducts().then(() => wx.stopPullDownRefresh())
  },

  async loadProducts() {
    this.setData({ loading: true })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'merchant',
        data: { action: 'listProducts' }
      })
      if (result.code === 0) {
        this.setData({ products: result.data })
      }
    } catch (e) {
      console.error(e)
    }
    this.setData({ loading: false })
  },

  addProduct() {
    wx.navigateTo({ url: '/pages/product-edit/product-edit' })
  },

  editProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/product-edit/product-edit?id=${id}` })
  },

  async toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset
    const newStatus = status === 1 ? 0 : 1
    try {
      await wx.cloud.callFunction({
        name: 'merchant',
        data: {
          action: 'updateProduct',
          productId: id,
          productData: { status: newStatus }
        }
      })
      wx.showToast({ title: newStatus === 1 ? '已上架' : '已下架', icon: 'success' })
      this.loadProducts()
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async deleteProduct(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({ title: '确认删除', content: '删除后不可恢复，确定删除？' })
    if (!res.confirm) return

    try {
      await wx.cloud.callFunction({
        name: 'merchant',
        data: { action: 'deleteProduct', productId: id }
      })
      wx.showToast({ title: '已删除', icon: 'success' })
      this.loadProducts()
    } catch (e) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})
