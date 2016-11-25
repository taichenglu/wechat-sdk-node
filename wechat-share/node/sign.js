const express = require('express')
const router = express.Router()
const https = require('https')
const jsSHA = require('jssha')

// 跨域允许的域名
const allowDomain = 'xxxxxx.com'

// 公众号信息
const appInfo = {
  appid: 'xxxxxxxxxxxxxxxxxx',
  secret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
}

// 缓存在服务器端，签名对象的 key 为每个页面的 url
const cachedData = {}

// 缓存 2 小时后过期
const expireTime = 7200 - 60

// 随机字符串
const createNonceStr = () => Math.random().toString(36).substr(2, 15)

// 时间戳
const createTimeStamp = () => String(parseInt(new Date().getTime() / 1000, 0))

// 签名
const sign = (ticket, noncestr, timestamp, url) => {
  const str = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`
  const shaObj = new jsSHA(str, 'TEXT')
  return shaObj.getHash('SHA-1', 'HEX')
}

// 获取ticket
const getTicket = (url, res, accessToken) => {
  https.get(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`, (response) => {
    let str = ''
    let ret = {}
    response.on('data', (data) => {
      str += data
    })
    response.on('end', () => {
      try {
        ret = JSON.parse(str)
      } catch (e) {
        console.log('解析远程JSON数据错误')
        return
      }

      const timestamp = createTimeStamp()
      const nonceStr = createNonceStr()
      const jsapi_ticket = ret.ticket
      const signature = sign(jsapi_ticket, nonceStr, timestamp, url)
      const item = { jsapi_ticket, nonceStr, timestamp, url, signature }

      cachedData[url] = item
      res.json(item)
    })
  })
}

// 获取token
const getToken = (url, res) => {
  https.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appInfo.appid}&secret=${appInfo.secret}`, (response) => {
    let str = ''
    let ret = {}
    response.on('data', (data) => {
      str += data
    })
    response.on('end', () => {
      try {
        ret = JSON.parse(str)
      } catch (e) {
        console.log('获取access_token失败')
        return
      }

      getTicket(url, res, ret.access_token)
    })
  })
}

// 跨域
const allowOrigin = (url) => {
  const hostPrefix = url.split(allowDomain)[0] || 'http://'
  return `${hostPrefix}${allowDomain}`
}

// route
router.get('/', (req, res) => {
  const url = req.query.url
  const cachedItem = cachedData[url]

  res.set({
    'Access-Control-Allow-Origin': allowOrigin(url),
    'Access-Control-Allow-Methods': 'POST, GET'
  })

  if (!url) {
    console.log('缺少url参数')
    return { msg: 'error' }
  }

  // 缓存
  if (cachedItem && cachedItem.timestamp) {
    const t = createTimeStamp() - cachedItem.timestamp
    // 注意：微信分享后会额外添加一些参数，url会发生变化
    if (t < expireTime && cachedItem.url === url) {
      return res.json({
        jsapi_ticket: cachedItem.jsapi_ticket,
        nonceStr: cachedItem.nonceStr,
        timestamp: cachedItem.timestamp,
        url: cachedItem.url,
        signature: cachedItem.signature,
      })
    }
  }

  getToken(url, res)

  return { msg: 'success' }
})

module.exports = router
