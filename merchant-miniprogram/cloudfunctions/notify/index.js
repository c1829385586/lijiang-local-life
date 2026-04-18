const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 订阅消息模板ID —— 在微信公众平台 → 订阅消息 中获取并替换
const TEMPLATE_IDS = {
  orderPaid: 'TMPL_ORDER_PAID',       // 订单支付成功通知
  orderCompleted: 'TMPL_ORDER_COMPLETED', // 订单完成通知
  orderCancelled: 'TMPL_ORDER_CANCELLED', // 订单取消通知
  merchantNewOrder: 'TMPL_NEW_ORDER',    // 商户新订单通知
}

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (action) {
    // 用户订阅消息
    case 'subscribe':
      return await saveSubscribeInfo(openid, event.templateIds)
    // 发送订单通知（内部调用）
    case 'sendOrderNotify':
      return await sendOrderNotify(event.orderId, event.notifyType)
    // 发送商户通知（新订单）
    case 'sendMerchantNotify':
      return await sendMerchantNotify(event.orderId)
    // 查询通知日志
    case 'getNotifyLogs':
      return await getNotifyLogs(event.filters, event.page)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 保存用户的订阅消息状态
async function saveSubscribeInfo(openid, templateIds) {
  const now = new Date()
  const existing = await db.collection('user_subscribes').where({ openid }).get()

  if (existing.data.length > 0) {
    await db.collection('user_subscribes').doc(existing.data[0]._id).update({
      data: {
        templateIds: templateIds || [],
        subscribedAt: now,
        updatedAt: now
      }
    })
  } else {
    await db.collection('user_subscribes').add({
      data: {
        openid,
        templateIds: templateIds || [],
        subscribedAt: now,
        createdAt: now
      }
    })
  }

  return { code: 0, msg: '订阅成功' }
}

// 发送订单状态变更通知给用户
async function sendOrderNotify(orderId, notifyType) {
  try {
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    const templateId = TEMPLATE_IDS[notifyType]
    if (!templateId) {
      return { code: -1, msg: '未知通知类型' }
    }

    // 构造消息内容
    let page = 'pages/order/order'
    let data = {}

    if (notifyType === 'orderPaid') {
      page = `pages/order-detail/order-detail?id=${orderId}`
      data = {
        thing1: { value: order.storeName || '丽江本地生活' },       // 店铺名称
        character_string2: { value: order.orderNo },                 // 订单号
        thing3: { value: getOrderTypeName(order.type) },             // 订单类型
        amount4: { value: `¥${order.totalPrice}` },                  // 订单金额
        thing5: { value: '订单支付成功，请等待商户确认' }              // 状态
      }
    } else if (notifyType === 'orderCompleted') {
      page = `pages/order-detail/order-detail?id=${orderId}`
      data = {
        thing1: { value: order.storeName || '丽江本地生活' },
        character_string2: { value: order.orderNo },
        thing3: { value: getOrderTypeName(order.type) },
        amount4: { value: `¥${order.totalPrice}` },
        thing5: { value: '订单已完成，感谢您的支持' }
      }
    } else if (notifyType === 'orderCancelled') {
      page = 'pages/order/order'
      data = {
        thing1: { value: order.storeName || '丽江本地生活' },
        character_string2: { value: order.orderNo },
        thing3: { value: getOrderTypeName(order.type) },
        amount4: { value: `¥${order.totalPrice}` },
        thing5: { value: '订单已取消' }
      }
    }

    const result = await cloud.openapi.subscribeMessage.send({
      touser: order.openid,
      templateId,
      page,
      data
    })

    // 记录发送日志
    await db.collection('notify_logs').add({
      data: {
        openid: order.openid,
        orderId,
        orderNo: order.orderNo,
        type: notifyType,
        templateId,
        status: 'success',
        result: JSON.stringify(result),
        createdAt: new Date()
      }
    })

    return { code: 0, msg: '通知发送成功' }
  } catch (e) {
    console.error('发送通知失败:', e)

    // 记录失败日志
    await db.collection('notify_logs').add({
      data: {
        orderId,
        type: notifyType,
        status: 'failed',
        error: e.message,
        createdAt: new Date()
      }
    }).catch(() => {})

    // 用户未订阅或模板不对，静默失败
    if (e.errCode === 43101) {
      return { code: 0, msg: '用户未授权订阅消息，跳过' }
    }
    return { code: -1, msg: '通知发送失败', error: e.message }
  }
}

// 发送新订单通知给商户
async function sendMerchantNotify(orderId) {
  try {
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    // 查找商户openid
    const merchantRes = await db.collection('merchants').where({
      storeId: order.storeId
    }).get()

    if (merchantRes.data.length === 0) {
      return { code: -1, msg: '商户不存在' }
    }

    const merchant = merchantRes.data[0]
    const templateId = TEMPLATE_IDS.merchantNewOrder

    const result = await cloud.openapi.subscribeMessage.send({
      touser: merchant.openid,
      templateId,
      page: `pages/order-detail/order-detail?id=${orderId}`,
      data: {
        thing1: { value: order.storeName },                    // 店铺名称
        character_string2: { value: order.orderNo },           // 订单号
        thing3: { value: getOrderTypeName(order.type) },       // 订单类型
        amount4: { value: `¥${order.totalPrice}` },            // 订单金额
        thing5: { value: '您有新订单，请及时处理' }               // 提醒
      }
    })

    await db.collection('notify_logs').add({
      data: {
        openid: merchant.openid,
        role: 'merchant',
        orderId,
        orderNo: order.orderNo,
        type: 'merchantNewOrder',
        templateId,
        status: 'success',
        createdAt: new Date()
      }
    })

    return { code: 0, msg: '商户通知发送成功' }
  } catch (e) {
    console.error('发送商户通知失败:', e)
    if (e.errCode === 43101) {
      return { code: 0, msg: '商户未授权订阅消息，跳过' }
    }
    return { code: -1, msg: '通知发送失败', error: e.message }
  }
}

// 查询通知日志
async function getNotifyLogs(filters = {}, page = 1) {
  const pageSize = 20
  let query = {}
  if (filters.type) query.type = filters.type
  if (filters.status) query.status = filters.status
  if (filters.orderNo) query.orderNo = db.RegExp({ regexp: filters.orderNo, options: 'i' })

  const countRes = await db.collection('notify_logs').where(query).count()
  const logs = await db.collection('notify_logs')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    code: 0,
    data: logs.data,
    total: countRes.total
  }
}

// 订单类型中文名
function getOrderTypeName(type) {
  const map = { hotel: '酒店民宿', food: '美食', travel: '周边游玩', product: '特产零食' }
  return map[type] || '商品'
}
