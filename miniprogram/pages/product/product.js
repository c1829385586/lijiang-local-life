const db = wx.cloud.database()
Page({
  data: { products: [], keyword: '', category: '', loading: false },
  onLoad() { this.loadData() },
  onPullDownRefresh() { this.loadData().then(() => wx.stopPullDownRefresh()) },
  onSearchInput(e) { this.setData({ keyword: e.detail.value }) },
  onSearch() { this.loadData() },
  setCategory(e) { this.setData({ category: e.currentTarget.dataset.cat }); this.loadData() },
  async loadData() {
    this.setData({ loading: true })
    let query = db.collection('products').where({ status: 1 })
    if (this.data.keyword) query = query.where({ name: db.RegExp({ regexp: this.data.keyword, options: 'i' }) })
    if (this.data.category) query = query.where({ category: this.data.category })
    const res = await query.orderBy('sales', 'desc').limit(20).get()
    this.setData({ products: res.data, loading: false })
  },
  goDetail(e) { wx.navigateTo({ url: `/pages/store-detail/store-detail?type=product&id=${e.currentTarget.dataset.id}` }) }
})
