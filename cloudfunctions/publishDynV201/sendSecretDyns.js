// 发布待验证帖子（使用 env.getDb 按 dataEnv 写库）
const cloud = require('wx-server-sdk');
const { getDb } = require('./env');
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

async function sendSecretDyns(event, openId, circleInfo) {
    const db = getDb();
    const _ = db.command;

    let {
        type,
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
        joinStatus,
    } = event;

    imageIds = imageIds.filter(image => isValidUrl(image))
    if (dynVideoTime) {
        dynVideo = Array.isArray(dynVideo) ? dynVideo[0] : dynVideo
    }
    if (dynType == 2) {
        return errorCode.NO_FORWARD
    }

    let imageList, imageLists;
    // try {
    // 动态内容校验（与其它电站一致，均需过微信审核）
    dynContent && (dynContent = dynContent.trim());
    if (dynContent && dynContent.length) {
        try {
            let result = await cloud.openapi.security.msgSecCheck({
                content: dynContent
            });
            // 云调用成功返回 errCode 0 表示内容正常；内容有风险时微信会抛异常 errCode 87014
            if (result.errCode !== 0 && result.errCode !== undefined) {
                console.log('[sendSecretDyns] msgSecCheck 返回非0:', result);
                return errorCode.NO_AUTH_CONTENT;
            }
        } catch (error) {
            // 仅 87014 为内容风险并拦截；其它错误（网络/权限/超时等）仅打日志，默认通过，不阻碍发布
            const code = error.errCode ?? error.errcode;
            console.log('[sendSecretDyns] msgSecCheck 异常:', code, error.errMsg || error.errmsg || error.message);
            if (code === 87014) {
                return errorCode.NO_AUTH_CONTENT;
            }
            // 非内容违规：放行，继续发布
        }
    }

    // 空内容校验
    if ((imageIds && !imageIds.length) && !dynContent.trim().length) {
        return errorCode.NO_CONTENT;
    }

    // 文字过多校验
    if (dynContent.length > 3000) {
        return errorCode.OVER_LENGTH
    }

    if (topic) {
        await publishTopic(topic, openId)
    }

    if (imageIds && imageIds.length) {
        imageList = await getTempList(imageIds)
        imageLists = imageList.map(item => {
            return item + "?imageMogr2/auto-orient/thumbnail/400x2000%3E/quality/70/interlace/1"
        })
    }

    // 发布审核中动态
    let result = await publicDyn({
        dynContent,
        openId: "secret_openId",
        real_openId: openId,
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
        dynStatus: 2, // 树洞/私密电站：仅圈子内可见，与小程序 sendSecretDyns 一致
        topic,
        ait,
        dynType, //dynType: 为2时表示转发类型
        userTopTime: 0,
        dynVideoLength,
        dynVideoTime,
        dynVideo
    }, circleInfo)

    let {
        _id
    } = result;

    // // 如果艾特了用户，发送艾特信息
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
            dynId: result._id,
            dynStatus: 2
        };
    } else {
        return {
            code: 400,
            message: '投稿电站失败'
        };
    }

}

async function getTempList(imageIds) {
    let res = await new Promise((resolve, reject) => {
        cloud.getTempFileURL({
            fileList: imageIds
        }).then(res => {
            // get temp file URL
            console.log(res.fileList)
            if (res.fileList) {
                let newImages = res.fileList.map(item => {
                    return item.tempFileURL
                })

                resolve(newImages);
            }

        }).catch(error => {
            // handle error
            console.log(error)
        })
    });

    return res;
}

function isValidUrl(url) {
    if (!!!url) {
        return false
    }
    return url.startsWith('https://') || url.startsWith('cloud:') || url.startsWith('http://')
}

exports.sendSecretDyns = sendSecretDyns;