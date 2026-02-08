# App云函数开发任务清单

## 文档说明

本文档提供详细的云函数开发任务清单，每个任务包含具体的开发步骤、代码示例和测试要求。

---

## 第一阶段：核心功能（P0）

### 1. dyn模块 - 动态相关

#### 任务1.1: appGetDynList - 获取动态列表

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: `getDynsListV2`  
**调用页面**: HomeView, DiscoverView, CircleDetailView

**开发步骤**:
1. 在`appApi/modules/dyn.js`中实现`appGetDynList`函数
2. 参数标准化：
   - 从event中获取openId（已由入口层解析）
   - 将App的type参数转换为核心层格式
   - 处理page和limit参数
3. 调用核心层`getDynsListV2`，不传递source参数
4. 数据格式转换：
   - 将`dynList`转换为`list`
   - 将`count`转换为`total`
   - 计算`hasMore`
5. 返回App格式响应

**代码示例**:
```javascript
async function appGetDynList(event) {
  try {
    const { openId, data, db } = event;
    const { type, page = 1, limit = 20, circleId, topic, publicTime } = data;
    
    if (!type) {
      return error(400, "缺少type参数");
    }
    
    // type参数映射：将App的字符串类型转换为数字
    const typeMap = {
      'all': 2,      // 最新动态（广场）
      'follow': 6,   // 关注动态
      'circle': 1,   // 圈子动态
      'topic': 5     // 话题动态
    };
    
    const coreType = typeof type === 'string' ? typeMap[type] : type;
    
    if (!coreType) {
      return error(400, "缺少type参数或type参数无效");
    }
    
    // 参数标准化
    const coreParams = {
      openId: openId,
      ownOpenId: openId,
      type: coreType,  // 数字类型，不是字符串
      limit: limit
    };
    
    // 分页参数处理
    if (publicTime) {
      coreParams.publicTime = publicTime;
    }
    
    // 根据type添加特定参数
    if (coreType === 1 && circleId) {
      coreParams.circleId = circleId;
    }
    if (coreType === 5 && topic) {
      coreParams.topic = topic;
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: coreParams
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取动态列表失败');
    }
    
    // 数据格式转换
    return success({
      list: result.result.dynList || [],
      total: result.result.count || 0,
      hasMore: (result.result.dynList || []).length >= limit
    });
  } catch (err) {
    console.error('appGetDynList error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试type=all（全部动态）
- [ ] 测试type=follow（关注动态）
- [ ] 测试type=circle（圈子动态）
- [ ] 测试type=topic（话题动态）
- [ ] 测试分页功能
- [ ] 测试参数校验
- [ ] 测试错误处理

---

#### 任务1.2: appGetDynDetail - 获取动态详情

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: `getDynDetail`  
**调用页面**: PostDetailView, FavoriteListView

**开发步骤**:
1. 在`appApi/modules/dyn.js`中实现`appGetDynDetail`函数
2. 参数标准化：将App的id参数传递给核心层
3. 调用核心层`getDynDetail`
4. 数据格式转换：转换为App所需的Post格式
5. 返回App格式响应

**代码示例**:
```javascript
async function appGetDynDetail(event) {
  try {
    const { openId, data, db } = event;
    const { id } = data;
    
    if (!id) {
      return error(400, "缺少动态ID");
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getDynDetail',
      data: {
        id: id,
        openId: openId,
        ownOpenId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取动态详情失败');
    }
    
    // 数据格式转换
    const dynData = result.result.data;
    return success({
      id: dynData._id,
      content: dynData.dynContent,
      images: dynData.imageIds || [],
      video: dynData.dynVideo,
      // ... 其他字段转换
    });
  } catch (err) {
    console.error('appGetDynDetail error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试正常获取动态详情
- [ ] 测试动态不存在的情况
- [ ] 测试权限控制（如被拉黑）
- [ ] 测试数据格式转换

---

#### 任务1.3: appPublishDyn - 发布动态

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: `publishDyn`  
**调用页面**: PublishView

**开发步骤**:
1. 在`appApi/modules/dyn.js`中实现`appPublishDyn`函数
2. 参数标准化：将App参数转换为核心层格式
3. 调用核心层`publishDyn`
4. 返回App格式响应

**代码示例**:
```javascript
async function appPublishDyn(event) {
  try {
    const { openId, data, db } = event;
    const { 
      dynContent, 
      circleId, 
      circleTitle, 
      imageIds = [], 
      topic = [], 
      ait = [],
      music,
      dynVideo
    } = data;
    
    if (!dynContent && imageIds.length === 0 && !dynVideo) {
      return error(400, "动态内容不能为空");
    }
    
    if (!circleId || !circleTitle) {
      return error(400, "缺少圈子信息");
    }
    
    // 参数标准化
    const coreParams = {
      openId: openId,
      dynContent: dynContent,
      circleId: circleId,
      circleTitle: circleTitle,
      imageIds: imageIds,
      topic: topic,
      ait: ait
    };
    
    if (music) {
      coreParams.musicPoster = music.musicPoster;
      coreParams.musicName = music.musicName;
      coreParams.musicId = music.musicId;
      coreParams.musicAuthor = music.musicAuthor;
      coreParams.musicSrc = music.musicSrc;
      coreParams.isAudioShow = music.isAudioShow;
    }
    
    if (dynVideo) {
      coreParams.dynVideo = dynVideo;
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'publishDyn',
      data: coreParams
    });
    
    if (result.result.code !== 200 && result.result.code !== 201) {
      return error(result.result.code || 500, result.result.message || '发布动态失败');
    }
    
    return success({
      dynId: result.result.dynId,
      requestID: result.result.requestID,
      code: result.result.code,
      message: result.result.message
    });
  } catch (err) {
    console.error('appPublishDyn error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试发布纯文本动态
- [ ] 测试发布图片动态
- [ ] 测试发布视频动态
- [ ] 测试发布带话题的动态
- [ ] 测试发布带@用户的动态
- [ ] 测试投稿功能（code=201）
- [ ] 测试参数校验

---

#### 任务1.4: appLikeDyn - 点赞动态

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: `likeOrUnlikeV2`  
**调用页面**: PostDetailView, PostCardView

**开发步骤**:
1. 在`appApi/modules/dyn.js`中实现`appLikeDyn`函数
2. 参数标准化：将App的id参数转换为核心层格式
3. 调用核心层`likeOrUnlikeV2`，type=1（点赞动态）
4. 返回App格式响应

**代码示例**:
```javascript
async function appLikeDyn(event) {
  try {
    const { openId, data, db } = event;
    const { id } = data;
    
    if (!id) {
      return error(400, "缺少动态ID");
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'likeOrUnlikeV2',
      data: {
        id: id,
        type: 1, // 1=点赞动态
        openId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '点赞失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appLikeDyn error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试点赞功能
- [ ] 测试取消点赞（如果支持）
- [ ] 测试重复点赞处理
- [ ] 测试权限控制

---

#### 任务1.5: appChargeDyn - 充电动态

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: `likeOrUnlikeV2`  
**调用页面**: PostDetailView, PostCardView

**开发步骤**:
1. 在`appApi/modules/dyn.js`中实现`appChargeDyn`函数
2. 参数标准化：将App的id参数转换为核心层格式
3. 调用核心层`likeOrUnlikeV2`，type=2（充电动态）
4. 返回App格式响应

**代码示例**:
```javascript
async function appChargeDyn(event) {
  try {
    const { openId, data, db } = event;
    const { id } = data;
    
    if (!id) {
      return error(400, "缺少动态ID");
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'likeOrUnlikeV2',
      data: {
        id: id,
        type: 2, // 2=充电动态
        openId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '充电失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appChargeDyn error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试充电功能
- [ ] 测试每日充电限制
- [ ] 测试权限控制

---

#### 任务1.6: appDeleteDyn - 删除动态

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `delDyn`  
**调用页面**: PostDetailView

**开发步骤**:
1. 在`appApi/modules/dyn.js`中实现`appDeleteDyn`函数
2. 参数标准化：将App的id参数转换为核心层格式
3. 调用核心层`delDyn`，type=1（删除动态）
4. 返回App格式响应

**代码示例**:
```javascript
async function appDeleteDyn(event) {
  try {
    const { openId, data, db } = event;
    const { id } = data;
    
    if (!id) {
      return error(400, "缺少动态ID");
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'delDyn',
      data: {
        id: id,
        type: 1, // 1=删除动态
        openId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '删除失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appDeleteDyn error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试删除自己的动态
- [ ] 测试删除权限控制
- [ ] 测试删除后的数据状态

---

### 2. user模块 - 用户相关（核心功能）

#### 任务2.1: appGetCurrentUserProfile - 获取当前用户信息

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: `login` (getOwnInfo)  
**调用页面**: ProfileView, UserProfileView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appGetCurrentUserProfile`函数
2. 调用核心层`login`，operation='getOwnInfo'
3. 确保返回会员状态
4. 数据格式转换
5. 返回App格式响应

**代码示例**:
```javascript
async function appGetCurrentUserProfile(event) {
  try {
    const { openId, data, db } = event;
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'login',
      data: {
        operation: 'getOwnInfo',
        openId: openId,
        ownOpenId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取用户信息失败');
    }
    
    const userInfo = result.result.userInfo;
    
    // 确保返回会员状态
    const profile = {
      id: userInfo._id,
      openId: userInfo.openId,
      nickName: userInfo.nickName,
      avatar: userInfo.avatar,
      // ... 其他字段
      usersSecret: [{
        vipStatus: userInfo.vipStatus || false,
        vipStartTime: userInfo.vipStartTime || 0,
        vipEndTime: userInfo.vipEndTime || 0,
        vipConfig: userInfo.vipConfig || {}
      }]
    };
    
    return success({ userInfo: profile });
  } catch (err) {
    console.error('appGetCurrentUserProfile error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取当前用户信息
- [ ] 测试会员状态返回
- [ ] 测试数据格式转换

---

#### 任务2.2: appGetUserProfile - 获取用户主页信息

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: `getUserAbout`  
**调用页面**: UserProfileView, QRCodeView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appGetUserProfile`函数
2. 参数标准化：将App的userId转换为openId
3. 调用核心层`getUserAbout`
4. 确保返回会员状态（仅自己的信息）
5. 数据格式转换
6. 返回App格式响应

**代码示例**:
```javascript
async function appGetUserProfile(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data;
    
    if (!userId) {
      return error(400, "缺少用户ID");
    }
    
    // 调用核心层 - 使用commonRequest获取用户基本信息
    const userInfoResult = await cloud.callFunction({
      name: 'commonRequest',
      data: {
        method: 'get_user_info',
        openId: userId
      }
    });
    
    if (!userInfoResult.result || userInfoResult.result === '') {
      return error(404, "用户不存在");
    }
    
    const userData = userInfoResult.result;
    
    // 获取关注状态和拉黑状态（如果不是自己的信息）
    let followStatus = 1; // 默认未关注
    let blackStatus = 1;  // 默认未拉黑
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
      
      if (operateResult.result && operateResult.result.code === 200) {
        followStatus = operateResult.result.followStatus || 1;
        blackStatus = operateResult.result.blackStatus || 1;
        isInvisible = operateResult.result.isInvisible || false;
      }
    }
    
    // 数据格式转换
    const profile = {
      id: userData._id,
      openId: userData.openId,
      nickName: userData.nickName,
      avatar: userData.avatarUrl || userData.avatar,
      city: userData.city,
      birthDay: userData.birthDay,
      // ... 其他字段
      followStatus: followStatus,
      blackStatus: blackStatus,
      isInvisible: isInvisible
    };
    
    // 如果是自己的信息，返回会员状态
    if (userId === openId && userData.usersSecret && userData.usersSecret.length > 0) {
      profile.usersSecret = userData.usersSecret;
    }
    
    return success({ 
      userInfo: profile,
      isInvisible: isInvisible
    });
  } catch (err) {
    console.error('appGetUserProfile error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取他人用户信息
- [ ] 测试获取自己用户信息（包含会员状态）
- [ ] 测试关注状态返回
- [ ] 测试拉黑状态返回

---

#### 任务2.3: appGetUserDynList - 获取用户动态列表

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: `getDynsListV2`  
**调用页面**: UserProfileView, ProfileView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appGetUserDynList`函数
2. 参数标准化：将App的userId转换为openId
3. 调用核心层`getDynsListV2`，type=4（用户动态）
4. 数据格式转换
5. 返回App格式响应

**代码示例**:
```javascript
async function appGetUserDynList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20 } = data;
    
    // 如果未提供userId，则获取当前用户的动态
    const targetOpenId = userId || openId;
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: {
        openId: targetOpenId,
        ownOpenId: openId,
        type: 4, // 4=用户动态列表
        page: page,
        limit: limit
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取用户动态列表失败');
    }
    
    // 数据格式转换
    return success({
      list: result.result.dynList || [],
      total: result.result.count || 0,
      hasMore: (result.result.dynList || []).length >= limit
    });
  } catch (err) {
    console.error('appGetUserDynList error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取自己的动态列表
- [ ] 测试获取他人的动态列表
- [ ] 测试分页功能
- [ ] 测试权限控制

---

#### 任务2.4: appChargeUser - 给用户充电

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: `chargeHer`  
**调用页面**: UserProfileView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appChargeUser`函数
2. 参数标准化：将App的userId转换为chargeOpenId
3. 调用核心层`chargeHer`
4. 返回App格式响应

**代码示例**:
```javascript
async function appChargeUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data;
    
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
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '充电失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appChargeUser error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试给用户充电
- [ ] 测试每日充电限制
- [ ] 测试不能给自己充电
- [ ] 测试权限控制

---

#### 任务2.5: appBlackUser / appUnblackUser - 拉黑/取消拉黑

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `setUser`  
**调用页面**: UserProfileView, BlackListView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appBlackUser`和`appUnblackUser`函数
2. 参数标准化：将App的userId转换为blackId/unBlackId
3. 调用核心层`setUser`，type=1（拉黑）或type=2（取消拉黑）
4. 返回App格式响应

**代码示例**:
```javascript
async function appBlackUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data;
    
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
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '拉黑失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appBlackUser error:', err);
    return error(500, err.message || '服务器错误');
  }
}

async function appUnblackUser(event) {
  try {
    const { openId, data, db } = event;
    const { userId } = data;
    
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
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '取消拉黑失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appUnblackUser error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试拉黑用户
- [ ] 测试取消拉黑
- [ ] 测试不能拉黑自己
- [ ] 测试拉黑后的权限控制

---

### 3. upload模块 - 上传相关

#### 任务3.1: appUploadImage - 上传图片

**优先级**: P0  
**状态**: ❌ 待开发  
**核心层云函数**: 云存储上传  
**调用页面**: PublishView, ProfileView

**开发步骤**:
1. 在`appApi/modules/upload.js`中实现`appUploadImage`函数
2. 接收图片数据（base64或文件路径）
3. 上传到云存储
4. 返回图片URL

**代码示例**:
```javascript
async function appUploadImage(event) {
  try {
    const { openId, data, db } = event;
    const { imageData, category = 'dyn' } = data; // imageData为base64字符串
    
    if (!imageData) {
      return error(400, "缺少图片数据");
    }
    
    // 将base64转换为Buffer
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // 生成文件名
    const fileName = `${category}/${openId}_${Date.now()}.jpg`;
    
    // 上传到云存储
    const result = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: imageBuffer
    });
    
    if (!result.fileID) {
      return error(500, "上传失败");
    }
    
    // 返回图片URL
    return success({
      url: result.fileID
    });
  } catch (err) {
    console.error('appUploadImage error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试上传图片
- [ ] 测试图片格式校验
- [ ] 测试图片大小限制
- [ ] 测试返回URL格式

---

## 第二阶段：重要功能（P1）

### 4. user模块 - 扩展功能

#### 任务4.1: appUpdateUserInfo - 更新用户信息

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `updateUserInfo`  
**调用页面**: ProfileView, SettingsView, PersonalizationSettingsView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appUpdateUserInfo`函数
2. 参数标准化：将App参数转换为核心层格式
3. 调用核心层`updateUserInfo`
4. 返回App格式响应

**代码示例**:
```javascript
async function appUpdateUserInfo(event) {
  try {
    const { openId, data, db } = event;
    
    // 参数标准化
    const updateData = {
      openId: openId
    };
    
    // 根据传入的数据更新对应字段
    if (data.nickName !== undefined) updateData.nickName = data.nickName;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.birthDay !== undefined) updateData.birthDay = data.birthDay;
    if (data.city !== undefined) updateData.city = data.city;
    // ... 其他字段
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'updateUserInfo',
      data: updateData
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '更新失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appUpdateUserInfo error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试更新昵称
- [ ] 测试更新头像
- [ ] 测试更新其他信息
- [ ] 测试参数校验

---

#### 任务4.2: appGetChargeList - 获取充电列表

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `getUserList` (type=charging)  
**调用页面**: ProfileView, ChargeListView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appGetChargeList`函数
2. 参数标准化：将App的userId转换为openId
3. 调用核心层`getUserList`，type='charging'
4. 数据格式转换
5. 返回App格式响应

**代码示例**:
```javascript
async function appGetChargeList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20 } = data;
    
    const targetOpenId = userId || openId;
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getUserList',
      data: {
        openId: targetOpenId,
        ownOpenId: openId,
        type: 'charging', // 充电列表
        page: page,
        limit: limit
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取充电列表失败');
    }
    
    // 数据格式转换
    return success({
      list: result.result.list || [],
      total: result.result.total || 0,
      hasMore: (result.result.list || []).length >= limit
    });
  } catch (err) {
    console.error('appGetChargeList error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取充电列表
- [ ] 测试分页功能
- [ ] 测试数据格式转换

---

#### 任务4.3: appGetFavoriteList - 获取收藏列表

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `getDynsListV2` (type=13)  
**调用页面**: ProfileView, FavoriteListView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appGetFavoriteList`函数
2. 参数标准化：将App的userId转换为openId
3. 调用核心层`getDynsListV2`，type=13（收藏列表）
4. 数据格式转换
5. 返回App格式响应

**代码示例**:
```javascript
async function appGetFavoriteList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20 } = data;
    
    const targetOpenId = userId || openId;
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: {
        openId: targetOpenId,
        ownOpenId: openId,
        type: 13, // 13=收藏列表
        page: page,
        limit: limit
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取收藏列表失败');
    }
    
    // 数据格式转换
    return success({
      list: result.result.dynList || [],
      total: result.result.count || 0,
      hasMore: (result.result.dynList || []).length >= limit
    });
  } catch (err) {
    console.error('appGetFavoriteList error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取收藏列表
- [ ] 测试分页功能
- [ ] 测试数据格式转换

---

#### 任务4.4: appGetBlackList - 获取黑名单

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `getUserList` (type=black)  
**调用页面**: ProfileView, BlackListView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appGetBlackList`函数
2. 参数标准化：将App的userId转换为openId
3. 调用核心层`getUserList`，type='black'
4. 数据格式转换
5. 返回App格式响应

**代码示例**:
```javascript
async function appGetBlackList(event) {
  try {
    const { openId, data, db } = event;
    const { userId, page = 1, limit = 20 } = data;
    
    const targetOpenId = userId || openId;
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getUserList',
      data: {
        openId: targetOpenId,
        ownOpenId: openId,
        type: 'black', // 黑名单
        page: page,
        limit: limit
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取黑名单失败');
    }
    
    // 数据格式转换
    return success({
      list: result.result.list || [],
      total: result.result.total || 0,
      hasMore: (result.result.list || []).length >= limit
    });
  } catch (err) {
    console.error('appGetBlackList error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取黑名单
- [ ] 测试分页功能
- [ ] 测试数据格式转换

---

#### 任务4.5: appGetInviteCode / appGetInviteCount - 邀请相关

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `getUserAbout`  
**调用页面**: ProfileView, QRCodeView, InviteFriendsView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appGetInviteCode`和`appGetInviteCount`函数
2. 调用核心层`getUserAbout`，获取邀请码和邀请数量
3. 数据格式转换
4. 返回App格式响应

**代码示例**:
```javascript
async function appGetInviteCode(event) {
  try {
    const { openId, data, db } = event;
    
    // 调用核心层 - type=8用于发送/获取邀请码
    const result = await cloud.callFunction({
      name: 'getUserAbout',
      data: {
        type: 8,  // 8=发送邀请码（会返回邀请码）
        openId: openId,
        ownOpenId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取邀请码失败');
    }
    
    // 从返回数据中提取邀请码
    const inviteCode = result.result.data || '';
    
    return success({ inviteCode });
  } catch (err) {
    console.error('appGetInviteCode error:', err);
    return error(500, err.message || '服务器错误');
  }
}

async function appGetInviteCount(event) {
  try {
    const { openId, data, db } = event;
    
    // 调用核心层 - type=6用于获取用户其他信息（包含邀请数量）
    const result = await cloud.callFunction({
      name: 'getUserAbout',
      data: {
        type: 6,  // 6=获取用户其他信息（收藏、邀请、拉黑计数）
        openId: openId,
        ownOpenId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取邀请数量失败');
    }
    
    // 从返回数据中提取邀请数量
    const count = result.result.data?.inviteCount || 0;
    
    return success({ count });
  } catch (err) {
    console.error('appGetInviteCount error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取邀请码
- [ ] 测试获取邀请数量
- [ ] 测试数据格式转换

---

#### 任务4.6: appUpdateVipConfig - 更新VIP配置

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `setUserInfo`  
**调用页面**: SettingsView, PersonalizationSettingsView

**开发步骤**:
1. 在`appApi/modules/user.js`中实现`appUpdateVipConfig`函数
2. 参数标准化：将App的vipConfig转换为核心层格式
3. 调用核心层`setUserInfo`
4. 返回App格式响应

**代码示例**:
```javascript
async function appUpdateVipConfig(event) {
  try {
    const { openId, data, db } = event;
    const { vipConfig } = data;
    
    if (!vipConfig) {
      return error(400, "缺少VIP配置");
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'setUserInfo',
      data: {
        openId: openId,
        vipConfig: vipConfig
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '更新VIP配置失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appUpdateVipConfig error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试更新VIP配置
- [ ] 测试参数校验
- [ ] 测试权限控制（仅会员可用）

---

### 5. circle模块 - 圈子相关

#### 任务5.1: appGetCircleList - 获取圈子列表

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `getCircle`  
**调用页面**: PublishView

**开发步骤**:
1. 在`appApi/modules/circle.js`中实现`appGetCircleList`函数
2. 调用核心层`getCircle`
3. 数据格式转换
4. 返回App格式响应

**代码示例**:
```javascript
async function appGetCircleList(event) {
  try {
    const { openId, data, db } = event;
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getCircle',
      data: {
        openId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取圈子列表失败');
    }
    
    // 数据格式转换
    return success({
      list: result.result.data || []
    });
  } catch (err) {
    console.error('appGetCircleList error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取圈子列表
- [ ] 测试数据格式转换

---

#### 任务5.2: appGetCircleDetail - 获取圈子详情

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `getCircleDetail`  
**调用页面**: CircleDetailView

**开发步骤**:
1. 在`appApi/modules/circle.js`中实现`appGetCircleDetail`函数
2. 参数标准化：将App的circleId转换为核心层格式
3. 调用核心层`getCircleDetail`
4. 数据格式转换
5. 返回App格式响应

**代码示例**:
```javascript
async function appGetCircleDetail(event) {
  try {
    const { openId, data, db } = event;
    const { circleId } = data;
    
    if (!circleId) {
      return error(400, "缺少圈子ID");
    }
    
    // 调用核心层 - 注意参数名是id，不是circleId
    const result = await cloud.callFunction({
      name: 'getCircleDetail',
      data: {
        id: circleId,  // 参数名是id，不是circleId
        openId: openId,
        ownOpenId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取圈子详情失败');
    }
    
    // 数据格式转换
    return success({
      circle: result.result.data
    });
  } catch (err) {
    console.error('appGetCircleDetail error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取圈子详情
- [ ] 测试数据格式转换

---

#### 任务5.3: appJoinCircle / appQuitCircle - 加入/退出圈子

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `setJoinCircle`  
**调用页面**: CircleDetailView

**开发步骤**:
1. 在`appApi/modules/circle.js`中实现`appJoinCircle`和`appQuitCircle`函数
2. 参数标准化：将App的circleId转换为核心层格式
3. 调用核心层`setJoinCircle`，type=1（加入）或type=2（退出）
4. 返回App格式响应

**代码示例**:
```javascript
async function appJoinCircle(event) {
  try {
    const { openId, data, db } = event;
    const { circleId } = data;
    
    if (!circleId) {
      return error(400, "缺少圈子ID");
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'setJoinCircle',
      data: {
        circleId: circleId,
        type: 1, // 1=加入圈子
        openId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '加入圈子失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appJoinCircle error:', err);
    return error(500, err.message || '服务器错误');
  }
}

async function appQuitCircle(event) {
  try {
    const { openId, data, db } = event;
    const { circleId } = data;
    
    if (!circleId) {
      return error(400, "缺少圈子ID");
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'setJoinCircle',
      data: {
        circleId: circleId,
        type: 2, // 2=退出圈子
        openId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '退出圈子失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appQuitCircle error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试加入圈子
- [ ] 测试退出圈子
- [ ] 测试重复加入处理
- [ ] 测试权限控制

---

#### 任务5.4: appCreateTopic - 创建话题

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `setTopic`  
**调用页面**: PublishView

**开发步骤**:
1. 在`appApi/modules/circle.js`中实现`appCreateTopic`函数
2. 参数标准化：将App的topic参数转换为核心层格式
3. 调用核心层`setTopic`
4. 返回App格式响应

**代码示例**:
```javascript
async function appCreateTopic(event) {
  try {
    const { openId, data, db } = event;
    const { topic } = data;
    
    if (!topic) {
      return error(400, "缺少话题名称");
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'setTopic',
      data: {
        topic: topic,
        openId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '创建话题失败');
    }
    
    // 数据格式转换
    return success({
      topic: result.result.data
    });
  } catch (err) {
    console.error('appCreateTopic error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试创建话题
- [ ] 测试话题名称校验
- [ ] 测试重复话题处理

---

### 6. search模块 - 搜索相关

#### 任务6.1: appSearchUser - 搜索用户

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `getRearch` (type=user)  
**调用页面**: SearchView

**开发步骤**:
1. 在`appApi/modules/search.js`中实现`appSearchUser`函数
2. 参数标准化：将App的keyword参数转换为核心层格式
3. 调用核心层`getRearch`，type='user'
4. 数据格式转换
5. 返回App格式响应

**代码示例**:
```javascript
async function appSearchUser(event) {
  try {
    const { openId, data, db } = event;
    const { keyword, page = 1, limit = 20 } = data;
    
    if (!keyword) {
      return error(400, "缺少搜索关键词");
    }
    
    // 调用核心层 - type参数是数字，不是字符串
    const result = await cloud.callFunction({
      name: 'getRearch',
      data: {
        keyword: keyword,
        type: 1,  // 1=搜索用户（数字类型）
        page: page,
        limit: limit,
        openId: openId,
        ownOpenId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '搜索失败');
    }
    
    // 数据格式转换
    return success({
      list: result.result.data || [],
      total: result.result.count || 0,
      hasMore: (result.result.data || []).length >= limit
    });
  } catch (err) {
    console.error('appSearchUser error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试搜索用户
- [ ] 测试分页功能
- [ ] 测试空结果处理

---

#### 任务6.2: appSearchDyn - 搜索动态

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `getRearch` (type=dyn)  
**调用页面**: SearchView

**开发步骤**:
1. 在`appApi/modules/search.js`中实现`appSearchDyn`函数
2. 参数标准化：将App的keyword参数转换为核心层格式
3. 调用核心层`getRearch`，type='dyn'
4. 数据格式转换
5. 返回App格式响应

**代码示例**:
```javascript
async function appSearchDyn(event) {
  try {
    const { openId, data, db } = event;
    const { keyword, page = 1, limit = 20 } = data;
    
    if (!keyword) {
      return error(400, "缺少搜索关键词");
    }
    
    // 调用核心层 - type参数是数字，不是字符串
    const result = await cloud.callFunction({
      name: 'getRearch',
      data: {
        keyword: keyword,
        type: 2,  // 2=搜索动态（数字类型）
        page: page,
        limit: limit,
        openId: openId,
        ownOpenId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '搜索失败');
    }
    
    // 数据格式转换
    return success({
      list: result.result.data || [],
      total: result.result.count || 0,
      hasMore: (result.result.data || []).length >= limit
    });
  } catch (err) {
    console.error('appSearchDyn error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试搜索动态
- [ ] 测试分页功能
- [ ] 测试空结果处理

---

#### 任务6.3: appSearchTopic - 搜索话题

**优先级**: P1  
**状态**: ❌ 待开发  
**核心层云函数**: `getRearch` (type=topic)  
**调用页面**: SearchView, DiscoverView, PublishView

**开发步骤**:
1. 在`appApi/modules/search.js`中实现`appSearchTopic`函数
2. 参数标准化：将App的keyword参数转换为核心层格式
3. 调用核心层`getRearch`，type='topic'
4. 数据格式转换
5. 返回App格式响应

**代码示例**:
```javascript
async function appSearchTopic(event) {
  try {
    const { openId, data, db } = event;
    const { keyword, page = 1, limit = 20 } = data;
    
    // keyword可选，不传则返回话题列表
    // 注意：如果没有keyword，应该调用getTopic获取话题列表，而不是getRearch
    if (!keyword) {
      // 无关键词时，调用getTopic获取话题列表
      const result = await cloud.callFunction({
        name: 'getTopic',
        data: {
          openId: openId
        }
      });
      
      if (result.result.code !== 200) {
        return error(result.result.code || 500, result.result.message || '获取话题列表失败');
      }
      
      return success({
        list: result.result.data || [],
        total: result.result.data?.length || 0,
        hasMore: false
      });
    }
    
    // 有关键词时，调用getRearch搜索话题
    const result = await cloud.callFunction({
      name: 'getRearch',
      data: {
        keyword: keyword,
        type: 3,  // 3=搜索话题（数字类型）
        page: page,
        limit: limit,
        openId: openId,
        ownOpenId: openId
      }
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '搜索失败');
    }
    
    // 数据格式转换
    return success({
      list: result.result.data || [],
      total: result.result.count || 0,
      hasMore: (result.result.data || []).length >= limit
    });
  } catch (err) {
    console.error('appSearchTopic error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试搜索话题
- [ ] 测试获取话题列表（无keyword）
- [ ] 测试分页功能

---

## 第三阶段：消息功能统一（P1 - 架构优化）

### 7. message模块 - 消息相关

#### 任务7.1: appGetMessageList - 获取消息列表

**优先级**: P1（架构优化）  
**状态**: ❌ 待开发  
**核心层云函数**: `getMessagesNew`  
**调用页面**: MessageView, MessageDetailView, ChargeMessageView, CommentMessageView, AtMessageView, VisitorMessageView

**开发步骤**:
1. 在`appApi/modules/message.js`中实现`appGetMessageList`函数
2. 参数标准化：将App参数转换为核心层格式
3. 调用核心层`getMessagesNew`
4. 数据格式转换
5. 返回App格式响应
6. 修改app客户端代码，改为调用`appGetMessageList`

**代码示例**:
```javascript
async function appGetMessageList(event) {
  try {
    const { openId, data, db } = event;
    const { page = 1, limit = 20, type, from } = data;
    
    // 参数标准化
    const coreParams = {
      openId: openId,
      ownOpenId: openId,
      page: page,
      limit: limit
    };
    
    if (type !== undefined) {
      coreParams.type = type;
    }
    
    if (from) {
      coreParams.from = from;
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'getMessagesNew',
      data: coreParams
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取消息列表失败');
    }
    
    // 数据格式转换
    return success({
      messages: result.result.messages || [],
      count: result.result.count || 0,
      notReadCount: result.result.notReadCount || {}
    });
  } catch (err) {
    console.error('appGetMessageList error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试获取全部消息列表
- [ ] 测试按类型获取消息（充电、评论、艾特、访客）
- [ ] 测试获取指定发送者的消息
- [ ] 测试分页功能
- [ ] 测试未读数量返回

---

#### 任务7.2: appSetMessage - 设置消息状态

**优先级**: P1（架构优化）  
**状态**: ❌ 待开发  
**核心层云函数**: `setMessage`  
**调用页面**: MessageView, MessageDetailView

**开发步骤**:
1. 在`appApi/modules/message.js`中实现`appSetMessage`函数
2. 参数标准化：将App参数转换为核心层格式
3. 调用核心层`setMessage`
4. 返回App格式响应
5. 修改app客户端代码，改为调用`appSetMessage`

**代码示例**:
```javascript
async function appSetMessage(event) {
  try {
    const { openId, data, db } = event;
    const { mesTypeId, mesType, status, grouptype, messFromType } = data;
    
    if (!mesTypeId || mesType === undefined || status === undefined) {
      return error(400, "缺少必需参数");
    }
    
    // 参数标准化
    const coreParams = {
      type: 1, // 1=设置消息状态
      status: status, // 1=已读，3=删除
      mesTypeId: mesTypeId,
      mesType: mesType,
      openId: openId
    };
    
    if (grouptype !== undefined) {
      coreParams.grouptype = grouptype;
    }
    
    if (messFromType !== undefined) {
      coreParams.messFromType = messFromType;
    }
    
    // 调用核心层
    const result = await cloud.callFunction({
      name: 'setMessage',
      data: coreParams
    });
    
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '设置消息状态失败');
    }
    
    return success({});
  } catch (err) {
    console.error('appSetMessage error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

**测试要求**:
- [ ] 测试标记消息已读
- [ ] 测试删除消息
- [ ] 测试参数校验

---

#### 任务7.3: 修改app客户端代码

**优先级**: P1（架构优化）  
**状态**: ❌ 待开发

**开发步骤**:
1. 修改`MessageViewModel.swift`，改为调用`appGetMessageList`
2. 修改`MessageCategoryViewModel.swift`，改为调用`appGetMessageList`
3. 修改`APIService.swift`，添加`appGetMessageList`和`appSetMessage`方法
4. 测试所有消息相关功能

**代码修改示例**:
```swift
// APIService.swift
func getMessages(page: Int = 1, limit: Int = 20, type: Int? = nil, from: String? = nil) async throws -> MessageListResponse {
    var data: [String: Any] = [
        "page": page,
        "limit": limit
    ]
    
    if let type = type {
        data["type"] = type
    }
    
    if let from = from {
        data["from"] = from
    }
    
    // 改为调用appGetMessageList
    return try await NetworkService.shared.request(
        operation: "appGetMessageList",  // 改为通过appApi调用
        data: data
    )
}

func setMessage(
    mesTypeId: String,
    mesType: Int,
    status: Int,
    grouptype: Int? = nil,
    messFromType: Int? = nil
) async throws -> EmptyResponse {
    var data: [String: Any] = [
        "status": status,
        "mesTypeId": mesTypeId,
        "mesType": mesType
    ]
    
    if let grouptype = grouptype {
        data["grouptype"] = grouptype
    }
    
    if let messFromType = messFromType {
        data["messFromType"] = messFromType
    }
    
    // 改为调用appSetMessage
    return try await NetworkService.shared.request(
        operation: "appSetMessage",  // 改为通过appApi调用
        data: data
    )
}
```

**测试要求**:
- [ ] 测试消息首页功能
- [ ] 测试消息详情页功能
- [ ] 测试各类消息页面功能
- [ ] 测试标记已读功能
- [ ] 测试删除消息功能

---

## 开发检查清单

### 每个云函数开发完成后检查

- [ ] 参数校验完整
- [ ] 参数标准化正确（不传递source）
- [ ] 调用核心层云函数正确
- [ ] 数据格式转换正确
- [ ] 错误处理完整
- [ ] 会员状态处理（如需要）
- [ ] 代码注释清晰
- [ ] 单元测试通过
- [ ] 集成测试通过

### 模块开发完成后检查

- [ ] 所有云函数已实现
- [ ] 路由配置正确（在appApi/index.js中）
- [ ] 模块导出正确
- [ ] 错误处理统一
- [ ] 代码风格一致

### 部署前检查

- [ ] 所有P0功能已实现
- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 文档已更新
- [ ] 环境配置正确
- [ ] 部署脚本准备就绪

---

## 开发时间估算

### 第一阶段（P0）：2-3周
- dyn模块核心功能：1周
- user模块核心功能：1周
- upload模块：2天
- 测试和修复：3-5天

### 第二阶段（P1）：2-3周
- user模块扩展功能：1周
- circle模块：1周
- search模块：3-5天
- 测试和修复：3-5天

### 第三阶段（架构优化）：1周
- message模块：3天
- app客户端修改：2天
- 测试和修复：2天

**总计**：5-7周

---

## 注意事项

1. **严格遵守架构规则**：不传递source参数，保持核心层纯净
2. **参数标准化**：所有调用核心层的接口必须标准化参数
3. **会员状态**：所有返回用户信息的接口必须包含会员状态
4. **错误处理**：统一错误码和错误信息格式
5. **测试环境**：所有云函数代码部署在测试环境中
6. **代码审查**：每个功能开发完成后进行代码审查
7. **文档更新**：开发完成后更新相关文档
8. **向后兼容**：确保不影响小程序功能

---

## 文档更新记录

- 2026-01-12: 创建开发任务清单文档
- 2026-01-12: 基于App页面云函数梳理文档生成详细任务清单
