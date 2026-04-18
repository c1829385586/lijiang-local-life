Page({
  data: { cartItems: [], allChecked: true, totalPrice: 0, checkedCount: 0 },

  onShow() { this.loadCart() },

  loadCart() {
    const cart = wx.getStorageSync('cart') || []
    cart.forEach(item => { if (item.checked === undefined) item.checked = true })
    this.setData({ cartItems: cart })
    this.calcTotal()
  },

  toggleItem(e) {
    const index = e.currentTarget.dataset.index
    this.data.cartItems[index].checked = !this.data.cartItems[index].checked
    this.setData({ cartItems: this.data.cartItems })
    this.calcTotal()
  },

  toggleAll() {
    const allChecked = !this.data.allChecked
    this.data.cartItems.forEach(item => { item.checked = allChecked })
    this.setData({ cartItems: this.data.cartItems, allChecked })
    this.calcTotal()
  },

  increase(e) {
    const index = e.currentTarget.dataset.index
    this.data.cartItems[index].quantity++
    this.setData({ cartItems: this.data.cartItems })
    this.saveCart(); this.calcTotal()
  },

  decrease(e) {
    const index = e.currentTarget.dataset.index
    if (this.data.cartItems[index].quantity > 1) {
      this.data.cartItems[index].quantity--
      this.setData({ cartItems: this.data.cartItems })
      this.saveCart(); this.calcTotal()
    }
  },

  async removeItem(e) {
    const index = e.currentTarget.dataset.index
    this.data.cartItems.splice(index, 1)
    this.setData({ cartItems: this.data.cartItems })
    this.saveCart(); this.calcTotal()
  },

  calcTotal() {
    const checked = this.data.cartItems.filter(i => i.checked)
    const total = checked.reduce((sum, i) => sum + i.price * i.quantity, 0)
    this.setData({
      totalPrice: total.toFixed(2),
      checkedCount: checked.length,
      allChecked: checked.length === this.data.cartItems.length && this.data.cartItems.length > 0
    })
  },

  saveCart() { wx.setStorageSync('cart', this.data.cartItems) },

  // 清空购物车
  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '确定清空购物车？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('cart', [])
          this.setData({ cartItems: [], totalPrice: '0.00', checkedCount: 0, allChecked: false })
        }
      }
    })
  },

  // 去逛逛
  goShopping() {
    wx.switchTab({ url: '/pages/home/home' })
  },

  onCheckout() {
    const checked = this.data.cartItems.filter(i => i.checked)
    if (!checked.length) { wx.showToast({ title: '请选择商品', icon: 'none' }); return }
    const orderData = encodeURIComponent(JSON.stringify({
      type: 'product',
      products: checked,
      totalPrice: this.data.totalPrice,
      coverImage: checked[0].coverImage,
      storeName: checked.map(i => i.name).join('、'),
      quantity: checked.reduce((s, i) => s + i.quantity, 0)
    }))
    wx.navigateTo({ url: `/pages/order-confirm/order-confirm?data=${orderData}` })
  }
})
