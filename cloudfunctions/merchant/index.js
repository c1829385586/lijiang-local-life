// cloudfunctions/merchant/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (action) {
    // ============ 商户认证 ============
    case 'login':
      return await merchantLogin(event, openid)
    case 'check':
      return await checkLogin(openid)
    case 'register':
      return await registerMerchant(event.merchant, openid)

    // ============ 店铺管理 ============
    case 'updateStore':
      return await updateStore(event.storeData, openid)
    case 'getStore':
      return await getStore(openid)

    // ============ 房型管理（酒店） ============
    case 'addRoom':
      return await addRoom(event.roomData, openid)
    case 'updateRoom':
      return await updateRoom(event.roomId, event.roomData, openid)
    case 'deleteRoom':
      return await deleteRoom(event.roomId, openid)
    case 'listRooms':
      return await listRooms(openid)

    // ============ 商品管理 ============
    case 'addProduct':
      return await addProduct(event.productData, openid)
    case 'updateProduct':
      return await updateProduct(event.productId, event.productData, openid)
    case 'deleteProduct':
      return await deleteProduct(event.productId, openid)
    case 'listProducts':
      return await listProducts(openid)

    // ============ 订单管理 ============
    case 'handleOrder':
      return await handleOrder(event.orderId, event.status, openid)
    case 'merchantOrders':
      return await getMerchantOrders(openid, event.status, event.page || 1)

    // ============ 数据统计 ============
    case 'stats':
      return await getStats(openid, event.days || 7)

    default:
      return { code: -1, msg: '未知操作' }
  }
}

// ============ 商户认证 ============

async function merchantLogin(event, openid) {
  // 检查是否已注册
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length > 0) {
    return { code: 0, merchant: merchant.data[0] }
  }
  return { code: -1, msg: '请先注册商户' }
}

async function checkLogin(openid) {
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length > 0) {
    return { code: 0, merchant: merchant.data[0] }
  }
  return { code: -1, msg: '未注册' }
}

async function registerMerchant(merchantData, openid) {
  // 检查是否已注册
  const existing = await db.collection('merchants').where({ openid }).get()
  if (existing.data.length > 0) {
    return { code: -1, msg: '已注册，无需重复注册' }
  }

  const merchant = {
    openid,
    name: merchantData.name,
    type: merchantData.type, // hotel / food / travel / product
    phone: merchantData.phone,
    contactName: merchantData.contactName,
    address: merchantData.address,
    latitude: merchantData.latitude,
    longitude: merchantData.longitude,
    description: merchantData.description || '',
    images: merchantData.images || [],
    tags: merchantData.tags || [],
    status: 0, // 0=待审核 1=营业中 2=已歇业 3=审核拒绝
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // 同时在 stores 集合创建店铺记录
  const storeResult = await db.collection('stores').add({
    data: {
      ...merchant,
      merchantOpenid: openid,
      score: 0,
      minPrice: 0,
      sales: 0
    }
  })

  const result = await db.collection('merchants').add({
    data: { ...merchant, storeId: storeResult._id }
  })

  return {
    code: 0,
    msg: '注册成功，等待审核',
    merchant: { _id: result._id, ...merchant }
  }
}

// ============ 店铺管理 ============

async function updateStore(storeData, openid) {
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length === 0) {
    return { code: -1, msg: '商户不存在' }
  }

  const m = merchant.data[0]
  await db.collection('merchants').doc(m._id).update({
    data: { ...storeData, updatedAt: new Date() }
  })

  // 同步更新 stores 集合
  if (m.storeId) {
    await db.collection('stores').doc(m.storeId).update({
      data: { ...storeData, updatedAt: new Date() }
    })
  }

  return { code: 0, msg: '更新成功' }
}

async function getStore(openid) {
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length === 0) {
    return { code: -1, msg: '商户不存在' }
  }
  return { code: 0, data: merchant.data[0] }
}

// ============ 房型管理 ============

async function addRoom(roomData, openid) {
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length === 0) return { code: -1, msg: '商户不存在' }

  const room = {
    storeId: merchant.data[0].storeId || merchant.data[0]._id,
    name: roomData.name,
    image: roomData.image,
    images: roomData.images || [],
    description: roomData.description,
    price: Number(roomData.price),
    stock: Number(roomData.stock),
    facilities: roomData.facilities || [],
    status: 1,
    createdAt: new Date()
  }

  const result = await db.collection('rooms').add({ data: room })
  return { code: 0, roomId: result._id, msg: '添加成功' }
}

async function updateRoom(roomId, roomData, openid) {
  await db.collection('rooms').doc(roomId).update({
    data: { ...roomData, updatedAt: new Date() }
  })
  return { code: 0, msg: '更新成功' }
}

async function deleteRoom(roomId, openid) {
  await db.collection('rooms').doc(roomId).update({
    data: { status: -1, updatedAt: new Date() }
  })
  return { code: 0, msg: '已下架' }
}

async function listRooms(openid) {
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length === 0) return { code: -1, msg: '商户不存在' }

  const storeId = merchant.data[0].storeId || merchant.data[0]._id
  const rooms = await db.collection('rooms').where({
    storeId,
    status: _.neq(-1)
  }).orderBy('createdAt', 'desc').get()

  return { code: 0, data: rooms.data }
}

// ============ 商品管理 ============

async function addProduct(productData, openid) {
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length === 0) return { code: -1, msg: '商户不存在' }

  const product = {
    storeId: merchant.data[0].storeId || merchant.data[0]._id,
    merchantOpenid: openid,
    name: productData.name,
    coverImage: productData.coverImage,
    images: productData.images || [],
    description: productData.description,
    price: Number(productData.price),
    originalPrice: Number(productData.originalPrice) || 0,
    stock: Number(productData.stock),
    category: productData.category || '',
    canDeliverToRoom: productData.canDeliverToRoom !== false, // 默认可送到房间
    sales: 0,
    status: 1,
    createdAt: new Date()
  }

  const result = await db.collection('products').add({ data: product })
  return { code: 0, productId: result._id, msg: '添加成功' }
}

async function updateProduct(productId, productData, openid) {
  await db.collection('products').doc(productId).update({
    data: { ...productData, updatedAt: new Date() }
  })
  return { code: 0, msg: '更新成功' }
}

async function deleteProduct(productId, openid) {
  await db.collection('products').doc(productId).update({
    data: { status: -1, updatedAt: new Date() }
  })
  return { code: 0, msg: '已下架' }
}

async function listProducts(openid) {
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length === 0) return { code: -1, msg: '商户不存在' }

  const storeId = merchant.data[0].storeId || merchant.data[0]._id
  const products = await db.collection('products').where({
    storeId,
    status: _.neq(-1)
  }).orderBy('createdAt', 'desc').get()

  return { code: 0, data: products.data }
}

// ============ 订单管理 ============

async function handleOrder(orderId, status, openid) {
  // 验证订单属于该商户
  const order = await db.collection('orders').doc(orderId).get()
  const merchant = await db.collection('merchants').where({ openid }).get()

  if (merchant.data.length === 0) return { code: -1, msg: '商户不存在' }

  const storeId = merchant.data[0].storeId || merchant.data[0]._id
  if (order.data.storeId !== storeId) {
    return { code: -1, msg: '无权操作此订单' }
  }

  await db.collection('orders').doc(orderId).update({
    data: { status, updatedAt: new Date() }
  })

  // 商户操作后通知用户
  if (status === 'completed') {
    cloud.callFunction({
      name: 'notify',
      data: { action: 'sendOrderNotify', orderId, notifyType: 'orderCompleted' }
    }).catch(() => {})
  } else if (status === 'rejected' || status === 'cancelled') {
    cloud.callFunction({
      name: 'notify',
      data: { action: 'sendOrderNotify', orderId, notifyType: 'orderCancelled' }
    }).catch(() => {})
  }

  return { code: 0, msg: '操作成功' }
}

async function getMerchantOrders(openid, status, page) {
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length === 0) return { code: -1, msg: '商户不存在' }

  const storeId = merchant.data[0].storeId || merchant.data[0]._id
  const pageSize = 20

  let query = { storeId }
  if (status && status !== 'all') {
    query.status = status
  }

  const countResult = await db.collection('orders').where(query).count()
  const orders = await db.collection('orders')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    code: 0,
    data: orders.data,
    total: countResult.total,
    page,
    hasMore: page * pageSize < countResult.total
  }
}

// ============ 数据统计 ============

async function getStats(openid, days) {
  const merchant = await db.collection('merchants').where({ openid }).get()
  if (merchant.data.length === 0) return { code: -1, msg: '商户不存在' }

  const storeId = merchant.data[0].storeId || merchant.data[0]._id
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const orders = await db.collection('orders').where({
    storeId,
    createdAt: _.gte(startDate)
  }).get()

  const orderList = orders.data
  const totalOrders = orderList.length
  const paidOrders = orderList.filter(o => o.status === 'paid' || o.status === 'completed')
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)

  // 按天统计
  const dailyStats = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    dailyStats[key] = { date: key, orders: 0, revenue: 0 }
  }

  orderList.forEach(order => {
    const key = order.createdAt.toISOString().slice(0, 10)
    if (dailyStats[key]) {
      dailyStats[key].orders++
      if (order.status === 'paid' || order.status === 'completed') {
        dailyStats[key].revenue += order.totalPrice || 0
      }
    }
  })

  return {
    code: 0,
    data: {
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      paidOrders: paidOrders.length,
      conversionRate: totalOrders > 0 ? (paidOrders.length / totalOrders * 100).toFixed(1) : '0',
      dailyStats: Object.values(dailyStats)
    }
  }
}
