// cloudfunctions/order/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口
exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (action) {
    case 'create':
      return await createOrder(event.orderData, openid)
    case 'list':
      return await getOrderList(event.status, openid, event.page || 1)
    case 'detail':
      return await getOrderDetail(event.orderId)
    case 'cancel':
      return await cancelOrder(event.orderId, openid)
    case 'confirm':
      return await confirmOrder(event.orderId, openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 创建订单 + 发起支付
async function createOrder(orderData, openid) {
  const orderNo = generateOrderNo()
  const now = new Date()

  const order = {
    orderNo,
    openid,
    type: orderData.type, // hotel / food / product / travel
    status: 'pending', // pending / paid / completed / cancelled / refunded
    storeId: orderData.storeId,
    storeName: orderData.storeName,
    totalPrice: orderData.totalPrice,
    remark: orderData.remark || '',
    createdAt: now,
    updatedAt: now,
    // 酒店特有
    roomId: orderData.roomId || '',
    roomName: orderData.roomName || '',
    checkInDate: orderData.checkInDate || '',
    checkOutDate: orderData.checkOutDate || '',
    nights: orderData.nights || 0,
    guestName: orderData.guestName || '',
    guestPhone: orderData.guestPhone || '',
    // 商品特有
    products: orderData.products || [],
    quantity: orderData.quantity || 1,
    address: orderData.address || null,
    coverImage: orderData.coverImage || ''
  }

  // 写入订单
  const result = await db.collection('orders').add({ data: order })

  // 通知商户有新订单（异步，不阻塞主流程）
  cloud.callFunction({
    name: 'notify',
    data: { action: 'sendMerchantNotify', orderId: result._id }
  }).catch(e => console.error('通知商户失败:', e))

  // 调用微信支付
  try {
    const payment = await cloud.callFunction({
      name: 'pay',
      data: {
        action: 'unifiedOrder',
        body: `${order.storeName} - 订单`,
        orderNo,
        totalFee: Math.round(order.totalPrice * 100), // 分为单位
        openid,
        orderId: result._id
      }
    })

    return {
      code: 0,
      orderId: result._id,
      orderNo,
      payment: payment.result.payment
    }
  } catch (e) {
    console.error('支付下单失败', e)
    return { code: -1, msg: '支付下单失败', error: e.message }
  }
}

// 获取订单列表
async function getOrderList(status, openid, page) {
  const pageSize = 10
  let query = { openid }
  if (status && status !== 'all') {
    query.status = status
  }

  const countResult = await db.collection('orders').where(query).count()
  const listResult = await db.collection('orders')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    code: 0,
    data: listResult.data,
    total: countResult.total,
    page,
    hasMore: page * pageSize < countResult.total
  }
}

// 获取订单详情
async function getOrderDetail(orderId) {
  const result = await db.collection('orders').doc(orderId).get()
  return { code: 0, data: result.data }
}

// 取消订单
async function cancelOrder(orderId, openid) {
  const order = await db.collection('orders').doc(orderId).get()
  if (order.data.openid !== openid) {
    return { code: -1, msg: '无权操作' }
  }
  if (order.data.status !== 'pending') {
    return { code: -1, msg: '该订单无法取消' }
  }

  await db.collection('orders').doc(orderId).update({
    data: { status: 'cancelled', updatedAt: new Date() }
  })

  // 通知用户订单取消
  cloud.callFunction({
    name: 'notify',
    data: { action: 'sendOrderNotify', orderId, notifyType: 'orderCancelled' }
  }).catch(() => {})

  return { code: 0, msg: '已取消' }
}

// 确认收货/入住
async function confirmOrder(orderId, openid) {
  const order = await db.collection('orders').doc(orderId).get()
  if (order.data.openid !== openid) {
    return { code: -1, msg: '无权操作' }
  }

  await db.collection('orders').doc(orderId).update({
    data: { status: 'completed', updatedAt: new Date() }
  })

  // 通知用户订单完成
  cloud.callFunction({
    name: 'notify',
    data: { action: 'sendOrderNotify', orderId, notifyType: 'orderCompleted' }
  }).catch(() => {})

  return { code: 0, msg: '已确认' }
}

// 生成订单号
function generateOrderNo() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `LL${date}${random}`
}
