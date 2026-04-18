const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    hotels: [],
    keyword: '',
    sortBy: 'score',
    page: 1,
    loading: false,
    hasMore: true
  },

  onLoad() { this.loadHotels(true) },
  onPullDownRefresh() { this.loadHotels(true).then(() => wx.stopPullDownRefresh()) },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadHotels(false) },

  onSearchInput(e) { this.setData({ keyword: e.detail.value }) },
  onSearch() { this.loadHotels(true) },

  setSort(e) {
    this.setData({ sortBy: e.currentTarget.dataset.sort })
    this.loadHotels(true)
  },

  async loadHotels(refresh) {
    if (this.data.loading) return
    this.setData({ loading: true })
    const page = refresh ? 1 : this.data.page
    const { keyword, sortBy } = this.data
    const pageSize = 10

    try {
      let query = db.collection('stores').where({ type: 'hotel', status: 1 })
      if (keyword) {
        query = query.where({ name: db.RegExp({ regexp: keyword, options: 'i' }) })
      }

      // 排序逻辑
      let sortField = 'score'
      let sortDir = 'desc'
      if (sortBy === 'score') {
        sortField = 'score'
        sortDir = 'desc'
      } else if (sortBy === 'price_asc') {
        sortField = 'minPrice'
        sortDir = 'asc'
      } else if (sortBy === 'price_desc') {
        sortField = 'minPrice'
        sortDir = 'desc'
      } else if (sortBy === 'distance') {
        sortField = 'score' // 云数据库不支持距离排序，按评分兜底
        sortDir = 'desc'
      }

      const countR = await query.count()
      const res = await query.orderBy(sortField, sortDir).skip((page - 1) * pageSize).limit(pageSize).get()

      const hotels = refresh ? res.data : [...this.data.hotels, ...res.data]
      this.setData({ hotels, page: page + 1, hasMore: page * pageSize < countR.total, loading: false })
    } catch (e) { console.error(e); this.setData({ loading: false }) }
  },

  goDetail(e) { wx.navigateTo({ url: `/pages/hotel-detail/hotel-detail?id=${e.currentTarget.dataset.id}` }) }
})
