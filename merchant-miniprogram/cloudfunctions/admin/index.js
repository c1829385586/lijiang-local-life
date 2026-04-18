const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ADMIN_PASSWORD = 'admin123'

exports.main = async (event, context) => {
  // HTTP trigger: data is in event.body (string)
  // Direct call: data is in event object
  let params = event
  if (typeof event.body === 'string') {
    try { params = JSON.parse(event.body) } catch(e) { params = event }
  } else if (event.body && typeof event.body === 'object') {
    params = event.body
  }

  const { action } = params

  if (action === 'login') {
    if (params.password === ADMIN_PASSWORD) {
      return { code: 0, token: 'admin_token_ok' }
    }
    return { code: -1, msg: 'password error' }
  }

  if (params.token !== 'admin_token_ok') {
    return { code: -1, msg: 'unauthorized' }
  }

  try {
    switch (action) {
      case 'dashboard': {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const [totalStores, totalOrders, totalUsers, todayOrders, allOrders] = await Promise.all([
          db.collection('stores').count(),
          db.collection('orders').count(),
          db.collection('users').count(),
          db.collection('orders').where({ createdAt: _.gte(today) }).count(),
          db.collection('orders').where({ createdAt: _.gte(today) }).get()
        ])
        const todayRevenue = allOrders.data
          .filter(o => o.status === 'paid' || o.status === 'completed')
          .reduce((sum, o) => sum + (o.totalPrice || 0), 0)
        const pendingMerchants = await db.collection('merchants').where({ status: 0 }).count()
        const pendingOrders = await db.collection('orders').where({ status: 'pending' }).count()
        return { code: 0, data: {
          totalStores: totalStores.total,
          totalOrders: totalOrders.total,
          totalUsers: totalUsers.total,
          todayOrders: todayOrders.total,
          todayRevenue: todayRevenue.toFixed(2),
          pendingMerchants: pendingMerchants.total,
          pendingOrders: pendingOrders.total
        }}
      }

      case 'merchantList': {
        const { page = 1, status, keyword } = params
        let query = db.collection('merchants')
        if (status !== undefined && status !== '') query = query.where({ status: Number(status) })
        if (keyword) query = query.where({ name: db.RegExp({ regexp: keyword, options: 'i' }) })
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'merchantAudit': {
        const { merchantId, status } = params
        await db.collection('merchants').doc(merchantId).update({ data: { status: Number(status), updatedAt: db.serverDate() } })
        return { code: 0, msg: 'ok' }
      }

      case 'merchantDetail': {
        const res = await db.collection('merchants').doc(params.merchantId).get()
        return { code: 0, data: res.data }
      }

      case 'orderList': {
        const { page = 1, status, keyword } = params
        let query = db.collection('orders')
        if (status && status !== 'all') query = query.where({ status })
        if (keyword) query = query.where({ orderNo: db.RegExp({ regexp: keyword, options: 'i' }) })
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'orderDetail': {
        const res = await db.collection('orders').doc(params.orderId).get()
        return { code: 0, data: res.data }
      }

      case 'storeList': {
        const { page = 1, type, status, keyword } = params
        let where = {}
        if (type) where.type = type
        if (status !== undefined && status !== '') where.status = Number(status)
        if (keyword) where.name = db.RegExp({ regexp: keyword, options: 'i' })
        let query = db.collection('stores')
        if (Object.keys(where).length) query = query.where(where)
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'storeUpdate': {
        const { storeId, data } = params
        await db.collection('stores').doc(storeId).update({ data: { ...data, updatedAt: db.serverDate() } })
        return { code: 0, msg: 'ok' }
      }

      case 'productList': {
        const { page = 1, category, status, keyword } = params
        let where = {}
        if (category) where.category = category
        if (status !== undefined && status !== '') where.status = Number(status)
        if (keyword) where.name = db.RegExp({ regexp: keyword, options: 'i' })
        let query = db.collection('products')
        if (Object.keys(where).length) query = query.where(where)
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'productUpdate': {
        const { productId, data } = params
        await db.collection('products').doc(productId).update({ data: { ...data, updatedAt: db.serverDate() } })
        return { code: 0, msg: 'ok' }
      }

      case 'bannerList': {
        const res = await db.collection('banners').orderBy('sort', 'asc').get()
        return { code: 0, data: res.data }
      }

      case 'bannerAdd': {
        await db.collection('banners').add({ data: { ...params.bannerData, createdAt: db.serverDate() } })
        return { code: 0, msg: 'ok' }
      }

      case 'bannerUpdate': {
        const { bannerId, data } = params
        await db.collection('banners').doc(bannerId).update({ data: { ...data, updatedAt: db.serverDate() } })
        return { code: 0, msg: 'ok' }
      }

      case 'bannerDelete': {
        await db.collection('banners').doc(params.bannerId).remove()
        return { code: 0, msg: 'ok' }
      }

      case 'userList': {
        const { page = 1, keyword } = params
        let query = db.collection('users')
        if (keyword) query = query.where({ nickName: db.RegExp({ regexp: keyword, options: 'i' }) })
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'reviewList': {
        const { page = 1, rating, status, keyword } = params
        let where = {}
        if (rating !== undefined && rating !== '') where.rating = Number(rating)
        if (status !== undefined && status !== '') where.status = Number(status)
        if (keyword) where.content = db.RegExp({ regexp: keyword, options: 'i' })
        let query = db.collection('reviews')
        if (Object.keys(where).length) query = query.where(where)
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'reviewHide': {
        await db.collection('reviews').doc(params.reviewId).update({ data: { status: 0, updatedAt: db.serverDate() } })
        return { code: 0, msg: 'ok' }
      }

      case 'reviewShow': {
        await db.collection('reviews').doc(params.reviewId).update({ data: { status: 1, updatedAt: db.serverDate() } })
        return { code: 0, msg: 'ok' }
      }

      case 'reviewDelete': {
        await db.collection('reviews').doc(params.reviewId).remove()
        return { code: 0, msg: 'ok' }
      }

      case 'reviewStats': {
        const allReviews = await db.collection('reviews').get()
        const reviews = allReviews.data
        const total = reviews.length
        const avgRating = total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : 0
        const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        reviews.forEach(r => { ratingDist[r.rating] = (ratingDist[r.rating] || 0) + 1 })
        const hidden = reviews.filter(r => r.status === 0).length
        const byType = {}
        reviews.forEach(r => { const t = r.type || 'other'; byType[t] = (byType[t] || 0) + 1 })
        return { code: 0, data: { total, avgRating, ratingDist, hidden, byType } }
      }

      case 'notifySend': {
        const { orderId, notifyType } = params
        const res = await cloud.callFunction({ name: 'notify', data: { action: 'sendOrderNotify', orderId, notifyType } })
        return res.result
      }

      case 'notifyBatchSend': {
        const { orderIds, notifyType: nType } = params
        const results = []
        for (const oid of (orderIds || [])) {
          try {
            const res = await cloud.callFunction({ name: 'notify', data: { action: 'sendOrderNotify', orderId: oid, notifyType: nType } })
            results.push({ orderId: oid, ...res.result })
          } catch (e) {
            results.push({ orderId: oid, code: -1, msg: e.message })
          }
        }
        return { code: 0, results }
      }

      case 'notifyLogs': {
        const { page = 1, type, status: logStatus } = params
        let where = {}
        if (type) where.type = type
        if (logStatus) where.status = logStatus
        let query = db.collection('notify_logs')
        if (Object.keys(where).length) query = query.where(where)
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'notifyStats': {
        const allLogs = await db.collection('notify_logs').get()
        const logs = allLogs.data
        const total = logs.length
        const success = logs.filter(l => l.status === 'success').length
        const failed = logs.filter(l => l.status === 'failed').length
        const byType = {}
        logs.forEach(l => { byType[l.type] = (byType[l.type] || 0) + 1 })
        return { code: 0, data: { total, success, failed, byType } }
      }

      case 'changePassword': {
        if (params.oldPassword !== ADMIN_PASSWORD) return { code: -1, msg: 'wrong password' }
        return { code: 0, msg: 'password changed (restart cloud function to take effect)' }
      }

      default:
        return { code: -1, msg: 'unknown action' }
    }
  } catch (e) {
    console.error('Admin error:', e)
    return { code: -1, msg: e.message || 'server error' }
  }
}
