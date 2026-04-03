// Background Service Worker
// 处理下载和存储

// 监听来自 popup 和 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRecords') {
    getRecords().then(records => sendResponse({ success: true, data: records }))
    return true
  }
  
  if (request.action === 'addRecord') {
    addRecord(request.data).then(() => sendResponse({ success: true }))
    return true
  }
  
  if (request.action === 'deleteRecord') {
    deleteRecord(request.id).then(() => sendResponse({ success: true }))
    return true
  }
  
  if (request.action === 'clearRecords') {
    clearRecords().then(() => sendResponse({ success: true }))
    return true
  }
  
  if (request.action === 'downloadFile') {
    downloadFile(request.url, request.filename).then(() => sendResponse({ success: true }))
    return true
  }
})

// 获取下载记录
async function getRecords() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['downloadRecords'], (result) => {
      resolve(result.downloadRecords || [])
    })
  })
}

// 添加下载记录
async function addRecord(data) {
  const records = await getRecords()
  
  const record = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    type: data.type, // 'video' | 'cover'
    title: data.title,
    url: data.url,
    bvid: data.bvid || '',
    size: data.size || null
  }
  
  records.unshift(record) // 最新在前
  
  // 最多保存200条
  const trimmed = records.slice(0, 200)
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ downloadRecords: trimmed }, resolve)
  })
}

// 删除单条记录
async function deleteRecord(id) {
  const records = await getRecords()
  const filtered = records.filter(r => r.id !== id)
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ downloadRecords: filtered }, resolve)
  })
}

// 清空所有记录
async function clearRecords() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ downloadRecords: [] }, resolve)
  })
}

// 下载文件
async function downloadFile(url, filename) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    chrome.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: true
    })
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
  } catch (err) {
    console.error('Download failed:', err)
    throw err
  }
}

// 清理过期的下载记录（7天前）
async function cleanupOldRecords() {
  const records = await getRecords()
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  
  const filtered = records.filter(r => new Date(r.createdAt).getTime() > weekAgo)
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ downloadRecords: filtered }, resolve)
  })
}

// 启动时清理
cleanupOldRecords()
