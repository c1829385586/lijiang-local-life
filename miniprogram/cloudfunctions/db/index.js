// cloudfunctions/db/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { action } = event
  const openid = cloud.getWXContext().OPENID

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
    default:
      return { code: -1, msg: '未知操作' }
  }
}
