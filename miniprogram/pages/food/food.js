const db = wx.cloud.database()
Page({
  data: { foods: [], keyword: '', sortBy: 'score', page: 1, loading: false, hasMore: true },
  onLoad() { this.loadFoods(true) },
  onPullDownRefresh() { this.loadFoods(true).then(() => wx.stopPullDownRefresh()) },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadFoods(false) },
  onSearchInput(e) { this.setData({ keyword: e.detail.value }) },
  onSearch() { this.loadFoods(true) },
  setSort(e) { this.setData({ sortBy: e.currentTarget.dataset.sort }); this.loadFoods(true) },
  async loadFoods(refresh) {
    if (this.data.loading) return
    this.setData({ loading: true })
    const page = refresh ? 1 : this.data.page
    const { keyword } = this.data
    let query = db.collection('stores').where({ type: 'food', status: 1 })
    if (keyword) query = query.where({ name: db.RegExp({ regexp: keyword, options: 'i' }) })
    const countR = await query.count()
    const res = await query.orderBy('score', 'desc').skip((page - 1) * 10).limit(10).get()
    const foods = refresh ? res.data : [...this.data.foods, ...res.data]
    this.setData({ foods, page: page + 1, hasMore: page * 10 < countR.total, loading: false })
  },
  goDetail(e) { wx.navigateTo({ url: `/pages/food-detail/food-detail?id=${e.currentTarget.dataset.id}` }) }
})
