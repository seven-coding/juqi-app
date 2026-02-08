// 用户模块
// 版本: 2.2.0 - App测试环境专用（添加 cloud:// URL 转换支持）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');
const { convertDynListUrls, convertCloudUrlToHttps, isCloudUrl } = require('../utils/url');

// 引入动态数据转换函数（从dyn模块）
// 注意：由于模块间不能直接引用，我们需要在这里重新定义或使用共享工具
// 为了简化，我们在这里定义一个简化版的转换函数
function convertDynToAppFormat(dyn, currentOpenId) {
  const userInfo = dyn.userInfo && Array.isArray(dyn.userInfo) ? dyn.userInfo[0] : (dyn.userInfo || {});
  
  let images = null;
  if (dyn.imageList && Array.isArray(dyn.imageList) && dyn.imageList.length > 0) {
    images = dyn.imageList;
  } else if (dyn.imageIds && Array.isArray(dyn.imageIds) && dyn.imageIds.length > 0) {
    images = dyn.imageIds;
  }
  
  let videoUrl = null;
  if (dyn.dynVideo) {
    videoUrl = Array.isArray(dyn.dynVideo) ? dyn.dynVideo[0] : dyn.dynVideo;
  }
  
  let musicInfo = null;
  if (dyn.musicId || dyn.musicName) {
    musicInfo = {
      musicId: dyn.musicId || null,
      musicName: dyn.musicName || null,
      musicAuthor: dyn.musicAuthor || null,
      musicPoster: dyn.musicPoster || null,
      musicSrc: dyn.musicSrc || null,
      isAudioShow: dyn.isAudioShow || false
    };
  }
  
  let publishTime;
  if (dyn.publicTime) {
    publishTime = typeof dyn.publicTime === 'number' ? new Date(dyn.publicTime) : new Date(dyn.publicTime);
  } else if (dyn.createTime) {
    publishTime = typeof dyn.createTime === 'number' ? new Date(dyn.createTime) : new Date(dyn.createTime);
  } else {
    publishTime = new Date();
  }
  
  // 判断是否已点赞（需要安全检查）
  const isLiked = dyn.like && Array.isArray(dyn.like) ? dyn.like.includes(currentOpenId) : false;
  
  // 处理ID字段：优先使用_id，如果没有则使用id
  const dynId = dyn._id || dyn.id || dyn.dynId || '';
  
  return {
    id: dynId,
    userId: dyn.openId || userInfo.openId || '',
    userName: userInfo.nickName || '未知用户',
    userAvatar: userInfo.avatarVisitUrl || userInfo.avatarUrl || null,
    userSignature: userInfo.signature || null,
    isVip: userInfo.usersSecret && userInfo.usersSecret[0] && userInfo.usersSecret[0].vipStatus || false,
    content: dyn.dynContent || '',
    images: images,
    tag: null,
    publishTime: publishTime,
    commentCount: dyn.commentNums || 0,
    likeCount: dyn.likeNums || 0,
    shareCount: dyn.forwardNums || 0,
    chargeCount: dyn.chargeNums || dyn.likeNums || 0, // dyn 文档无独立 chargeNums，每次点赞=1电量
    isLiked: isLiked,
    isCollected: false,
    isCharged: false,
    repostPost: null,
    likeUsers: null,
    joinCount: null,
    circleId: dyn.circleId || null,
    circleTitle: dyn.circleTitle || null,
    circleJoinCount: null,
    voiceUrl: dyn.dynVoice || null,
    voiceDuration: dyn.dynVoiceLen || null,
    videoUrl: videoUrl,
    musicInfo: musicInfo
  };
}

/**
 * 获取当前用户信息
 * 核心层: login (getOwnInfo)
 */
async function GetCurrentUserProfile(event) {
  try {
    const { openId, data, db } = event;

    // 调用核心层：必须传 source: 'newApp'，否则 login 会用 getWXContext().OPENID 作为 ownOpenId；
    // 在 HTTP 触发的 appApi 链中无微信上下文，导致 ownOpenId 为空、isOwn 为 false，误走「查询他人」分支而失败。
    const result = await cloud.callFunction({
      name: 'login',
      data: {
        operation: 'getOwnInfo',
        source: 'newApp',
        openId: openId,
        ownOpenId: openId
      }
    });

    console.log('[appGetCurrentUserProfile] 核心层返回:', result.result);

    // login getOwnInfo 成功时返回 { openId, data: userInfo, publishCount }，无 code 字段；失败时返回 errorCode 或 getOtherInfo 错误
    const hasErrorCode = result.result && (result.result.code !== undefined && result.result.code !== 200);
    const hasData = result.result && (result.result.data != null || result.result.userInfo != null);
    if (hasErrorCode && !hasData) {
      return error(result.result.code || 500, result.result.message || '获取用户信息失败');
    }
    if (!hasData) {
      return error(500, (result.result && result.result.message) || '获取用户信息失败');
    }

    const userInfo = result.result.userInfo || result.result.data;
    
    console.log('[appGetCurrentUserProfile] userInfo 原始数据:', JSON.stringify(userInfo));

    // 转换头像 URL
    let avatarUrl = userInfo.avatarVisitUrl || userInfo.avatarUrl || null;
    if (avatarUrl && isCloudUrl(avatarUrl)) {
      avatarUrl = await convertCloudUrlToHttps(avatarUrl);
    }

    // 获取 VIP 状态
    const usersSecret = userInfo.usersSecret && userInfo.usersSecret[0] ? userInfo.usersSecret[0] : {};
    const isVip = usersSecret.vipStatus || userInfo.vipStatus || false;

    // 辅助函数：确保值是数字类型
    const toInt = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // 构建符合 iOS UserProfile 结构的响应
    // iOS 必填字段: id, userName, isVip, followCount, followerCount
    const profile = {
      // 必填字段
      id: userInfo._id || userInfo.openId || openId,
      userName: userInfo.nickName || userInfo.userName || '未知用户',
      avatar: avatarUrl,
      isVip: !!isVip,
      followCount: toInt(userInfo.followCount || userInfo.followNums),
      followerCount: toInt(userInfo.followerCount || userInfo.fansNums),
      
      // 可选字段
      signature: userInfo.signature || null,
      level: toInt(userInfo.level || userInfo.levelNums),
      age: userInfo.age ? toInt(userInfo.age) : null,
      constellation: userInfo.constellation || null,
      city: userInfo.city || null,
      isFollowing: false,
      isCharged: false,
      chargeCount: toInt(userInfo.chargeNums),
      chargeNums: toInt(userInfo.chargeNums),
      followStatus: toInt(userInfo.followStatus) || 1,
      chargingStatus: !!userInfo.chargingStatus,
      // iOS UserJoinStatus 枚举值: 1=normal, 2=pending, 3=pendingVoice, -1=deleted, -2=banned
      // 0 不是有效值，默认返回 1 (normal)
      joinStatus: toInt(userInfo.joinStatus) || 1,
      // iOS BlackStatus 枚举值: 1=normal, 2=blocked 等
      // 0 不是有效值，默认返回 1 (normal)
      blackStatus: toInt(userInfo.blackStatus) || 1,
      restStatus: !!userInfo.restStatus,
      vipStatus: !!isVip,
      vipConfig: usersSecret.vipConfig || userInfo.vipConfig || null,
      imgList: userInfo.imgList || userInfo.backgroundImg || null,
      bindUserInfo: userInfo.bindUserInfo || null,
      ownOpenId: openId,
      
      // 统计数据
      publishCount: toInt(result.result.publishCount || userInfo.publishCount),
      collectionCount: toInt(userInfo.collectionCount),
      inviteCount: toInt(userInfo.inviteCount),
      blockedCount: toInt(userInfo.blockedCount)
    };

    console.log('[appGetCurrentUserProfile] 返回 profile:', JSON.stringify(profile));

    // iOS 期望响应在 data 对象中直接包含 profile
    return success(profile);
  } catch (err) {
    console.error('[appGetCurrentUserProfile] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取用户主页信息
 * 核心层: commonRequest (get_user_info) + getUserAbout (type=7)
 */
async function GetUserProfile(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data || {};

    if (!userId) {
      return error(400, "缺少用户ID");
    }

    // 获取用户基本信息
    const userInfoResult = await cloud.callFunction({
      name: 'commonRequest',
      data: {
        method: 'get_user_info',
        openId: userId
      }
    });

    console.log('[appGetUserProfile] 用户信息返回:', userInfoResult.result);

    if (!userInfoResult.result || userInfoResult.result === '') {
      return error(404, "用户不存在");
    }

    const userData = userInfoResult.result;

    // 获取关注状态和拉黑状态（如果不是自己的信息）
    let followStatus = 1;
    let blackStatus = 1;
    let isInvisible = false;

    if (userId !== openId) {
      // 获取操作关系
      const operateResult = await cloud.callFunction({
        name: 'getUserAbout',
        data: {
          type: 7,  // 7=获取操作关系
          openId: userId,
          ownOpenId: openId,
          AnyOpenId: userId
        }
      });

      console.log('[appGetUserProfile] 操作关系返回:', operateResult.result);

      if (operateResult.result && operateResult.result.code === 200) {
        followStatus = operateResult.result.followStatus || 1;
        blackStatus = operateResult.result.blackStatus || 1;
        isInvisible = operateResult.result.isInvisible || false;
      }
    }

    // 查询完整的用户信息以获取joinStatus
    const fullUserResult = await db.collection('user').where({ openId: userId }).get();
    const fullUser = fullUserResult.data.length > 0 ? fullUserResult.data[0] : null;
    
    // 数据格式转换
    const profile = {
      id: userData._id,
      openId: userData.openId,
      nickName: userData.nickName,
      avatar: userData.avatarVisitUrl || userData.avatarUrl || userData.avatar,
      city: userData.city,
      birthDay: userData.birthDay,
      signature: userData.signature,
      followStatus: followStatus,
      blackStatus: blackStatus,
      isInvisible: isInvisible,
      dynNums: userData.dynNums || 0,
      followNums: userData.followNums || 0,
      fansNums: userData.fansNums || 0,
      chargeNums: userData.chargeNums || 0,
      // 补充字段
      joinStatus: fullUser ? fullUser.joinStatus : null,
      restStatus: false // 需要从vipConfig中提取
    };

    // 如果是自己的信息，返回会员状态和VIP配置
    if (userId === openId && userData.usersSecret && userData.usersSecret.length > 0) {
      profile.usersSecret = userData.usersSecret;
      // 提取restStatus
      if (userData.usersSecret[0].vipConfig && userData.usersSecret[0].vipConfig.restStatus !== undefined) {
        profile.restStatus = userData.usersSecret[0].vipConfig.restStatus;
      }
    }

    // 转换头像 cloud:// URL 为 HTTPS URL
    if (profile.avatar && isCloudUrl(profile.avatar)) {
      profile.avatar = await convertCloudUrlToHttps(profile.avatar);
    }

    return success({
      userInfo: profile,
      isInvisible: isInvisible
    });
  } catch (err) {
    console.error('[appGetUserProfile] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取用户动态列表
 * 核心层: getDynsListV2, type=4
 */
async function GetUserDynList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20, publicTime } = data || {};

    const targetOpenId = userId || openId;

    // 参数标准化
    const coreParams = {
      source: 'newApp', // 必须：让核心层使用 event.openId 而非 wxContext.OPENID
      openId: targetOpenId,
      ownOpenId: openId,
      type: 4, // 4=用户动态列表
      limit: limit
    };

    if (publicTime) {
      coreParams.publicTime = publicTime;
    }

    console.log('[appGetUserDynList] 调用核心层参数:', coreParams);

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: coreParams
    });

    console.log('[appGetUserDynList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取用户动态列表失败');
    }

    // 数据格式转换：将核心层返回的数据转换为App格式
    const rawDynList = result.result.dynList || [];
    const convertedList = rawDynList.map(dyn => convertDynToAppFormat(dyn, openId));
    
    // 转换 cloud:// URL 为 HTTPS URL
    const finalList = await convertDynListUrls(convertedList);
    
    return success({
      list: finalList,
      total: result.result.count || 0,
      hasMore: finalList.length >= limit,
      publicTime: result.result.publicTime
    });
  } catch (err) {
    console.error('[appGetUserDynList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 给用户充电
 * 核心层: chargeHer
 */
async function ChargeUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data || {};

    if (!userId) {
      return error(400, "缺少用户ID");
    }

    if (userId === openId) {
      return error(400, "不能给自己充电");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'chargeHer',
      data: {
        chargeOpenId: userId,
        openId: openId
      }
    });

    console.log('[appChargeUser] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '充电失败');
    }

    return success({});
  } catch (err) {
    console.error('[appChargeUser] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 拉黑用户
 * 核心层: setUser, type=1
 */
async function BlackUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data || {};

    if (!userId) {
      return error(400, "缺少用户ID");
    }

    if (userId === openId) {
      return error(400, "不能拉黑自己");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'setUser',
      data: {
        type: 1, // 1=拉黑
        blackId: userId,
        openId: openId
      }
    });

    console.log('[appBlackUser] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '拉黑失败');
    }

    return success({});
  } catch (err) {
    console.error('[appBlackUser] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 取消拉黑用户
 * 核心层: setUser, type=2
 */
async function UnblackUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data || {};

    if (!userId) {
      return error(400, "缺少用户ID");
    }

    // 调用核心层
    const result = await cloud.callFunction({
      name: 'setUser',
      data: {
        type: 2, // 2=取消拉黑
        unBlackId: userId,
        openId: openId
      }
    });

    console.log('[appUnblackUser] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '取消拉黑失败');
    }

    return success({});
  } catch (err) {
    console.error('[appUnblackUser] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 关注用户
 */
async function FollowUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId: followeeId } = data || {};

    if (!followeeId) {
      return error(400, "缺少用户ID");
    }

    if (openId === followeeId) {
      return error(400, "不能关注自己");
    }

    // 检查用户状态
    const userResult = await db.collection('user').where({ openId }).get();
    if (userResult.data.length === 0) {
      return error(404, "用户不存在");
    }
    const user = userResult.data[0];
    if (user.joinStatus !== 1) {
      return error(403, "用户未通过验证");
    }

    // 检查是否被拉黑
    const blackResult = await db.collection('blackList')
      .where({
        from: followeeId,
        to: openId,
        status: 1
      })
      .get();
    if (blackResult.data.length > 0) {
      return error(403, "你已被对方拉黑");
    }

    // 检查是否已关注
    const existingFollow = await db.collection('user_followee')
      .where({
        openId,
        followeeId,
        status: 1
      })
      .get();

    if (existingFollow.data.length > 0) {
      return error(400, "已关注该用户");
    }

    // 检查对方是否关注了我
    const beFollowedStatus = await db.collection('user_followee')
      .where({
        openId: followeeId,
        followeeId: openId,
        status: 1
      })
      .get();
    const isMutual = beFollowedStatus.data.length > 0;

    // 添加关注记录
    await db.collection('user_followee').add({
      data: {
        openId,
        followeeId,
        status: 1,
        createTime: new Date().valueOf(),
        ismutual: isMutual
      }
    });

    // 如果互相关注，更新对方的记录
    if (isMutual) {
      await db.collection('user_followee')
        .where({
          openId: followeeId,
          followeeId: openId,
          status: 1
        })
        .update({
          data: {
            ismutual: true
          }
        });
    }

    return success({});
  } catch (err) {
    console.error('[appFollowUser] error:', err);
    return error(500, err.message || "关注失败");
  }
}

/**
 * 取消关注用户
 */
async function UnfollowUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId: followeeId } = data || {};

    if (!followeeId) {
      return error(400, "缺少用户ID");
    }

    // 检查是否已关注
    const existingFollow = await db.collection('user_followee')
      .where({
        openId,
        followeeId,
        status: 1
      })
      .get();

    if (existingFollow.data.length === 0) {
      return error(400, "未关注该用户");
    }

    // 删除关注记录（标记为未关注）
    await db.collection('user_followee')
      .where({
        openId,
        followeeId,
        status: 1
      })
      .update({
        data: {
          status: 0
        }
      });

    // 如果之前是互相关注，更新对方的记录
    const beFollowedStatus = await db.collection('user_followee')
      .where({
        openId: followeeId,
        followeeId: openId,
        status: 1
      })
      .get();

    if (beFollowedStatus.data.length > 0) {
      await db.collection('user_followee')
        .where({
          openId: followeeId,
          followeeId: openId,
          status: 1
        })
        .update({
          data: {
            ismutual: false
          }
        });
    }

    return success({});
  } catch (err) {
    console.error('[appUnfollowUser] error:', err);
    return error(500, err.message || "取消关注失败");
  }
}

/**
 * 获取用户关注状态
 */
async function GetUserFollowStatus(event) {
  try {
    const { openId, data, db } = event;
    const { userId: otherUserId } = data || {};

    if (!otherUserId) {
      return error(400, "缺少用户ID");
    }

    if (openId === otherUserId) {
      return success({
        followStatus: 0
      });
    }

    const iFollowHim = await db.collection('user_followee')
      .where({
        openId,
        followeeId: otherUserId,
        status: 1
      })
      .get();

    const heFollowsMe = await db.collection('user_followee')
      .where({
        openId: otherUserId,
        followeeId: openId,
        status: 1
      })
      .get();

    let followStatus;
    if (iFollowHim.data.length > 0 && heFollowsMe.data.length > 0) {
      followStatus = 4;
    } else if (heFollowsMe.data.length > 0) {
      followStatus = 3;
    } else if (iFollowHim.data.length > 0) {
      followStatus = 2;
    } else {
      followStatus = 1;
    }

    return success({
      followStatus
    });
  } catch (err) {
    console.error('[appGetUserFollowStatus] error:', err);
    return error(500, err.message || "获取关注状态失败");
  }
}

/**
 * 获取用户列表（关注/粉丝）
 */
async function GetUserList(event) {
  try {
    const { openId, data, db } = event;
    const { type, openId: targetUserId, page = 1, limit = 20 } = data || {};

    if (!targetUserId) {
      return error(400, "缺少用户ID");
    }

    const skip = (page - 1) * limit;
    let query = {};
    let lookupField = '';

    if (type === 'follows' || type === 'follow') {
      query = {
        openId: targetUserId,
        status: 1
      };
      lookupField = 'followeeId';
    } else if (type === 'followers' || type === 'follower') {
      query = {
        followeeId: targetUserId,
        status: 1
      };
      lookupField = 'openId';
    } else if (type === 'charging') {
      return success({
        list: [],
        total: 0,
        hasMore: false
      });
    } else {
      return error(400, "无效的列表类型");
    }

    const followRecords = await db.collection('user_followee')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    if (followRecords.data.length === 0) {
      return success({
        list: [],
        total: 0,
        hasMore: false
      });
    }

    const userIds = followRecords.data.map(record => record[lookupField]);

    // 从 event 获取 _ 操作符
    const _ = event._ || db.command;
    const usersResult = await db.collection('user')
      .where({
        openId: _.in(userIds)
      })
      .get();

    const users = usersResult.data.map(user => ({
      id: user.openId,
      userName: user.nickName || '未知用户',
      avatar: user.avatarVisitUrl || user.avatarUrl || null,
      signature: user.signature || null,
      isVip: user.usersSecret && user.usersSecret[0] && user.usersSecret[0].vipStatus || false
    }));

    // 转换头像 cloud:// URL 为 HTTPS URL
    const avatarUrls = users.map(u => u.avatar).filter(url => isCloudUrl(url));
    if (avatarUrls.length > 0) {
      try {
        const urlResult = await cloud.getTempFileURL({ fileList: avatarUrls });
        const urlMap = {};
        if (urlResult.fileList) {
          urlResult.fileList.forEach(fileInfo => {
            if (fileInfo.status === 0 && fileInfo.tempFileURL) {
              urlMap[fileInfo.fileID] = fileInfo.tempFileURL;
            }
          });
        }
        users.forEach(u => {
          if (u.avatar && urlMap[u.avatar]) {
            u.avatar = urlMap[u.avatar];
          }
        });
      } catch (err) {
        console.warn('[appGetUserList] URL转换失败:', err.message);
      }
    }

    const totalResult = await db.collection('user_followee')
      .where(query)
      .count();
    const total = totalResult.total;

    return success({
      list: users,
      total: total,
      hasMore: skip + limit < total
    });
  } catch (err) {
    console.error('[appGetUserList] error:', err);
    return error(500, err.message || "获取用户列表失败");
  }
}

/**
 * 更新用户信息
 * 核心层: updateUserInfo
 */
async function UpdateUserInfo(event) {
  try {
    const { openId, data, db } = event;

    const updateData = {
      openId: openId
    };

    if (data.nickName !== undefined) updateData.nickName = data.nickName;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.birthDay !== undefined) updateData.birthDay = data.birthDay;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.signature !== undefined) updateData.signature = data.signature;
    if (data.gender !== undefined) updateData.gender = data.gender;

    console.log('[appUpdateUserInfo] 调用核心层参数:', updateData);

    const result = await cloud.callFunction({
      name: 'updateUserInfo',
      data: updateData
    });

    console.log('[appUpdateUserInfo] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '更新失败');
    }

    return success({});
  } catch (err) {
    console.error('[appUpdateUserInfo] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取充电列表
 * 核心层: getUserList, type='charging'
 */
async function GetChargeList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20 } = data || {};

    const targetOpenId = userId || openId;

    const result = await cloud.callFunction({
      name: 'getUserList',
      data: {
        openId: targetOpenId,
        ownOpenId: openId,
        type: 'charging',
        page: page,
        limit: limit
      }
    });

    console.log('[appGetChargeList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取充电列表失败');
    }

    return success({
      list: result.result.list || [],
      total: result.result.total || 0,
      hasMore: (result.result.list || []).length >= limit
    });
  } catch (err) {
    console.error('[appGetChargeList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取收藏列表
 * 核心层: getDynsListV2, type=13
 */
async function GetFavoriteList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20, publicTime } = data || {};

    const targetOpenId = userId || openId;

    const coreParams = {
      source: 'newApp', // 必须：让核心层使用 event.openId 而非 wxContext.OPENID
      openId: targetOpenId,
      ownOpenId: openId,
      type: 13, // 13=收藏列表
      limit: limit
    };

    if (publicTime) {
      coreParams.publicTime = publicTime;
    }

    console.log('[appGetFavoriteList] 调用核心层参数:', coreParams);

    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: coreParams
    });

    console.log('[appGetFavoriteList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取收藏列表失败');
    }

    const dynList = result.result.dynList || [];
    return success({
      list: dynList,
      total: result.result.count || 0,
      hasMore: dynList.length >= limit,
      publicTime: result.result.publicTime
    });
  } catch (err) {
    console.error('[appGetFavoriteList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取黑名单列表
 * 核心层: getUserList, type='black'
 */
async function GetBlackList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20 } = data || {};

    const targetOpenId = userId || openId;

    const result = await cloud.callFunction({
      name: 'getUserList',
      data: {
        openId: targetOpenId,
        ownOpenId: openId,
        type: 'black',
        page: page,
        limit: limit
      }
    });

    console.log('[appGetBlackList] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取黑名单失败');
    }

    return success({
      list: result.result.list || [],
      total: result.result.total || 0,
      hasMore: (result.result.list || []).length >= limit
    });
  } catch (err) {
    console.error('[appGetBlackList] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取邀请码
 * 核心层: getUserAbout, type=8
 */
async function GetInviteCode(event) {
  try {
    const { openId, data, db } = event;

    const result = await cloud.callFunction({
      name: 'getUserAbout',
      data: {
        type: 8,
        openId: openId,
        ownOpenId: openId
      }
    });

    console.log('[appGetInviteCode] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取邀请码失败');
    }

    const inviteCode = result.result.data || '';

    return success({ inviteCode });
  } catch (err) {
    console.error('[appGetInviteCode] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 获取邀请数量
 * 核心层: getUserAbout, type=6
 */
async function GetInviteCount(event) {
  try {
    const { openId, data, db } = event;

    const result = await cloud.callFunction({
      name: 'getUserAbout',
      data: {
        type: 6,
        openId: openId,
        ownOpenId: openId
      }
    });

    console.log('[appGetInviteCount] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取邀请数量失败');
    }

    const count = result.result.data?.inviteCount || 0;

    return success({ count });
  } catch (err) {
    console.error('[appGetInviteCount] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

/**
 * 更新VIP配置
 * 核心层: setUserInfo
 */
async function UpdateVipConfig(event) {
  try {
    const { openId, data, db } = event;
    const { vipConfig } = data || {};

    if (!vipConfig) {
      return error(400, "缺少VIP配置");
    }

    const result = await cloud.callFunction({
      name: 'setUserInfo',
      data: {
        openId: openId,
        vipConfig: vipConfig
      }
    });

    console.log('[appUpdateVipConfig] 核心层返回:', result.result);

    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '更新VIP配置失败');
    }

    return success({});
  } catch (err) {
    console.error('[appUpdateVipConfig] error:', err);
    return error(500, err.message || '服务器错误');
  }
}

module.exports = {
  GetCurrentUserProfile,
  GetUserProfile,
  GetUserDynList,
  ChargeUser,
  BlackUser,
  UnblackUser,
  FollowUser,
  UnfollowUser,
  GetUserFollowStatus,
  GetUserList,
  UpdateUserInfo,
  GetChargeList,
  GetFavoriteList,
  GetBlackList,
  GetInviteCode,
  GetInviteCount,
  UpdateVipConfig
};
