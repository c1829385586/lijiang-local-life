// pages/my-reviews/my-reviews.js
Page({
  data: { reviews: [], page: 1, loading: false, hasMore: true },

  onShow() { this.loadReviews(true) },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadReviews(false) },

  async loadReviews(refresh) {
    if (this.data.loading) return
    this.setData({ loading: true })
    const page = refresh ? 1 : this.data.page
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'review',
        data: { action: 'myList', page }
      })
      if (result.code === 0) {
        const reviews = refresh ? result.data : [...this.data.reviews, ...result.data]
        this.setData({ reviews, page: page + 1, hasMore: result.hasMore, loading: false })
      }
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  goStore(e) {
    const { type, id } = e.currentTarget.dataset
    const pages = { hotel: '/pages/hotel-detail/hotel-detail', food: '/pages/food-detail/food-detail', travel: '/pages/travel-detail/travel-detail', product: '/pages/store-detail/store-detail?type=product' }
    wx.navigateTo({ url: `${pages[type] || pages.hotel}?id=${id}` })
  }
})
