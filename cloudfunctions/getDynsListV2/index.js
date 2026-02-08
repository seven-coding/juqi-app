// 查询新动态
// 99.拉取管理员的动态列表 
// 1. 拉取单个电站列表
// 2. 拉取最新动态列表
// 3. 拉取其他用户的列表
// 4. 拉取自己的动态列表   
// 5. 话题拉取列表
// 6. 获取关注的人动态列表
// 7. 推荐动态列表
// 8. 电站列表
// 9. 电站精品列表
const cloud = require('wx-server-sdk')
const {
    getSquareList
} = require('./getSquareList');
const {
    getToday
} = require('./getToday');
const {
    getFollowDyns
} = require('./getFollowDyns');
const {
    getRecomDyns
} = require('./getRecomDyns');
const {
    getFocueCirlce
} = require('./getFocueCirlce');
const {
    getCircleBest
} = require('./getCircleBest');
const {
    getCircleDyns
} = require('./getCircleDyns');
const {
    getVerifyDyn
} = require('./getVerifyDyn');
const {
    errorCode
} = require('./errorCode');
const {
    getHotList
} = require('./getHotList');
const {
    getCircleOwnerList
} = require('./getCircleOwnerList');
const {
    getAdminDyns
} = require('./getAdminDyns');
const {
    getUserDyns
} = require('./getUserDyns');
const {
    getOtherDyns
} = require('./getOtherDyns');
const {
    getTopicDyns
} = require('./getTopicDyns');
const {
    getFavoriteDynList
} = require('./getFavoriteDynList');
const {
    getLikeDynList
} = require('./getLikeDynList');

const {
  getCircleHotList
} = require('./getCircleHotList');

// 不在顶层调用 cloud.init()，改为在 main 函数内根据 envId 动态初始化
// 这样可以确保每次请求都使用正确的环境

// 云函数入口函数          

exports.main = async (event, context) => {
    // 版本标识：用于验证部署是否生效
    const VERSION = '2.2.0-env-fix';
    
    // 根据 envId 初始化云开发环境（必须在调用任何子模块之前）
    const envId = event.envId || 'test-juqi-3g1m5qa7cc2737a1';
    cloud.init({ env: envId });
    console.log(`[getDynsListV2 v${VERSION}] 环境初始化完成 - envId: ${envId}, event.envId: ${event.envId}`);
    let {
        openId,
        type,
        verifyStatus,
        source,
        ownOpenId
    } = event;

    type = type * 1
    // 使用三元运算符简化赋值逻辑
    openId = openId || ownOpenId;
    console.log("开始拉取");

    // 根据source的存在与否来调整ownOpenId和openId的值
    if (source) {
        ownOpenId = event.ownOpenId || event.openId;
        openId = event.ownOpenId || openId;
    } else {
        const wxContext = cloud.getWXContext();
        ownOpenId = wxContext.OPENID;
        openId = openId || ownOpenId;
        console.log(event);
    }

    // 保证 ownOpenId 不为 undefined，避免 dealBlackDyn/getNoSeeList 中 .where({ openId }) 报错
    if (ownOpenId == null || ownOpenId === undefined) {
        ownOpenId = '';
    }
    if (openId == null || openId === undefined) {
        openId = ownOpenId || '';
    }

    // 动态拉取
    if (verifyStatus) {
        // 新人区
        let result = await getVerifyDyn(event, openId);
        return result;
    } else if (type == 99) {
        // 管理员查询，所有可见
        let result = await getAdminDyns(event, openId);
        return result;
    } else if (type == 1) {
        // 拉取单个电站列表
        let result = await getCircleDyns(event, ownOpenId);
        return result;
    } else if (type == 2) {
        // 拉取最新动态列表
        let result = await getSquareList(event, ownOpenId);
        return result;
    } else if (type == 3) {
        // 查询别人,风险控制在1,2
        let result = await getOtherDyns(event, ownOpenId);
        return result;
    } else if (type == 4) {
        // 查看个人主页动态
        let result = await getUserDyns(event, ownOpenId, openId);
        return result;
    } else if (type == 5) {
        // 话题查询
        let result = await getTopicDyns(event, ownOpenId);
        return result;
    } else if (type == 6) {
        // 关注的人
        let result = await getFollowDyns(event, ownOpenId);
        return result;
    } else if (type == 7) {
        // 获取各个圈子的推荐帖子
        let result = await getRecomDyns(event, ownOpenId);
        return result;
    } else if (type == 8) {
        // 获取关注电站
        let result = await getFocueCirlce(event, ownOpenId);
        return result;
    } else if (type == 9) {
        // 获取单个电站加精
        let result = await getCircleBest(event, ownOpenId);
        return result;
    } else if (type == 10) {
        // 获取热榜数据
        let result = await getHotList(event, ownOpenId);
        return result;
    } else if (type == 11) {
        // 获取电站橘长动态
        let result = await getCircleOwnerList(event, ownOpenId);
        return result;
    } else if (type == 12) {
        // 拉取最新动态列表
        let result = await getToday(event, ownOpenId);
        return result;
    } else if (type == 13) {
        // 拉取收藏列表
        let result = await getFavoriteDynList(event, ownOpenId);
        return result;
    } else if (type == 14) {
        // 拉取充电帖子列表
        let result = await getLikeDynList(event, openId);
        return result;
    } else if (type == 15) {
        // 获取单个电站热榜
        let result = await getCircleHotList(event, openId);
        return result;
  } else {
        // 默认拉取最新动态列表
        let result = await getSquareList(event, ownOpenId);
        return result;
    }
}