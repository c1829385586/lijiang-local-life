const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (action) {
    case 'create':
      return await createReview(event.reviewData, openid)
    case 'list':
      return await getStoreReviews(event.storeId, event.page || 1)
    case 'myList':
      return await getMyReviews(openid, event.page || 1)
    case 'detail':
      return await getReviewDetail(event.reviewId)
    case 'reply':
      return await replyReview(event.reviewId, event.reply, openid)
    case 'canReview':
      return await canReview(event.orderId, openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 检查是否可以评价（订单必须已完成且未评价过）
async function canReview(orderId, openid) {
  const order = await db.collection('orders').doc(orderId).get()

  if (order.data.openid !== openid) {
    return { code: -1, msg: '无权操作' }
  }
  if (order.data.status !== 'completed') {
    return { code: -1, msg: '订单未完成，暂不能评价' }
  }
  if (order.data.hasReviewed) {
    return { code: -1, msg: '该订单已评价' }
  }

  return { code: 0, canReview: true, order: order.data }
}

// 创建评价
async function createReview(reviewData, openid) {
  // 验证订单
  const order = await db.collection('orders').doc(reviewData.orderId).get()

  if (order.data.openid !== openid) {
    return { code: -1, msg: '无权操作' }
  }
  if (order.data.status !== 'completed') {
    return { code: -1, msg: '订单未完成' }
  }
  if (order.data.hasReviewed) {
    return { code: -1, msg: '已评价过' }
  }

  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  const user = userRes.data[0] || {}

  const review = {
    orderId: reviewData.orderId,
    orderNo: order.data.orderNo,
    openid,
    nickName: user.nickName || '匿名用户',
    avatarUrl: user.avatarUrl || '',
    storeId: order.data.storeId,
    storeName: order.data.storeName,
    type: order.data.type,
    rating: Math.min(5, Math.max(1, Number(reviewData.rating) || 5)),
    content: reviewData.content || '',
    images: reviewData.images || [],
    tags: reviewData.tags || [],
    reply: '',
    replyAt: null,
    status: 1, // 1=显示 0=隐藏
    createdAt: new Date()
  }

  const result = await db.collection('reviews').add({ data: review })

  // 标记订单已评价
  await db.collection('orders').doc(reviewData.orderId).update({
    data: { hasReviewed: true, updatedAt: new Date() }
  })

  // 更新店铺评分
  await updateStoreRating(order.data.storeId)

  return { code: 0, msg: '评价成功', reviewId: result._id }
}

// 获取店铺评价列表
async function getStoreReviews(storeId, page) {
  const pageSize = 10
  const query = { storeId, status: 1 }

  const countRes = await db.collection('reviews').where(query).count()
  const reviews = await db.collection('reviews')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 统计各星级数量
  const allReviews = await db.collection('reviews').where(query).get()
  const ratingStats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let totalRating = 0
  allReviews.data.forEach(r => {
    ratingStats[r.rating] = (ratingStats[r.rating] || 0) + 1
    totalRating += r.rating
  })

  const avgRating = allReviews.data.length > 0
    ? (totalRating / allReviews.data.length).toFixed(1)
    : 0

  return {
    code: 0,
    data: reviews.data,
    total: countRes.total,
    avgRating,
    ratingStats,
    hasMore: page * pageSize < countRes.total
  }
}

// 获取我的评价列表
async function getMyReviews(openid, page) {
  const pageSize = 10
  const countRes = await db.collection('reviews').where({ openid }).count()
  const reviews = await db.collection('reviews')
    .where({ openid })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    code: 0,
    data: reviews.data,
    total: countRes.total,
    hasMore: page * pageSize < countRes.total
  }
}

// 获取评价详情
async function getReviewDetail(reviewId) {
  const res = await db.collection('reviews').doc(reviewId).get()
  return { code: 0, data: res.data }
}

// 商户回复评价
async function replyReview(reviewId, reply, openid) {
  const review = await db.collection('reviews').doc(reviewId).get()

  // 验证是否是该商户的评价
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length === 0) {
    return { code: -1, msg: '商户不存在' }
  }

  const storeId = merchant.data[0].storeId || merchant.data[0]._id
  if (review.data.storeId !== storeId) {
    return { code: -1, msg: '无权回复此评价' }
  }

  await db.collection('reviews').doc(reviewId).update({
    data: { reply, replyAt: new Date() }
  })

  return { code: 0, msg: '回复成功' }
}

// 更新店铺评分
async function updateStoreRating(storeId) {
  const reviews = await db.collection('reviews').where({
    storeId,
    status: 1
  }).get()

  if (reviews.data.length === 0) return

  const avgRating = reviews.data.reduce((sum, r) => sum + r.rating, 0) / reviews.data.length

  await db.collection('stores').doc(storeId).update({
    data: { score: Number(avgRating.toFixed(1)), reviewCount: reviews.data.length }
  }).catch(() => {})
}
