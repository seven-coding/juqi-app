// 帖子、评论点赞
// id: string 必填  动态id
// to  string 必填  点赞用户对象的openId
// type: 1.动态点赞，2.动态取消点赞，3 评论点赞 4.评论取消点赞
// firstIndex:   非必填，number, 评论第一层index 
// secondIndex: 非必填，number, 评论第一层index 

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const { likeToDyn } = require('./likeToDyn');
const { unlikeToDyn } = require('./unlikeToDyn');
const { likeToCom } = require('./likeToCom');
const { unlikeToCom } = require('./unlikeToCom');
const { verifyRegister } = require('./verifyRegister');

// 云函数入口函数
exports.main = async (event, context) => {
  let { source } = event;
  let openId;

  if (source) {
    openId = event.ownOpenId || event.openId
  } else {
    const wxContext = cloud.getWXContext()
    openId = wxContext.OPENID;
  }
  
  let createTime = new Date().valueOf();

  let { firstIndex, secondIndex, id, type, to, likeToType } = event;
  console.log(`请求参数：`)
  console.log(event)

  if (type == 1) {
    // 动态点赞
    let result = await likeToDyn(event);
    return result;
  } else if (type == 2) {
    // 动态取消点赞
    let result = await unlikeToDyn(event);
    return result;
  } else if (type == 3) {
    // 评论点赞
    let result = await likeToCom(event);
    return result;
  } else if (type == 4) {
    // 评论点赞
    let result = await unlikeToCom(event);
    return result;
  } else if (type == 'test') {
    await verifyRegister(openId);
    
  } 
}