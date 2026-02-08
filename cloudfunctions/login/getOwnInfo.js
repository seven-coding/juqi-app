// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

const {
    errorCode
} = require('./errorCode');
// const {
//   CONFIG
// } = require('./config');
const {
    getPublishCount,
    getFollowerNums,
    getFollowNums,
    getFavoriteCount,
    // getLikeCount
} = require('operate');

const {
    getUserInfo
} = require('./getUserInfo');

// 给动态点赞
async function getOwnInfo(openId, unionId, source) {
    // 查询自己的信息
    console.log('1:访问自己')


    let userInfo = await getUserInfo(openId, unionId, source);
    if (userInfo == "NOT_REGISTER") {
        const {
            data
        } = await db.collection('leaved_user_info').where({
            openId,
            leaveType: 'confirmLeave'
        }).get()

        const leaveInfo = data.length ? data[0] : null
        console.log('leave info', leaveInfo)
        if (leaveInfo && (leaveInfo.leaveTime + 31536000000) > Date.now()) {
            leaveInfo.joinStatus = -4
            leaveInfo.userStatus = `账号保护中，原账号昵称为<${leaveInfo.nickName}>`
            return {
                openId,
                data: leaveInfo,
                publishCount: 0, //发布数量
            }
        }

        return {
            ...errorCode.NOT_REGISTER,
            openId
        };
    }

    let publishCount;
    // 计算本人发布数量、关注数
    publishCount = await getPublishCount(openId);


    userInfo.publishCount = publishCount;

    userInfo.followerNums = await getFollowerNums(openId)
    userInfo.followNums = await getFollowNums(openId)

    console.log()

    if (userInfo.auth == undefined) {
        userInfo.auth = {
            admin: false,
            partner: false,
            volunteer: false,
            verifier: false,
            circleManager: false,
            censor: false,
            superAdmin: false,
            roomManager: false
        };
    }

    // 兼容
    if (userInfo.tag == undefined || userInfo.tag.length == 0) {
        userInfo.tag = ["普通用户"];
    }
    if (userInfo.tagOnShow == undefined || userInfo.tagOnShow == "") {
        userInfo.tagOnShow = userInfo.tag[0];
    }

    return {
        openId,
        data: userInfo,
        publishCount, //发布数量
    }
}

exports.getOwnInfo = getOwnInfo;