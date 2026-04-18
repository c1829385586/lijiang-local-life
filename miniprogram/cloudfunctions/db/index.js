// cloudfunctions/db/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { action } = event
  const openid = cloud.getWXContext().OPENID

  // 领取优惠券
  async function receiveCoupon(couponId, openid) {
    const existing = await db.collection('user_coupons').where({ openid, couponId }).get()
    if (existing.data.length > 0) return { code: -1, msg: '已领取过' }

    await db.collection('user_coupons').add({
      data: {
        openid,
        couponId,
        used: false,
        receivedAt: new Date(),
        createdAt: new Date()
      }
    })
    return { code: 0, msg: '领取成功' }
  }

  // 我的优惠券列表
  async function listMyCoupons(openid) {
    const res = await db.collection('user_coupons').where({ openid }).orderBy('receivedAt', 'desc').get()
    const coupons = []
    for (const uc of res.data) {
      try {
        const coupon = await db.collection('coupons').doc(uc.couponId).get()
        coupons.push({
          ...coupon.data,
          used: uc.used,
          receivedAt: uc.receivedAt
        })
      } catch (e) {
        // coupon may have been deleted
      }
    }
    return { code: 0, data: coupons }
  }

  switch (action) {
    case 'saveAddress':
      return await db.collection('addresses').add({ data: { ...event.address, openid, createdAt: new Date() } }).then(r => ({ code: 0, id: r._id }))
    case 'listAddresses':
      const addrs = await db.collection('addresses').where({ openid }).orderBy('isDefault', 'desc').orderBy('createdAt', 'desc').get()
      return { code: 0, data: addrs.data }
    case 'deleteAddress':
      await db.collection('addresses').doc(event.addressId).remove()
      return { code: 0 }
    case 'setDefaultAddress':
      await db.collection('addresses').where({ openid }).update({ data: { isDefault: false } })
      await db.collection('addresses').doc(event.addressId).update({ data: { isDefault: true } })
      return { code: 0 }
    case 'receiveCoupon':
      return await receiveCoupon(event.couponId, openid)
    case 'listMyCoupons':
      return await listMyCoupons(openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}
