Page({
  data: { rooms: [], loading: false },
  onShow() { this.loadRooms() },
  async loadRooms() {
    this.setData({ loading: true })
    const { result } = await wx.cloud.callFunction({ name: 'merchant', data: { action: 'listRooms' } })
    if (result.code === 0) this.setData({ rooms: result.data })
    this.setData({ loading: false })
  },
  addRoom() { wx.navigateTo({ url: '/pages/merchant-room-edit/merchant-room-edit' }) },
  editRoom(e) { wx.navigateTo({ url: '/pages/merchant-room-edit/merchant-room-edit?id=' + e.currentTarget.dataset.id }) },
  async toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset
    await wx.cloud.callFunction({ name: 'merchant', data: { action: 'updateRoom', roomId: id, roomData: { status: status === 1 ? 0 : 1 } } })
    this.loadRooms()
  },
  async deleteRoom(e) {
    const res = await wx.showModal({ title: '确认删除', content: '确定删除此房型？' })
    if (!res.confirm) return
    await wx.cloud.callFunction({ name: 'merchant', data: { action: 'deleteRoom', roomId: e.currentTarget.dataset.id } })
    this.loadRooms()
  }
})
