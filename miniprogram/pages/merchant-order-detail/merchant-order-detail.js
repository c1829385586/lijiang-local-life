const db = wx.cloud.database()
Page({
  data: {
    order: {},
    statusMap: { pending: '待处理', paid: '已支付', completed: '已完成', cancelled: '已取消', rejected: '已拒绝', refunded: '已退款' }
  },
  onLoad(options) { this.loadOrder(options.id) },
  async loadOrder(id) {
    const res = await db.collection('orders').doc(id).get()
    this.setData({ order: res.data })
  },
  async handleOrder(e) {
    const action = e.currentTarget.dataset.action
    const statusMap = { accept: 'paid', reject: 'rejected', completed: 'completed' }
    const msgMap = { accept: '确认接单？', reject: '确定拒绝？', completed: '确认完成？' }
    const res = await wx.showModal({ title: '提示', content: msgMap[action] })
    if (!res.confirm) return
    try {
      await wx.cloud.callFunction({ name: 'merchant', data: { action: 'handleOrder', orderId: this.data.order._id, status: statusMap[action] } })
      wx.showToast({ title: '操作成功', icon: 'success' })
      this.loadOrder(this.data.order._id)
    } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }) }
  }
})
