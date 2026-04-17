// pages/map-explore/map-explore.js
const db = wx.cloud.database()
Page({
  data: {
    markers: [],
    stores: [],
    listVisible: false,
    currentStore: {},
    latitude: 0,
    longitude: 0,
    typeFilter: 'all',
    typeMap: { hotel: '酒店民宿', food: '美食', travel: '游玩', product: '特产' }
  },
  onLoad() {
    const app = getApp()
    const loc = app.globalData.location
    if (loc) {
      this.setData({ latitude: loc.latitude, longitude: loc.longitude })
      this.loadNearby()
    } else {
      // 默认丽江古城坐标
      this.setData({ latitude: 26.8721, longitude: 100.2299 })
      this.loadNearby()
    }
  },
  async loadNearby() {
    try {
      const res = await db.collection('stores').where({ status: 1 }).limit(50).get()
      const markers = res.data.map((s, i) => ({
        id: i,
        latitude: s.latitude || this.data.latitude + (Math.random() - 0.5) * 0.02,
        longitude: s.longitude || this.data.longitude + (Math.random() - 0.5) * 0.02,
        title: s.name,
        iconPath: '/images/cat/' + (s.type || 'hotel') + '.png',
        width: 30,
        height: 30,
        callout: { content: s.name, display: 'BYCLICK', borderRadius: 8, padding: 8, fontSize: 12 }
      }))
      this.setData({ stores: res.data, markers })
    } catch (e) {
      console.error(e)
    }
  },
  onMarkerTap(e) {
    const store = this.data.stores[e.markerId]
    if (store) {
      this.setData({ currentStore: store, listVisible: true })
    }
  },
  hideDetail() { this.setData({ listVisible: false }) },
  filterType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ typeFilter: type })
    let stores = this.data.stores
    if (type !== 'all') {
      stores = stores.filter(s => s.type === type)
    }
    const markers = stores.map((s, i) => ({
      id: i,
      latitude: s.latitude || this.data.latitude + (Math.random() - 0.5) * 0.02,
      longitude: s.longitude || this.data.longitude + (Math.random() - 0.5) * 0.02,
      title: s.name,
      iconPath: '/images/cat/' + (s.type || 'hotel') + '.png',
      width: 30,
      height: 30,
      callout: { content: s.name, display: 'BYCLICK', borderRadius: 8, padding: 8, fontSize: 12 }
    }))
    this.setData({ markers })
  },
  goDetail(e) {
    const { type, id } = e.currentTarget.dataset
    const pages = {
      hotel: '/pages/hotel-detail/hotel-detail',
      food: '/pages/food-detail/food-detail',
      travel: '/pages/travel-detail/travel-detail'
    }
    wx.navigateTo({ url: `${pages[type] || pages.hotel}?id=${id}` })
  },
  locateMe() {
    const app = getApp()
    const loc = app.globalData.location
    if (loc) {
      this.setData({ latitude: loc.latitude, longitude: loc.longitude })
    }
  }
})
