// cloudfunctions/pay/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 微信支付云函数
 * 
 * ⚠️ 当前状态：未配置商户号，使用模拟支付
 * 
 * 后续开通微信支付后需要：
 * 1. 在微信商户平台获取 mchId（商户号）
 * 2. 在商户平台设置 API 密钥
 * 3. 将商户号关联到小程序
 * 4. 在云开发环境开启支付能力
 * 5. 将下方 unifiedOrder 中的模拟逻辑替换为真实支付调用
 * 
 * 参考文档：https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_5_1.shtml
 */

exports.main = async (event, context) => {
  const { action } = event

  switch (action) {
    case 'unifiedOrder':
      return await unifiedOrder(event)
    case 'queryOrder':
      return await queryOrder(event.orderNo)
    case 'refund':
      return await refund(event)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 统一下单
async function unifiedOrder({ body, orderNo, totalFee, openid, orderId }) {
  /**
   * ============================================
   * 当前：模拟支付（未配置商户号时使用）
   * 开通微信支付后，取消下方注释，替换为真实逻辑
   * ============================================
   */

  // --- 模拟支付（开发阶段）---
  // 直接将订单状态标记为已支付
  const db = cloud.database()
  await db.collection('orders').doc(orderId).update({
    data: { status: 'paid', paidAt: new Date(), updatedAt: new Date() }
  })

  return {
    code: 0,
    mock: true, // 标记为模拟支付
    msg: '模拟支付成功（未配置商户号）'
  }

  /**
   * ============================================
   * 开通微信支付后，取消下方注释，删除上方模拟代码
   * ============================================
   */
  // try {
  //   const payment = await cloud.callFunction({
  //     name: 'wxpay3',
  //     data: {
  //       description: body,
  //       out_trade_no: orderNo,
  //       amount: {
  //         total: totalFee,
  //         currency: 'CNY'
  //       },
  //       payer: { openid },
  //       attach: JSON.stringify({ orderId })
  //     }
  //   })
  //   return { code: 0, payment: payment.result }
  // } catch (e) {
  //   console.error('统一下单失败', e)
  //   return { code: -1, msg: '支付下单失败', error: e.message }
  // }
}

// 查询订单
async function queryOrder(orderNo) {
  try {
    const result = await cloud.callFunction({
      name: 'wxpay3',
      data: {
        action: 'query',
        out_trade_no: orderNo
      }
    })
    return { code: 0, data: result.result }
  } catch (e) {
    return { code: -1, msg: '查询失败', error: e.message }
  }
}

// 退款
async function refund({ orderNo, refundNo, totalFee, refundFee, reason }) {
  try {
    const result = await cloud.callFunction({
      name: 'wxpay3',
      data: {
        action: 'refund',
        out_trade_no: orderNo,
        out_refund_no: refundNo,
        reason: reason || '用户申请退款',
        amount: {
          refund: refundFee,
          total: totalFee,
          currency: 'CNY'
        }
      }
    })
    return { code: 0, data: result.result }
  } catch (e) {
    return { code: -1, msg: '退款失败', error: e.message }
  }
}
