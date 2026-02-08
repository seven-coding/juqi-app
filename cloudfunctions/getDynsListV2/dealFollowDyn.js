const cloud = require('wx-server-sdk')
// 不在顶层调用 cloud.init()，由 index.js 统一初始化

const {
  getFollowingList
} = require('./getFollowDyns')

// 处理数据
async function dealFollowDyn(openId, dynList) {

  const followingList = await getFollowingList(openId)
  const result = dynList.filter(item => {
    if (item.dynStatus == 9) {
      return followingList.includes(item.openId)
    }
    return true
  })


  return result;

}

exports.dealFollowDyn = dealFollowDyn;