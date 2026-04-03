// Popup Script

let currentVideoInfo = null

document.addEventListener('DOMContentLoaded', async () => {
  // 检查是否是B站页面
  const isBilibili = await checkBilibiliPage()
  
  if (!isBilibili) {
    document.getElementById('notBili').classList.remove('hidden')
    document.getElementById('mainContent').classList.add('hidden')
    return
  }
  
  document.getElementById('mainContent').classList.remove('hidden')
  document.getElementById('notBili').classList.add('hidden')
  
  // 加载视频信息
  loadVideoInfo()
  
  // 加载下载记录
  loadRecords()
  
  // 绑定按钮事件
  document.getElementById('downloadVideo').addEventListener('click', downloadVideo)
  document.getElementById('downloadCover').addEventListener('click', downloadCover)
  document.getElementById('clearRecords').addEventListener('click', clearRecords)
})

// 检查是否是B站页面
async function checkBilibiliPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab.url && tab.url.includes('bilibili.com/video')
  } catch (err) {
    return false
  }
}

// 加载视频信息
async function loadVideoInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' })
    
    if (response && response.success) {
      currentVideoInfo = response.data
      document.getElementById('videoTitle').textContent = currentVideoInfo.title
      document.getElementById('videoMeta').textContent = currentVideoInfo.upName ? `UP主: ${currentVideoInfo.upName}` : `BVID: ${currentVideoInfo.bvid}`
    }
  } catch (err) {
    console.error('Failed to get video info:', err)
    document.getElementById('videoTitle').textContent = '无法获取视频信息'
  }
}

// 下载视频
async function downloadVideo() {
  const btn = document.getElementById('downloadVideo')
  btn.classList.add('loading')
  btn.querySelector('.label').textContent = '下载中...'
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'downloadVideo' })
    
    if (response && response.success) {
      showToast('视频开始下载！')
      loadRecords()
    } else {
      showToast(response.error || '下载失败', 'error')
    }
  } catch (err) {
    showToast('无法下载视频，请刷新页面重试', 'error')
  } finally {
    btn.classList.remove('loading')
    btn.querySelector('.label').textContent = '下载视频'
  }
}

// 下载封面
async function downloadCover() {
  const btn = document.getElementById('downloadCover')
  btn.classList.add('loading')
  btn.querySelector('.label').textContent = '下载中...'
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'downloadCover' })
    
    if (response && response.success) {
      showToast('封面开始下载！')
      loadRecords()
    } else {
      showToast(response.error || '下载失败', 'error')
    }
  } catch (err) {
    showToast('无法下载封面，请刷新页面重试', 'error')
  } finally {
    btn.classList.remove('loading')
    btn.querySelector('.label').textContent = '下载封面'
  }
}

// 加载下载记录
async function loadRecords() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getRecords' })
    
    if (response && response.success) {
      renderRecords(response.data)
    }
  } catch (err) {
    console.error('Failed to load records:', err)
  }
}

// 渲染记录列表
function renderRecords(records) {
  const container = document.getElementById('recordList')
  const countEl = document.getElementById('recordCount')
  
  countEl.textContent = `${records.length} 条`
  
  if (records.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>暂无下载记录</p>
      </div>
    `
    return
  }
  
  container.innerHTML = records.slice(0, 20).map(record => {
    const date = new Date(record.createdAt)
    const timeStr = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    
    return `
      <div class="record-item ${record.type}">
        <span class="type-icon">${record.type === 'video' ? '📹' : '🖼️'}</span>
        <div class="info">
          <div class="title" title="${escapeHtml(record.title)}">${escapeHtml(record.title)}</div>
          <div class="time">${timeStr}</div>
        </div>
        <button class="delete-btn" onclick="deleteRecord('${record.id}')">✕</button>
      </div>
    `
  }).join('')
}

// 删除单条记录
async function deleteRecord(id) {
  try {
    await chrome.runtime.sendMessage({ action: 'deleteRecord', id })
    loadRecords()
  } catch (err) {
    console.error('Failed to delete record:', err)
  }
}

// 清空所有记录
async function clearRecords() {
  if (!confirm('确定清空所有下载记录？')) return
  
  try {
    await chrome.runtime.sendMessage({ action: 'clearRecords' })
    loadRecords()
    showToast('已清空所有记录')
  } catch (err) {
    console.error('Failed to clear records:', err)
  }
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 显示提示
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.className = `toast show ${type}`
  
  setTimeout(() => {
    toast.classList.remove('show')
  }, 2000)
}

// 全局函数
window.deleteRecord = deleteRecord
