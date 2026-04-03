// Content Script - Bilibili Video Page
// 获取视频信息和下载地址

// 获取当前页面视频信息
function getVideoInfo() {
  // 从页面获取 BVID
  const bvidMatch = window.location.pathname.match(/video\/(BV\w+)/)
  const bvid = bvidMatch ? bvidMatch[1] : ''
  
  // 获取标题
  const titleEl = document.querySelector('h1.video-title') || 
                  document.querySelector('.video-info-title') ||
                  document.querySelector('meta[property="og:title"]')
  const title = titleEl ? titleEl.textContent || titleEl.content : document.title
  
  // 获取封面URL
  const coverEl = document.querySelector('.video-cover .cover-image') ||
                  document.querySelector('meta[property="og:image"]')
  const coverUrl = coverEl ? (coverEl.src || coverEl.content) : ''
  
  // 获取UP主
  const upEl = document.querySelector('.up-info .name') ||
               document.querySelector('.username')
  const upName = upEl ? upEl.textContent.trim() : ''
  
  return {
    bvid,
    title: title.trim(),
    coverUrl,
    upName,
    url: window.location.href
  }
}

// 获取视频真实下载链接（通过播放页API）
async function getVideoDownloadUrl(bvid) {
  try {
    // 调用B站播放页接口获取视频信息
    const response = await fetch(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&qn=80&fnval=0`)
    const data = await response.json()
    
    if (data.code === 0 && data.data && data.data.durl) {
      return data.data.durl[0].url
    }
    return null
  } catch (err) {
    console.error('Failed to get video URL:', err)
    return null
  }
}

// 获取封面高清链接
function getHighResCover(coverUrl) {
  if (!coverUrl) return ''
  // 替换尺寸后缀获取高清
  return coverUrl.replace(/@.*\.jpg$/, '@4k.jpg')
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    const info = getVideoInfo()
    sendResponse({ success: true, data: info })
    return true
  }
  
  if (request.action === 'downloadVideo') {
    const info = getVideoInfo()
    getVideoDownloadUrl(info.bvid).then(url => {
      if (url) {
        chrome.runtime.sendMessage({
          action: 'addRecord',
          data: {
            type: 'video',
            title: info.title,
            url: url,
            bvid: info.bvid
          }
        })
        chrome.runtime.sendMessage({
          action: 'downloadFile',
          url: url,
          filename: `bilibili/${info.title}.mp4`
        })
        sendResponse({ success: true })
      } else {
        sendResponse({ success: false, error: '无法获取视频地址' })
      }
    })
    return true
  }
  
  if (request.action === 'downloadCover') {
    const info = getVideoInfo()
    const coverUrl = getHighResCover(info.coverUrl)
    
    if (coverUrl) {
      chrome.runtime.sendMessage({
        action: 'addRecord',
        data: {
          type: 'cover',
          title: `${info.title} - 封面`,
          url: coverUrl,
          bvid: info.bvid
        }
      })
      chrome.runtime.sendMessage({
        action: 'downloadFile',
        url: coverUrl,
        filename: `bilibili/covers/${info.title}.jpg`
      })
      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, error: '无法获取封面' })
    }
    return true
  }
})

// 页面加载完成后通知
console.log('Bilibili Helper 已加载')
