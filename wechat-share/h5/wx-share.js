import fetch from 'isomorphic-fetch'
import wx from './jweixin-1.0.0'

// 后端接口
const apiUrl = '/xxxx'

// 默认图
// const imgWxShare = require('xxx.png')
// 安卓版微信不支持 base64 图片
const imgWxShare = 'http://xxxx.com/xxxx.png'

// nodeFetch
const nodeFetch = (options) => {
  const {
    url = '',
    methodType = 'GET',
    callback = () => {},
  } = options

  fetch(url, {
    method: methodType,
  })
  .then((res) => {
    const data = res.json()
    return data
  })
  .then((jsonData) => {
    callback(jsonData)
  })
  .catch((ex) => {
    console.log('failed', ex)
  })
}

export const wxShare = (options = {}) => {
  const {
    title = '分享标题',
    desc = '分享摘要',
    link = '',
    // 分享类型，music、video或link，不填默认为link
    type = '',
    // 如果type是music或video，则要提供数据链接，默认为空
    dataUrl = '',
    // 用户确认分享后执行的回调函数
    success = () => {},
    // 用户取消分享后执行的回调函数
    cancel = () => {},
  } = options

  const imgUrl = options.imgUrl || imgWxShare

  // 微信分享后会额外添加一些参数，url 会发生变化
  // 需要对 url 进行编码，否则二次分享时不能成功获取签名
  const url = encodeURIComponent(location.href.split('#')[0])

  nodeFetch({
    url: `${apiUrl}?url=${url}`,
    callback: (data) => {
      wx.config({
        // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
        // debug: true,
        // 必填，公众号的唯一标识
        appId: 'xxxxxxxxxxxxxxxxxx',
        // 必填，生成签名的时间戳
        timestamp: data.timestamp,
        // 必填，生成签名的随机串
        nonceStr: data.nonceStr,
        // 必填，签名，见附录1
        signature: data.signature,
        // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
        jsApiList: ['onMenuShareTimeline', 'onMenuShareAppMessage'],
      });

      wx.ready(() => {
        // 分享到朋友圈
        wx.onMenuShareTimeline({ title, link, imgUrl, success, cancel })
        // 分享给朋友
        wx.onMenuShareAppMessage({ title, desc, link, imgUrl, type, dataUrl, success, cancel })
      })
    }
  })
}
