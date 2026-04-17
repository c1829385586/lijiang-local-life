Page({
  data: { addresses: [], loading: false },
  onShow() { this.loadAddresses() },
  async loadAddresses() {
    this.setData({ loading: true })
    try {
      const { result } = await wx.cloud.callFunction({ name: 'db', data: { action: 'listAddresses' } })
      if (result && result.code === 0) {
        this.setData({ addresses: result.data })
      } else {
        // fallback: 使用微信原生地址
        this.setData({ addresses: [] })
      }
    } catch (e) {
      this.setData({ addresses: [] })
    }
    this.setData({ loading: false })
  },
  addAddress() {
    wx.chooseAddress({
      success: async (res) => {
        try {
          await wx.cloud.callFunction({
            name: 'db',
            data: {
              action: 'saveAddress',
              address: {
                name: res.userName,
                phone: res.telNumber,
                province: res.provinceName,
                city: res.cityName,
                district: res.countyName,
                detail: res.detailInfo,
                postalCode: res.postalCode,
                isDefault: this.data.addresses.length === 0
              }
            }
          })
          this.loadAddresses()
          wx.showToast({ title: '添加成功', icon: 'success' })
        } catch (e) {
          wx.showToast({ title: '添加失败', icon: 'none' })
        }
      }
    })
  },
  async setDefault(e) {
    const id = e.currentTarget.dataset.id
    try {
      await wx.cloud.callFunction({
        name: 'db',
        data: { action: 'setDefaultAddress', addressId: id }
      })
      this.loadAddresses()
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },
  async deleteAddress(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({ title: '确认删除', content: '确定删除该地址？' })
    if (!res.confirm) return
    try {
      await wx.cloud.callFunction({ name: 'db', data: { action: 'deleteAddress', addressId: id } })
      this.loadAddresses()
    } catch (e) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },
  editAddress(e) {
    // 简化处理：重新调用微信地址选择覆盖
    this.addAddress()
  }
})
