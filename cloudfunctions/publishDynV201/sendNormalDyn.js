// 发布待验证帖子（使用 env.getDb 按 dataEnv 写库）
const cloud = require('wx-server-sdk');
const { getDb, getPublishDynCallName } = require('./env');
const {
    CONFIG
} = require('./config')
const {
    setMessagesUser
} = require('./messages')
const {
    errorCode
} = require('./errorCode')
const {
    getPublicAuth,
    getUserAuth,
    publicDyn,
    publishTopic
} = require('./operate')
const {
    sendAitMessage
} = require('./sendAitMessage')
const {
    publicForward
} = require('./publicForward')
let prefix = 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la';
let newPrefix = 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la';



async function sendNormalDyn(event, openId, circleInfo) {
    const db = getDb();
    const _ = db.command;
    let {
        dynContent,
        circleId,
        circleTitle,
        imageIds,
        musicPoster,
        musicName,
        musicId,
        musicAuthor,
        musicSrc,
        isAudioShow,
        topic, //话题
        ait, //艾特人的openId list
        dynType, //转发类型必填,
        dynVideoLength,
        dynVideoTime,
        dynVideo,
        source, // 发布来源：newApp=App端，不传=小程序，用于展示时是否拼接 topic/ait
    } = event;
    imageIds = imageIds.filter(image => isValidUrl(image))
    if (dynVideoTime) {
        dynVideo = Array.isArray(dynVideo) ? dynVideo[0] : dynVideo
    }
    let imageList, imageLists;
    // try {
    // 动态内容校验

    try {
    console.log(4)

        //文字校验
    //     if (process.env.TCB_ENV !== 'local') {
    // console.log(5)
    //         await contentCheck(dynContent);
    // console.log(6)
            
    //     }
    } catch (error) {
        return errorCode.SEND_FAIL
    }

    // dynContent && (dynContent = dynContent.trim());
    // if (dynContent && dynContent.length) {
    //   let result;
    //   try {
    //     // 避免前后多余空格
    //     result = await cloud.openapi.security.msgSecCheck({content: dynContent});
    //   } catch (error) {
    //     console.log(error)
    //     return {
    //       [error === 'NO_AUTH_CONTENT' ? 'NO_AUTH_CONTENT' : errorCode.NO_AUTH] : true
    //     };
    //   }
    // }

    if (dynType == 2) {
        // 发布转发帖子
        let result = await publicForward(event, circleInfo, openId);
        return result;
    } else {
        // 发布正常帖子

        // 空内容校验
        if ((imageIds && !imageIds.length) && !dynContent.trim().length) {
            return errorCode.NO_CONTENT;
        }

        // 文字过多校验
        if (dynContent.length > 3000) {
            return errorCode.OVER_LENGTH
        }
        // 获取发布圈子权限
        let publicAuth = await getPublicAuth(circleId, openId, circleInfo);
        if (!publicAuth) {
            return errorCode.NO_CIRCLE_AUTH
        }

        if (topic) {
            await publishTopic(topic, openId)
        }

        if (imageIds && imageIds.length) {
            let cacheList = await getTempList(imageIds)
            imageLists = cacheList[1]
            imageList = cacheList[0]
        }

        if (publicAuth === 'check') {
            // 发布审核中动态
            let result = await publicDyn({
                dynContent,
                openId: openId,
                createTime: db.serverDate(), //发布时间
                isDelete: 0, //是否删除
                likeNums: 0,
                commentNums: 0,
                circleId,
                circleTitle,
                imageIds,
                imageList,
                imageLists,
                //音频控件
                musicPoster,
                musicName,
                musicId,
                musicAuthor,
                musicSrc,
                isAudioShow,
                publicTime: new Date().valueOf(),
                dynStatus: 2,
                topic,
                ait,
                dynType, //dynType: 为2时表示转发类型
                userTopTime: 0,
                dynVideoLength,
                dynVideoTime,
                dynVideo,
                source
            }, circleInfo)

            let {
                _id
            } = result;

            // 如果艾特了用户，发送艾特信息
            if (ait && ait.length) {
                ait.map(async item => {
                    await sendAitMessage({
                        dynId: _id,
                        from: openId,
                        to: item.openId
                    })
                })
            }

            // 申请发布审核
            let updateResult = await db.collection('circle_apply_join').add({
                data: {
                    type: CONFIG.APPLY_CIRCLE_TYPE.PUBLIC_APPLY,
                    dynId: _id,
                    circleId,
                    createTime: new Date().valueOf(), //申请时间
                    applyStatus: 0,
                    openId
                }
            });

            if (updateResult.errMsg == "collection.add:ok") {
                return {
                    code: 201,
                    message: '投稿电站，审核通过后出现',
                    dynId: result._id
                };
            } else {
                return {
                    code: 400,
                    message: '投稿电站失败'
                };
            }

        } else {

            // 发布动态
            let result = await publicDyn({
                dynContent,
                openId: openId,
                createTime: db.serverDate(), //发布时间
                isDelete: 0, //是否删除
                likeNums: 0,
                commentNums: 0,
                circleId,
                circleTitle,
                imageIds,
                imageList,
                imageLists,
                //音频控件
                musicPoster,
                musicName,
                musicAuthor,
                musicSrc,
                musicId,
                isAudioShow,
                publicTime: new Date().valueOf(),
                topic,
                ait,
                dynType,
                userTopTime: 0,
                dynVideoLength,
                dynVideoTime,
                dynVideo,
                source
            }, circleInfo);

            // 如果艾特了用户，发送艾特信息
            if (ait && ait.length) {
                ait.map(async item => {
                    await sendAitMessage({
                        dynId: result._id,
                        from: openId,
                        to: item.openId,
                        ait
                    })
                })
            }

            if (imageIds && imageIds.length > 0) {
                try {
                    // 当imageIds存在时，触发云函数进行图片校验
                    cloud.callFunction({
                        name: getPublishDynCallName(),
                        data: {
                            type: "dyn",
                            imageIds,
                            id: result._id
                        },
                        success: res => {
                            console.log(res.result) //在这进行返回结果处理
                        },
                        fail: err => {
                            console.error(err)
                        }
                    });
                } catch (error) {
                    console.log(error)
                }
            }
            return {
                code: 200,
                message: '发布成功',
                // dynId: result._id
            }
        }
    }

}


exports.sendNormalDyn = sendNormalDyn;

// 新增的文字校验函数
async function contentCheck(dynContent) {

console.log(7)
  dynContent && (dynContent = dynContent.trim());
    let result;
    if (dynContent && dynContent.length) {
        try {
            // 避免前后多余空格
console.log(8)
            result = await cloud.openapi.security.msgSecCheck({
                content: dynContent
            });
        } catch (error) {
            console.log(error);
            throw new Error(error === 'NO_AUTH_CONTENT' ? 'NO_AUTH_CONTENT' : errorCode.NO_AUTH);
        }
    }
    // 文字过多校验
    if (dynContent.length > 3000) {
        throw new Error(errorCode.OVER_LENGTH);
    }
}

function getTempList(imageIds) {
    let prefix = 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la';
    let newPrefix = 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la';

    let urlSuffix = "?imageMogr2/auto-orient/thumbnail/400x2000%3E/quality/70/interlace/1";

    let imgList = [];
    let imageLists = imageIds.map(id => {
        // let newUrl = id.replace(prefix, newPrefix);
        imgList.push(id);
        return id + urlSuffix;
    });

    return [imgList, imageLists];
}

function isValidUrl(url) {
    if (!!!url) {
        return false
    }
    return url.startsWith('https://') || url.startsWith('cloud:') || url.startsWith('http://')
}