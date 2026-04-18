const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 管理员密码 —— 部署后通过 changePassword 接口修改
// 首次使用会从数据库读取，不存在则使用默认值
let ADMIN_PASSWORD = 'admin123'

// 从数据库加载密码（如果已修改过）
async function loadPassword() {
  try {
    const res = await db.collection('admin_config').doc('password').get()
    if (res.data && res.data.value) {
      ADMIN_PASSWORD = res.data.value
    }
  } catch (e) {
    // 首次运行，集合不存在也没关系
  }
}

exports.main = async (event, context) => {
  // 确保密码已加载
  await loadPassword()

  // HTTP trigger: data is in event.body (string)
  // Direct call: data is in event object
  let params = event
  if (typeof event.body === 'string') {
    try { params = JSON.parse(event.body) } catch(e) { params = event }
  } else if (event.body && typeof event.body === 'object') {
    params = event.body
  }

  const { action } = params

  // 登录不需要 token
  if (action === 'login') {
    if (params.password === ADMIN_PASSWORD) {
      return { code: 0, token: 'admin_token_ok' }
    }
    return { code: -1, msg: '密码错误' }
  }

  // 其余接口需要 token
  if (params.token !== 'admin_token_ok') {
    return { code: -1, msg: 'unauthorized' }
  }

  try {
    switch (action) {
      // ============ 数据概览 ============
      case 'dashboard': {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)

        const [totalStores, totalOrders, totalUsers, todayOrders, allOrders, weekOrders, pendingMerchants, pendingOrders] = await Promise.all([
          db.collection('stores').count(),
          db.collection('orders').count(),
          db.collection('users').count(),
          db.collection('orders').where({ createdAt: _.gte(today) }).count(),
          db.collection('orders').where({ createdAt: _.gte(today) }).get(),
          db.collection('orders').where({ createdAt: _.gte(weekAgo) }).count(),
          db.collection('merchants').where({ status: 0 }).count(),
          db.collection('orders').where({ status: 'pending' }).count()
        ])

        const todayRevenue = allOrders.data
          .filter(o => o.status === 'paid' || o.status === 'completed')
          .reduce((sum, o) => sum + (o.totalPrice || 0), 0)

        // 按类型统计店铺
        const storeTypes = await Promise.all([
          db.collection('stores').where({ type: 'hotel', status: 1 }).count(),
          db.collection('stores').where({ type: 'food', status: 1 }).count(),
          db.collection('stores').where({ type: 'travel', status: 1 }).count(),
          db.collection('products').where({ status: 1 }).count()
        ])

        return {
          code: 0,
          data: {
            totalStores: totalStores.total,
            totalOrders: totalOrders.total,
            totalUsers: totalUsers.total,
            todayOrders: todayOrders.total,
            todayRevenue: todayRevenue.toFixed(2),
            weekOrders: weekOrders.total,
            pendingMerchants: pendingMerchants.total,
            pendingOrders: pendingOrders.total,
            storeTypeStats: {
              hotel: storeTypes[0].total,
              food: storeTypes[1].total,
              travel: storeTypes[2].total,
              product: storeTypes[3].total
            }
          }
        }
      }

      // ============ 商家管理 ============
      case 'merchantList': {
        const { page = 1, status, keyword } = params
        let query = db.collection('merchants')
        let where = {}
        if (status !== undefined && status !== '') where.status = Number(status)
        if (keyword) where.name = db.RegExp({ regexp: keyword, options: 'i' })
        if (Object.keys(where).length) query = query.where(where)
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'merchantAudit': {
        const { merchantId, status } = params
        await db.collection('merchants').doc(merchantId).update({ data: { status: Number(status), updatedAt: db.serverDate() } })
        // 同步更新 stores 集合
        const merchant = await db.collection('merchants').doc(merchantId).get()
        if (merchant.data && merchant.data.storeId) {
          await db.collection('stores').doc(merchant.data.storeId).update({ data: { status: Number(status), updatedAt: db.serverDate() } }).catch(() => {})
        }
        return { code: 0, msg: '操作成功' }
      }

      case 'merchantBatchAudit': {
        const { merchantIds, status } = params
        if (!merchantIds || !merchantIds.length) return { code: -1, msg: '请选择商家' }
        for (const id of merchantIds) {
          await db.collection('merchants').doc(id).update({ data: { status: Number(status), updatedAt: db.serverDate() } }).catch(() => {})
          const m = await db.collection('merchants').doc(id).get().catch(() => null)
          if (m && m.data && m.data.storeId) {
            await db.collection('stores').doc(m.data.storeId).update({ data: { status: Number(status), updatedAt: db.serverDate() } }).catch(() => {})
          }
        }
        return { code: 0, msg: `已批量操作 ${merchantIds.length} 个商家` }
      }

      case 'merchantDetail': {
        const merchant = await db.collection('merchants').doc(params.merchantId).get()
        const m = merchant.data
        // 获取关联的订单
        const storeId = m.storeId || m._id
        const orderCount = await db.collection('orders').where({ storeId }).count()
        const recentOrders = await db.collection('orders').where({ storeId }).orderBy('createdAt', 'desc').limit(5).get()
        // 获取关联的评价
        const reviewCount = await db.collection('reviews').where({ storeId }).count()
        return {
          code: 0,
          data: {
            ...m,
            orderCount: orderCount.total,
            reviewCount: reviewCount.total,
            recentOrders: recentOrders.data
          }
        }
      }

      // ============ 订单管理 ============
      case 'orderList': {
        const { page = 1, status, keyword, type } = params
        let where = {}
        if (status && status !== 'all') where.status = status
        if (type) where.type = type
        if (keyword) where.orderNo = db.RegExp({ regexp: keyword, options: 'i' })
        let query = db.collection('orders')
        if (Object.keys(where).length) query = query.where(where)
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'orderDetail': {
        const res = await db.collection('orders').doc(params.orderId).get()
        return { code: 0, data: res.data }
      }

      case 'orderUpdate': {
        const { orderId, data } = params
        await db.collection('orders').doc(orderId).update({ data: { ...data, updatedAt: db.serverDate() } })
        return { code: 0, msg: '更新成功' }
      }

      // ============ 店铺管理 ============
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
        return { code: 0, msg: '更新成功' }
      }

      case 'storeDetail': {
        const store = await db.collection('stores').doc(params.storeId).get()
        const s = store.data
        // 关联数据
        const [orderCount, reviewCount, roomCount, productCount] = await Promise.all([
          db.collection('orders').where({ storeId: s._id }).count(),
          db.collection('reviews').where({ storeId: s._id }).count(),
          db.collection('rooms').where({ storeId: s._id, status: _.neq(-1) }).count(),
          db.collection('products').where({ storeId: s._id, status: _.neq(-1) }).count()
        ])
        return {
          code: 0,
          data: {
            ...s,
            orderCount: orderCount.total,
            reviewCount: reviewCount.total,
            roomCount: roomCount.total,
            productCount: productCount.total
          }
        }
      }

      // ============ 商品管理 ============
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
        return { code: 0, msg: '更新成功' }
      }

      case 'productDetail': {
        const res = await db.collection('products').doc(params.productId).get()
        return { code: 0, data: res.data }
      }

      // ============ 轮播图管理 ============
      case 'bannerList': {
        const res = await db.collection('banners').orderBy('sort', 'asc').get()
        return { code: 0, data: res.data }
      }

      case 'bannerAdd': {
        await db.collection('banners').add({ data: { ...params.bannerData, createdAt: db.serverDate() } })
        return { code: 0, msg: '添加成功' }
      }

      case 'bannerUpdate': {
        const { bannerId, data } = params
        await db.collection('banners').doc(bannerId).update({ data: { ...data, updatedAt: db.serverDate() } })
        return { code: 0, msg: '更新成功' }
      }

      case 'bannerDelete': {
        await db.collection('banners').doc(params.bannerId).remove()
        return { code: 0, msg: '删除成功' }
      }

      // ============ 用户管理 ============
      case 'userList': {
        const { page = 1, keyword } = params
        let query = db.collection('users')
        if (keyword) query = query.where({ nickName: db.RegExp({ regexp: keyword, options: 'i' }) })
        const res = await query.orderBy('createdAt', 'desc').skip((page - 1) * 20).limit(20).get()
        const total = await query.count()
        return { code: 0, data: res.data, total: total.total }
      }

      case 'userDetail': {
        const user = await db.collection('users').doc(params.userId).get()
        const u = user.data
        const orderCount = await db.collection('orders').where({ openid: u.openid }).count()
        const reviewCount = await db.collection('reviews').where({ openid: u.openid }).count()
        const recentOrders = await db.collection('orders').where({ openid: u.openid }).orderBy('createdAt', 'desc').limit(5).get()
        return {
          code: 0,
          data: { ...u, orderCount: orderCount.total, reviewCount: reviewCount.total, recentOrders: recentOrders.data }
        }
      }

      // ============ 评价管理 ============
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
        return { code: 0, msg: '已隐藏' }
      }

      case 'reviewShow': {
        await db.collection('reviews').doc(params.reviewId).update({ data: { status: 1, updatedAt: db.serverDate() } })
        return { code: 0, msg: '已显示' }
      }

      case 'reviewDelete': {
        const review = await db.collection('reviews').doc(params.reviewId).get()
        await db.collection('reviews').doc(params.reviewId).remove()
        // 更新店铺评分
        if (review.data && review.data.storeId) {
          await updateStoreRating(review.data.storeId)
        }
        return { code: 0, msg: '已删除' }
      }

      case 'reviewDetail': {
        const res = await db.collection('reviews').doc(params.reviewId).get()
        return { code: 0, data: res.data }
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

        // 近30天评价趋势
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const recentReviews = reviews.filter(r => new Date(r.createdAt) >= thirtyDaysAgo)
        const trend = {}
        for (let i = 0; i < 30; i++) {
          const d = new Date(thirtyDaysAgo)
          d.setDate(d.getDate() + i)
          const key = d.toISOString().slice(0, 10)
          trend[key] = { date: key, count: 0, avgRating: 0 }
        }
        recentReviews.forEach(r => {
          const key = new Date(r.createdAt).toISOString().slice(0, 10)
          if (trend[key]) {
            trend[key].count++
            trend[key].avgRating += r.rating
          }
        })
        Object.values(trend).forEach(t => {
          if (t.count > 0) t.avgRating = (t.avgRating / t.count).toFixed(1)
        })

        return { code: 0, data: { total, avgRating, ratingDist, hidden, byType, trend: Object.values(trend) } }
      }

      // ============ 消息推送 ============
      case 'notifySend': {
        const { orderId, notifyType } = params
        const res = await cloud.callFunction({ name: 'notify', data: { action: 'sendOrderNotify', orderId, notifyType } })
        return res.result
      }

      case 'notifyBatchSend': {
        const { orderIds, notifyType: nType } = params
        const results = []
        // 批量发送，每批间隔 100ms 避免限流
        for (const oid of (orderIds || [])) {
          try {
            const res = await cloud.callFunction({ name: 'notify', data: { action: 'sendOrderNotify', orderId: oid, notifyType: nType } })
            results.push({ orderId: oid, ...res.result })
          } catch (e) {
            results.push({ orderId: oid, code: -1, msg: e.message })
          }
          await new Promise(r => setTimeout(r, 100))
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

        // 今日推送数
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayCount = logs.filter(l => new Date(l.createdAt) >= today).length

        return { code: 0, data: { total, success, failed, byType, todayCount } }
      }

      // ============ 数据导出 ============
      case 'exportOrders': {
        const { status, type, startDate, endDate } = params
        let where = {}
        if (status && status !== 'all') where.status = status
        if (type) where.type = type
        if (startDate || endDate) {
          where.createdAt = {}
          if (startDate) where.createdAt = _.gte(new Date(startDate))
          if (endDate) {
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            where.createdAt = startDate ? _.and(where.createdAt, _.lte(end)) : _.lte(end)
          }
        }
        let query = db.collection('orders')
        if (Object.keys(where).length) query = query.where(where)
        const orders = await query.orderBy('createdAt', 'desc').limit(500).get()

        const csvHeader = '订单号,类型,店铺,金额,状态,下单时间\n'
        const typeMap = { hotel: '酒店民宿', food: '美食', travel: '游玩', product: '特产' }
        const statusMap = { pending: '待支付', paid: '已支付', completed: '已完成', cancelled: '已取消', rejected: '已拒绝' }
        const csvRows = orders.data.map(o =>
          `${o.orderNo},${typeMap[o.type] || o.type},${o.storeName || ''},${o.totalPrice},${statusMap[o.status] || o.status},${new Date(o.createdAt).toLocaleString('zh-CN')}`
        ).join('\n')

        return { code: 0, csv: csvHeader + csvRows, total: orders.data.length }
      }

      case 'exportMerchants': {
        const merchants = await db.collection('merchants').orderBy('createdAt', 'desc').limit(500).get()
        const csvHeader = '店铺名称,类型,联系人,电话,地址,状态,注册时间\n'
        const typeMap = { hotel: '酒店民宿', food: '美食', travel: '游玩', product: '特产' }
        const statusMap = { 0: '待审核', 1: '已通过', 2: '已禁用', 3: '已拒绝' }
        const csvRows = merchants.data.map(m =>
          `${m.name},${typeMap[m.type] || m.type},${m.contactName || ''},${m.phone || ''},${m.address || ''},${statusMap[m.status] || m.status},${new Date(m.createdAt).toLocaleString('zh-CN')}`
        ).join('\n')
        return { code: 0, csv: csvHeader + csvRows, total: merchants.data.length }
      }

      // ============ 系统设置 ============
      case 'changePassword': {
        if (params.oldPassword !== ADMIN_PASSWORD) return { code: -1, msg: '原密码错误' }
        if (!params.newPassword || params.newPassword.length < 6) return { code: -1, msg: '新密码至少6位' }
        // 持久化到数据库
        try {
          await db.collection('admin_config').doc('password').update({
            data: { value: params.newPassword, updatedAt: db.serverDate() }
          })
        } catch (e) {
          await db.collection('admin_config').add({
            data: { _id: 'password', value: params.newPassword, createdAt: db.serverDate() }
          })
        }
        ADMIN_PASSWORD = params.newPassword
        return { code: 0, msg: '密码修改成功' }
      }

      default:
        return { code: -1, msg: '未知操作' }
    }
  } catch (e) {
    console.error('Admin error:', e)
    return { code: -1, msg: e.message || '服务器错误' }
  }
}

// 更新店铺评分
async function updateStoreRating(storeId) {
  const reviews = await db.collection('reviews').where({ storeId, status: 1 }).get()
  if (reviews.data.length === 0) {
    await db.collection('stores').doc(storeId).update({ data: { score: 0, reviewCount: 0 } }).catch(() => {})
    return
  }
  const avgRating = reviews.data.reduce((sum, r) => sum + r.rating, 0) / reviews.data.length
  await db.collection('stores').doc(storeId).update({
    data: { score: Number(avgRating.toFixed(1)), reviewCount: reviews.data.length }
  }).catch(() => {})
}
