// 支付橘气币
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

const _ = db.command;
const { CONFIG } = require("config");
const { sendJuqiCoin } = require("./sendJuqiCoin");

// 获取用户权限
async function sendInviteJuqiCoin(beInviteOpenId) {

  try {
    console.log("开始发送五个橘气币")
    // 通过被邀请人查询邀请人的openId
    let {inviteUser, nickName} = (await db.collection("user").where({openId: beInviteOpenId}).get()).data[0];
    // 查询邀请人信息
    let inviteUserInfo = (await db.collection("user").where({openId: inviteUser}).get()).data;

    if (inviteUserInfo && inviteUserInfo.length) {
      let {openId} = inviteUserInfo[0];
      await sendJuqiCoin({
        openId: openId,
        outTradeNo: "INVITE_" + beInviteOpenId, //作为交易标志，避免重复发送
        juqiCoin: 5,
        message: `叮，您邀请的用户 ${nickName}已验证通过加入橘气，特附上5个橘气币奖励。特别说明：对方不会知道你的橘气号，请放心邀请，帮助橘气做大做强。`,
        tradeName: "邀请用户",
        SEND_LABEL: "INVITE_" + beInviteOpenId //以INVITE_被邀请人openId为标注，避免重复发放
      })
    } 
    console.log("发放成功")

    return;

  } catch (error) {
    console.log(error)
  }
}

exports.sendInviteJuqiCoin = sendInviteJuqiCoin;
