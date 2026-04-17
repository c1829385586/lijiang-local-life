const db = wx.cloud.database()
Page({
  data: { travels: [], keyword: '', loading: false },
  onLoad() { this.loadData() },
  onPullDownRefresh() { this.loadData().then(() => wx.stopPullDownRefresh()) },
  onSearchInput(e) { this.setData({ keyword: e.detail.value }) },
  onSearch() { this.loadData() },
  async loadData() {
    this.setData({ loading: true })
    let query = db.collection('stores').where({ type: 'travel', status: 1 })
    if (this.data.keyword) query = query.where({ name: db.RegExp({ regexp: this.data.keyword, options: 'i' }) })
    const res = await query.orderBy('score', 'desc').limit(20).get()
    this.setData({ travels: res.data, loading: false })
  },
  goDetail(e) { wx.navigateTo({ url: `/pages/travel-detail/travel-detail?id=${e.currentTarget.dataset.id}` }) }
})
