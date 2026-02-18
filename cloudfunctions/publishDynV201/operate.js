// 工具函数（使用 env.getDb 按 dataEnv 写库）
const cloud = require('wx-server-sdk');
const { getDb } = require('./env');
const {
    errorCode
} = require('./errorCode');
const {
    getRedisValue,
    setRedisValue,
    setRedisExpire
} = require('./redis');
const SQUARE_KEY = "NEW_DYN_2";
const CIRCLE_KEY = "NEW_DYN_1";

// 获取圈子权限
async function getPublicAuth(circleId, openId, circleInfo) {
    const db = getDb();
    const _ = db.command;
    let {
        isPublickCheck, //是否发布审核
        isMemberPublic, //是否成员才可发布
        follow
    } = circleInfo;


    if (isMemberPublic) {
        let hasJoin = (await db.collection('circle_follow').where({
            openId,
            circleId
        }).get()).data.length > 0;

        if (!hasJoin) {
            // 非成员无权限
            return false;
        }

        // 成员发布时，判断是否需审核
        if (isPublickCheck) {
            return 'check';
        }
    }


    if (isPublickCheck) {
        return 'check';
    }

    return true;
}

// 获取用户权限,返回joinStatus字段
// 0. 无访问权限
// 1.已验证权限
// 2.新人未发语音权限
// 3. 新人已发语音待验证权限
async function getUserAuth(userInfo) {
    return userInfo.joinStatus;
}

async function publicDyn(data, circleInfo, verify) {
    const db = getDb();
    let {
        circleId
    } = data;
    let {
        title,
        desc,
        circleDynStatus
    } = circleInfo;

    data.circles = [{
        title,
        desc,
        circleId
    }];
    data.authorizationStatus = 0

    // dynStatus 与小程序统一：1=全部可见，2=仅圈子内可见（树洞）。见 getDynsListV201/dynStatus.js
    if (!data.dynStatus) {
        data.dynStatus = circleDynStatus ? circleDynStatus : 1
    }

    let result = await db.collection('dyn').add({
        data
    });

    // 首页redis失效
    await setRedisExpire(CIRCLE_KEY, 0)

    if (result.errMsg == "collection.add:ok") {
        return {
            code: 200,
            _id: result._id
        }
    } else {
        return {
            code: 400,
            message: result
        }
    }
}

async function publishTopic(topics, openId) {
    const db = getDb();
    const _ = db.command;
    //topic array类型
    if (!topics && !topics.length) {
        return false
    };
    // 累计电人状态
    let topicInfo = await db.collection('topics').where({
        topic: _.in(topics)
    }).get();

    let updateResult = await db.collection('topics').where({
        topic: _.in(topics)
    }).update({
        data: {
            joinCounts: _.inc(1)
        }
    });

    if (topics.includes("一周CP")) {
        let sendLog = (await db.collection('shopLog').where({
            openId,
            tag: "一周CP"
        }).get()).data;

        console.log(sendLog.length)

        if (!sendLog.length) {
            console.log(`参加一周CP,发送${openId}一张交换卡`)
            await cloud.callFunction({
                // 要调用的云函数名称
                name: 'a-message-deal',
                // 传递给云函数的event参数
                data: {
                    type: 1,
                    goodsId: "b00064a76082b2d31094deba25a45a21",
                    openId,
                    count: 1,
                    tag: "一周CP",
                    message: "由于你参加一周CP活动，引来了橘气丘比特。现送你一张微信交换卡。使用方式：可以在对方主页申请交换微信，祝你一切顺利，成功还请回来还愿噢❤️"
                    // message: "发送1个微信交换卡"
                }
            })
        }
    }


    if (updateResult.errMsg && updateResult.errMsg === 'document.update:ok') {
        return true;
    } else {
        return false
    }
}

exports.getPublicAuth = getPublicAuth;
exports.publicDyn = publicDyn;
exports.publishTopic = publishTopic;
exports.getUserAuth = getUserAuth;