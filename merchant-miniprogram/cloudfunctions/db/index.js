// cloudfunctions/db/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { action } = event
  const openid = cloud.getWXContext().OPENID

  switch (action) {
    // ============ 地址管理 ============
    case 'saveAddress':
      return await saveAddress(event.address, openid)
    case 'listAddresses':
      return await listAddresses(openid)
    case 'deleteAddress':
      return await deleteAddress(event.addressId, openid)
    case 'setDefaultAddress':
      return await setDefaultAddress(event.addressId, openid)

    // ============ 优惠券 ============
    case 'receiveCoupon':
      return await receiveCoupon(event.couponId, openid)
    case 'listMyCoupons':
      return await listMyCoupons(openid)

    default:
      return { code: -1, msg: '未知操作' }
  }
}

// ============ 地址管理 ============

async function saveAddress(address, openid) {
  const result = await db.collection('addresses').add({
    data: { ...address, openid, createdAt: new Date() }
  })
  return { code: 0, id: result._id }
}

async function listAddresses(openid) {
  const addrs = await db.collection('addresses')
    .where({ openid })
    .orderBy('isDefault', 'desc')
    .orderBy('createdAt', 'desc')
    .get()
  return { code: 0, data: addrs.data }
}

async function deleteAddress(addressId, openid) {
  await db.collection('addresses').doc(addressId).remove()
  return { code: 0 }
}

async function setDefaultAddress(addressId, openid) {
  await db.collection('addresses').where({ openid }).update({ data: { isDefault: false } })
  await db.collection('addresses').doc(addressId).update({ data: { isDefault: true } })
  return { code: 0 }
}

// ============ 优惠券 ============

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

async function listMyCoupons(openid) {
  const res = await db.collection('user_coupons')
    .where({ openid })
    .orderBy('receivedAt', 'desc')
    .get()

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
