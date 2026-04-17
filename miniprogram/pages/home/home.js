// pages/home/home.js
const db = wx.cloud.database()

Page({
  data: {
    banners: [],
    categories: [
      { icon: '/images/cat/hotel.png', name: '酒店民宿', page: '/pages/hotel/hotel', tab: true },
      { icon: '/images/cat/food.png', name: '美食推荐', page: '/pages/food/food', tab: true },
      { icon: '/images/cat/travel.png', name: '周边游玩', page: '/pages/travel/travel' },
      { icon: '/images/cat/product.png', name: '特产零食', page: '/pages/product/product' },
      { icon: '/images/cat/hot.png', name: '热门打卡', page: '/pages/search/search?type=hot' },
      { icon: '/images/cat/map.png', name: '地图探索', page: '/pages/map-explore/map-explore' },
      { icon: '/images/cat/coupon.png', name: '优惠券', page: '/pages/coupon/coupon' },
      { icon: '/images/cat/more.png', name: '全部', page: '/pages/search/search' }
    ],
    recommendHotels: [],
    recommendFoods: [],
    recommendProducts: [],
    locationText: '定位中...',
    searchKeyword: ''
  },

  onLoad() {
    this.getLocationText()
    this.loadData()
  },

  onShow() {
    // 刷新数据
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  async getLocationText() {
    const app = getApp()
    if (!app.globalData.location) {
      await new Promise(resolve => {
        const timer = setInterval(() => {
          if (app.globalData.location) {
            clearInterval(timer)
            resolve()
          }
        }, 500)
      })
    }
    const { latitude, longitude } = app.globalData.location
    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=2KUBZ-4M2CG-E27QM-QOEFM-WMYAT-PCFER`,
      success: (res) => {
        if (res.data && res.data.result) {
          const addr = res.data.result.address_component
          this.setData({ locationText: addr.district || addr.city })
        }
      }
    })
  },

  async loadData() {
    try {
      const [banners, hotels, foods, products] = await Promise.all([
        db.collection('banners').where({ status: 1 }).orderBy('sort', 'asc').limit(5).get(),
        db.collection('stores').where({ type: 'hotel', status: 1 }).orderBy('score', 'desc').limit(6).get(),
        db.collection('stores').where({ type: 'food', status: 1 }).orderBy('score', 'desc').limit(6).get(),
        db.collection('products').where({ status: 1 }).orderBy('sales', 'desc').limit(6).get()
      ])
      this.setData({
        banners: banners.data,
        recommendHotels: hotels.data,
        recommendFoods: foods.data,
        recommendProducts: products.data
      })
    } catch (e) {
      console.error('加载数据失败', e)
    }
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearch() {
    const { searchKeyword } = this.data
    if (searchKeyword) {
      wx.navigateTo({ url: `/pages/search/search?keyword=${searchKeyword}` })
    }
  },

  onCategoryTap(e) {
    const page = e.currentTarget.dataset.page
    const isTab = e.currentTarget.dataset.tab
    if (isTab) {
      wx.switchTab({ url: page })
    } else {
      wx.navigateTo({ url: page })
    }
  },

  onHotelTap(e) {
    wx.navigateTo({ url: `/pages/hotel-detail/hotel-detail?id=${e.currentTarget.dataset.id}` })
  },

  onFoodTap(e) {
    wx.navigateTo({ url: `/pages/food-detail/food-detail?id=${e.currentTarget.dataset.id}` })
  },

  onProductTap(e) {
    wx.navigateTo({ url: `/pages/store-detail/store-detail?type=product&id=${e.currentTarget.dataset.id}` })
  },

  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const app = getApp()
        app.globalData.location = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        this.setData({ locationText: res.name || res.address })
        this.loadData()
      }
    })
  }
})
