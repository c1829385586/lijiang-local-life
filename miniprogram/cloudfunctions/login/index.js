// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 检查用户是否已存在
    const existing = await db.collection('users').where({ openid }).get()

    if (existing.data.length > 0) {
      // 更新最后登录时间
      await db.collection('users').doc(existing.data[0]._id).update({
        data: { lastLoginAt: new Date() }
      })
      return {
        code: 0,
        openid,
        userInfo: existing.data[0]
      }
    }

    // 新用户，创建记录
    const userInfo = {
      openid,
      nickName: event.nickName || '用户',
      avatarUrl: event.avatarUrl || '',
      gender: event.gender || 0,
      createdAt: new Date(),
      lastLoginAt: new Date()
    }

    await db.collection('users').add({ data: userInfo })

    return {
      code: 0,
      openid,
      userInfo
    }
  } catch (e) {
    console.error('login error:', e)
    return { code: 0, openid, userInfo: { openid } }
  }
}
