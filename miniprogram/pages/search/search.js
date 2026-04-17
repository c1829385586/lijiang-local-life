const db = wx.cloud.database()
Page({
  data: {
    keyword: '', results: [], loading: false,
    currentType: 'all',
    hotTags: ['民宿', '烧烤', '农家乐', '特产', '景点', '小吃', '采摘', '漂流'],
    typeMap: { hotel: '酒店民宿', food: '美食', travel: '游玩', product: '特产' },
    typeTabs: [
      { key: 'all', name: '综合' },
      { key: 'hotel', name: '酒店' },
      { key: 'food', name: '美食' },
      { key: 'travel', name: '游玩' },
      { key: 'product', name: '特产' }
    ]
  },
  onLoad(options) {
    if (options.keyword) {
      this.setData({ keyword: options.keyword })
    }
    if (options.type === 'hot') {
      this.setData({ keyword: '热门' })
      this.loadHot()
    } else if (options.type === 'coupon') {
      wx.redirectTo({ url: '/pages/coupon/coupon' })
      return
    } else if (options.type === 'map') {
      wx.redirectTo({ url: '/pages/map-explore/map-explore' })
      return
    }
    if (this.data.keyword) this.onSearch()
  },

  async loadHot() {
    this.setData({ loading: true })
    try {
      const [stores, products] = await Promise.all([
        db.collection('stores').where({ status: 1 }).orderBy('score', 'desc').limit(20).get(),
        db.collection('products').where({ status: 1 }).orderBy('sales', 'desc').limit(10).get()
      ])
      // 标记热门标签
      const results = [
        ...stores.data.map(s => ({ ...s, hotLabel: '人气推荐' })),
        ...products.data.map(p => ({ ...p, hotLabel: '爆款' }))
      ]
      this.setData({ results, loading: false })
    } catch (e) { console.error(e); this.setData({ loading: false }) }
  },

  onInput(e) { this.setData({ keyword: e.detail.value }) },

  searchTag(e) {
    this.setData({ keyword: e.currentTarget.dataset.tag })
    this.onSearch()
  },

  switchType(e) {
    this.setData({ currentType: e.currentTarget.dataset.type })
    this.onSearch()
  },

  async onSearch() {
    const { keyword, currentType } = this.data
    if (!keyword) return
    this.setData({ loading: true })
    const re = db.RegExp({ regexp: keyword, options: 'i' })
    try {
      let stores = [], products = []
      if (currentType === 'all') {
        [stores, products] = await Promise.all([
          db.collection('stores').where({ name: re, status: 1 }).limit(20).get(),
          db.collection('products').where({ name: re, status: 1 }).limit(10).get()
        ])
      } else if (currentType === 'product') {
        const p = await db.collection('products').where({ name: re, status: 1 }).limit(20).get()
        products = p.data
      } else {
        const s = await db.collection('stores').where({ name: re, type: currentType, status: 1 }).limit(20).get()
        stores = s.data
      }
      const results = [...stores.data || stores, ...products.data || products]
      this.setData({ results, loading: false })
    } catch (e) { console.error(e); this.setData({ loading: false }) }
  },

  goDetail(e) {
    const { type, id } = e.currentTarget.dataset
    const pages = {
      hotel: '/pages/hotel-detail/hotel-detail',
      food: '/pages/food-detail/food-detail',
      travel: '/pages/travel-detail/travel-detail',
      product: '/pages/store-detail/store-detail?type=product'
    }
    wx.navigateTo({ url: `${pages[type] || pages.hotel}?id=${id}` })
  },

  goBack() { wx.navigateBack() }
})
