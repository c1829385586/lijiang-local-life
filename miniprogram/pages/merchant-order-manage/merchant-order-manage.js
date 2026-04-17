// pages/merchant-order-manage/merchant-order-manage.js
Page({
  data: {
    orders: [], currentTab: 'all', page: 1, loading: false, hasMore: true, pendingCount: 0,
    statusMap: { pending: '待处理', paid: '已支付', completed: '已完成', cancelled: '已取消', rejected: '已拒绝', refunded: '已退款' },
    typeMap: { hotel: '酒店', food: '美食', product: '特产', travel: '游玩' }
  },
  onShow() { this.loadOrders(true); this.loadPendingCount() },
  onPullDownRefresh() { this.loadOrders(true).then(() => wx.stopPullDownRefresh()) },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadOrders(false) },
  switchTab(e) { this.setData({ currentTab: e.currentTarget.dataset.tab }); this.loadOrders(true) },
  async loadPendingCount() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'merchant', data: { action: 'merchantOrders', status: 'pending', page: 1 } })
      this.setData({ pendingCount: result.total || 0 })
    } catch (e) { console.error(e) }
  },
  async loadOrders(refresh) {
    if (this.data.loading) return
    this.setData({ loading: true })
    const page = refresh ? 1 : this.data.page
    try {
      const { result } = await wx.cloud.callFunction({ name: 'merchant', data: { action: 'merchantOrders', status: this.data.currentTab, page } })
      if (result.code === 0) {
        const orders = refresh ? result.data : [...this.data.orders, ...result.data]
        this.setData({ orders, page: page + 1, hasMore: result.hasMore, loading: false })
      }
    } catch (e) { console.error(e); this.setData({ loading: false }) }
  },
  async handleOrder(e) {
    const { id, action } = e.currentTarget.dataset
    const statusMap = { accept: 'paid', reject: 'rejected', completed: 'completed' }
    const msgMap = { accept: '确认接单？', reject: '确定拒绝此订单？', completed: '确认完成此订单？' }
    const res = await wx.showModal({ title: '提示', content: msgMap[action] })
    if (!res.confirm) return
    try {
      await wx.cloud.callFunction({ name: 'merchant', data: { action: 'handleOrder', orderId: id, status: statusMap[action] } })
      wx.showToast({ title: '操作成功', icon: 'success' })
      this.loadOrders(true); this.loadPendingCount()
    } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }) }
  },
  goDetail(e) { wx.navigateTo({ url: `/pages/merchant-order-detail/merchant-order-detail?id=${e.currentTarget.dataset.id}` }) }
})
