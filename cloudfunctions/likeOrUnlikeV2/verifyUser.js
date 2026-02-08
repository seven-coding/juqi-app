// 语音验证帖子，超过3条进行验证通过
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const {
    sendInviteCode
} = require('./sendInviteCode');
const {
    setMessagesUser
} = require('./sendMessage')
const {
    CONFIG
} = require('./config');
const {
    updateUserInfo
} = require('./utils/userInfo');
const {
    sendInviteJuqiCoin
} = require('./sendInviteJuqiCoin');
const { verifyRegister } = require('./verifyRegister');

async function checkOldInfo(openId) {
    const {
        data
    } = await db.collection('leaved_user_info').where({
        openId
    }).orderBy('leaveTime', 'desc').get()
    if (data.length) {
        const {
            expireTime
        } = data[0]
        if (expireTime < Date.now()) {
            const deleteUserInfo = db.collection('user').where({
                openId
            }).remove();

            const deleteMessageChat = db.collection("messageChat").where(
                _.or([{
                    from: openId
                }, {
                    to: openId
                }])
            ).remove()

            const deleteMessageUser = db.collection("messagesUser").where(
                _.or([{
                    from: openId
                }, {
                    to: openId
                }])
            ).remove()

            const deleteDyn = db.collection('dyn').where({
                openId
            }).remove();
            const result = await Promise.all([deleteUserInfo, deleteMessageChat, deleteMessageUser, deleteDyn])
            return result;
        } else {
            const userInfo = data[0]
            if (userInfo.logoutReason != 'leave_change') {
                delete userInfo.leaveTime
                delete userInfo.expireTime
                delete userInfo.leaveType
                delete userInfo.logoutReason
                const result = await db.collection('user').where({
                    openId
                }).update({
                    data: userInfo
                })
                return result
            }
        }
    }
}

// 如果点赞数超过2，且是验证帖子，则开始验证逻辑
async function verifyUser(dynId, dynDetail) {
    const {
        openId,
        like
    } = dynDetail;

    await updateUserInfo(openId, {
        joinStatus: 1,
        realEnterTime: db.serverDate(),
        realTimestamp: new Date().valueOf(),
        virifyList: like
    })

    // 更新用户验证的帖子不再做二次验证
    await db.collection('dyn').where({
        openId,
        verifyStatus: 1,
    }).update({
        data: {
            verifyStatus: 2,
        }
    })

    await verifyRegister(openId);
    
    // 发放邀请码
    // await sendInviteCode({
    //   openId,
    //   num: 10000
    // });

    // 首次进入且验证通过，有正确的邀请人，则发放5个橘气币
    // await sendInviteJuqiCoin(openId, 5);

    // 橘卡丘发送一条欢迎消息
    // await checkOldInfo(openId)
    let message = "恭喜你已通过橘气验证！\
      已有超过两名用户为您的语音帖进行通过充电~\
      已为你解锁橘气所有权限，快来橘气探索吧~";
    let from = "3dfe72d65fab8647008a91d506bd1290"


    // 消息记录
    await setMessagesUser({
        from,
        to: openId,
        status: 0,
        type: CONFIG.MESSAGES_USER_TYPE.SYSTEM,
        groupType: CONFIG.GROUP_TYPE.SYSTEM,
        createTime: new Date().valueOf(),
        message,
        fromName: '橘卡丘',
        fromPhoto: "https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png",
        secondName: "橘卡丘",
        secondPhoto: 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png',
        secondMes: message,
    })



    cloud.callFunction({
        name: "sendMessage",
        data: {
            method: "sendVerifyMessage",
            touser: openId,
            verifyResult: "【验证通过】👏欢迎加入橘气，已为你开通普通会员权限，立即开心冲浪>>"
        }
    })

    return {
        code: 200
    }
}

exports.verifyUser = verifyUser;