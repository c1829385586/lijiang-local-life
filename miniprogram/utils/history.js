// utils/history.js - 浏览历史记录工具
const typeNames = {
  hotel: '酒店民宿',
  food: '美食',
  travel: '周边游玩',
  product: '特产零食'
}

/**
 * 记录浏览历史
 * @param {Object} options - { id, type, name, coverImage }
 */
function addBrowseHistory(options) {
  const { id, type, name, coverImage } = options
  if (!id || !type) return

  let history = wx.getStorageSync('browse_history') || []

  // 去重：如果已存在，移除旧的
  history = history.filter(h => !(h.id === id && h.type === type))

  // 添加到最前面
  const now = new Date()
  const timeStr = formatDate(now)

  history.unshift({
    id,
    type,
    name: name || '未知',
    coverImage: coverImage || '',
    typeName: typeNames[type] || type,
    time: now.getTime(),
    timeStr
  })

  // 最多保留200条
  if (history.length > 200) {
    history = history.slice(0, 200)
  }

  wx.setStorageSync('browse_history', history)
}

function formatDate(date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

module.exports = { addBrowseHistory }
