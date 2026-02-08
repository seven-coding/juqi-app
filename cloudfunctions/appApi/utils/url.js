/**
 * URL 转换工具
 * 用于将 cloud:// 协议的云存储 URL 转换为 HTTPS URL
 */
const cloud = require('wx-server-sdk');

/**
 * 判断是否是 cloud:// URL
 * @param {string} url - URL 字符串
 * @returns {boolean}
 */
function isCloudUrl(url) {
  return typeof url === 'string' && url.startsWith('cloud://');
}

/**
 * 将单个 cloud:// URL 转换为临时 HTTPS URL
 * @param {string} fileID - cloud:// 格式的文件ID
 * @returns {Promise<string|null>} 转换后的 HTTPS URL，失败返回 null
 */
async function convertCloudUrlToHttps(fileID) {
  if (!fileID || !isCloudUrl(fileID)) {
    return fileID;
  }
  
  try {
    const result = await cloud.getTempFileURL({
      fileList: [fileID]
    });
    
    if (result.fileList && result.fileList.length > 0) {
      const fileInfo = result.fileList[0];
      if (fileInfo.status === 0 && fileInfo.tempFileURL) {
        return fileInfo.tempFileURL;
      }
    }
    
    console.warn('[convertCloudUrlToHttps] 转换失败:', fileID, result);
    return fileID; // 返回原始 URL 作为 fallback
  } catch (err) {
    console.error('[convertCloudUrlToHttps] 错误:', fileID, err.message);
    return fileID; // 返回原始 URL 作为 fallback
  }
}

/**
 * 批量转换 cloud:// URL 为 HTTPS URL
 * @param {Array<string>} urls - cloud:// URL 数组
 * @returns {Promise<Array<string>>} 转换后的 HTTPS URL 数组
 */
async function convertCloudUrlsToHttps(urls) {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return urls;
  }
  
  // 过滤出需要转换的 cloud:// URL
  const cloudUrls = urls.filter(url => isCloudUrl(url));
  
  if (cloudUrls.length === 0) {
    return urls; // 没有需要转换的 URL
  }
  
  try {
    const result = await cloud.getTempFileURL({
      fileList: cloudUrls
    });
    
    // 构建 fileID -> tempURL 的映射
    const urlMap = {};
    if (result.fileList) {
      result.fileList.forEach(fileInfo => {
        if (fileInfo.status === 0 && fileInfo.tempFileURL) {
          urlMap[fileInfo.fileID] = fileInfo.tempFileURL;
        }
      });
    }
    
    // 返回转换后的数组
    return urls.map(url => {
      if (isCloudUrl(url) && urlMap[url]) {
        return urlMap[url];
      }
      return url;
    });
  } catch (err) {
    console.error('[convertCloudUrlsToHttps] 批量转换错误:', err.message);
    return urls; // 返回原始数组作为 fallback
  }
}

/**
 * 转换动态对象中的所有 cloud:// URL
 * @param {Object} dyn - 动态对象（已转换为 App 格式）
 * @returns {Promise<Object>} 转换后的动态对象
 */
async function convertDynUrls(dyn) {
  if (!dyn) return dyn;
  
  const urlsToConvert = [];
  const urlFields = [];
  
  // 收集所有需要转换的 URL
  if (dyn.userAvatar && isCloudUrl(dyn.userAvatar)) {
    urlsToConvert.push(dyn.userAvatar);
    urlFields.push({ field: 'userAvatar', index: null });
  }
  
  if (dyn.images && Array.isArray(dyn.images)) {
    dyn.images.forEach((url, index) => {
      if (isCloudUrl(url)) {
        urlsToConvert.push(url);
        urlFields.push({ field: 'images', index: index });
      }
    });
  }
  
  if (dyn.videoUrl && isCloudUrl(dyn.videoUrl)) {
    urlsToConvert.push(dyn.videoUrl);
    urlFields.push({ field: 'videoUrl', index: null });
  }
  
  if (dyn.voiceUrl && isCloudUrl(dyn.voiceUrl)) {
    urlsToConvert.push(dyn.voiceUrl);
    urlFields.push({ field: 'voiceUrl', index: null });
  }
  
  if (dyn.musicInfo) {
    if (dyn.musicInfo.musicPoster && isCloudUrl(dyn.musicInfo.musicPoster)) {
      urlsToConvert.push(dyn.musicInfo.musicPoster);
      urlFields.push({ field: 'musicInfo.musicPoster', index: null });
    }
    if (dyn.musicInfo.musicSrc && isCloudUrl(dyn.musicInfo.musicSrc)) {
      urlsToConvert.push(dyn.musicInfo.musicSrc);
      urlFields.push({ field: 'musicInfo.musicSrc', index: null });
    }
  }
  
  // 处理转发的原贴
  if (dyn.repostPost) {
    if (dyn.repostPost.userAvatar && isCloudUrl(dyn.repostPost.userAvatar)) {
      urlsToConvert.push(dyn.repostPost.userAvatar);
      urlFields.push({ field: 'repostPost.userAvatar', index: null });
    }
    if (dyn.repostPost.images && Array.isArray(dyn.repostPost.images)) {
      dyn.repostPost.images.forEach((url, index) => {
        if (isCloudUrl(url)) {
          urlsToConvert.push(url);
          urlFields.push({ field: 'repostPost.images', index: index });
        }
      });
    }
  }
  
  if (urlsToConvert.length === 0) {
    return dyn; // 没有需要转换的 URL
  }
  
  // 批量转换
  try {
    const result = await cloud.getTempFileURL({
      fileList: urlsToConvert
    });
    
    // 构建 fileID -> tempURL 的映射
    const urlMap = {};
    if (result.fileList) {
      result.fileList.forEach(fileInfo => {
        if (fileInfo.status === 0 && fileInfo.tempFileURL) {
          urlMap[fileInfo.fileID] = fileInfo.tempFileURL;
        }
      });
    }
    
    // 应用转换结果
    urlFields.forEach((mapping, i) => {
      const originalUrl = urlsToConvert[i];
      const newUrl = urlMap[originalUrl] || originalUrl;
      
      if (mapping.field === 'userAvatar') {
        dyn.userAvatar = newUrl;
      } else if (mapping.field === 'images' && mapping.index !== null) {
        dyn.images[mapping.index] = newUrl;
      } else if (mapping.field === 'videoUrl') {
        dyn.videoUrl = newUrl;
      } else if (mapping.field === 'voiceUrl') {
        dyn.voiceUrl = newUrl;
      } else if (mapping.field === 'musicInfo.musicPoster' && dyn.musicInfo) {
        dyn.musicInfo.musicPoster = newUrl;
      } else if (mapping.field === 'musicInfo.musicSrc' && dyn.musicInfo) {
        dyn.musicInfo.musicSrc = newUrl;
      } else if (mapping.field === 'repostPost.userAvatar' && dyn.repostPost) {
        dyn.repostPost.userAvatar = newUrl;
      } else if (mapping.field === 'repostPost.images' && mapping.index !== null && dyn.repostPost && dyn.repostPost.images) {
        dyn.repostPost.images[mapping.index] = newUrl;
      }
    });
    
    return dyn;
  } catch (err) {
    console.error('[convertDynUrls] 转换错误:', err.message);
    return dyn; // 返回原始对象作为 fallback
  }
}

/**
 * 批量转换动态列表中的所有 cloud:// URL
 * @param {Array<Object>} dynList - 动态对象数组
 * @returns {Promise<Array<Object>>} 转换后的动态对象数组
 */
async function convertDynListUrls(dynList) {
  if (!dynList || !Array.isArray(dynList) || dynList.length === 0) {
    return dynList;
  }
  
  // 收集所有动态中需要转换的 URL
  const allUrls = [];
  const urlMappings = []; // { dynIndex, field, arrayIndex }
  
  dynList.forEach((dyn, dynIndex) => {
    if (!dyn) return;
    
    if (dyn.userAvatar && isCloudUrl(dyn.userAvatar)) {
      allUrls.push(dyn.userAvatar);
      urlMappings.push({ dynIndex, field: 'userAvatar', arrayIndex: null });
    }
    
    if (dyn.images && Array.isArray(dyn.images)) {
      dyn.images.forEach((url, arrayIndex) => {
        if (isCloudUrl(url)) {
          allUrls.push(url);
          urlMappings.push({ dynIndex, field: 'images', arrayIndex });
        }
      });
    }
    
    if (dyn.videoUrl && isCloudUrl(dyn.videoUrl)) {
      allUrls.push(dyn.videoUrl);
      urlMappings.push({ dynIndex, field: 'videoUrl', arrayIndex: null });
    }
    
    if (dyn.voiceUrl && isCloudUrl(dyn.voiceUrl)) {
      allUrls.push(dyn.voiceUrl);
      urlMappings.push({ dynIndex, field: 'voiceUrl', arrayIndex: null });
    }
    
    if (dyn.musicInfo) {
      if (dyn.musicInfo.musicPoster && isCloudUrl(dyn.musicInfo.musicPoster)) {
        allUrls.push(dyn.musicInfo.musicPoster);
        urlMappings.push({ dynIndex, field: 'musicInfo.musicPoster', arrayIndex: null });
      }
      if (dyn.musicInfo.musicSrc && isCloudUrl(dyn.musicInfo.musicSrc)) {
        allUrls.push(dyn.musicInfo.musicSrc);
        urlMappings.push({ dynIndex, field: 'musicInfo.musicSrc', arrayIndex: null });
      }
    }
    
    if (dyn.repostPost) {
      if (dyn.repostPost.userAvatar && isCloudUrl(dyn.repostPost.userAvatar)) {
        allUrls.push(dyn.repostPost.userAvatar);
        urlMappings.push({ dynIndex, field: 'repostPost.userAvatar', arrayIndex: null });
      }
      if (dyn.repostPost.images && Array.isArray(dyn.repostPost.images)) {
        dyn.repostPost.images.forEach((url, arrayIndex) => {
          if (isCloudUrl(url)) {
            allUrls.push(url);
            urlMappings.push({ dynIndex, field: 'repostPost.images', arrayIndex });
          }
        });
      }
    }
  });
  
  if (allUrls.length === 0) {
    return dynList;
  }
  
  console.log(`[convertDynListUrls] 需要转换 ${allUrls.length} 个 cloud:// URL`);
  
  try {
    // 批量获取临时 URL（云函数限制每次最多 50 个）
    const urlMap = {};
    const batchSize = 50;
    
    for (let i = 0; i < allUrls.length; i += batchSize) {
      const batch = allUrls.slice(i, i + batchSize);
      const result = await cloud.getTempFileURL({
        fileList: batch
      });
      
      if (result.fileList) {
        result.fileList.forEach(fileInfo => {
          if (fileInfo.status === 0 && fileInfo.tempFileURL) {
            urlMap[fileInfo.fileID] = fileInfo.tempFileURL;
          }
        });
      }
    }
    
    // 应用转换结果
    urlMappings.forEach((mapping, i) => {
      const originalUrl = allUrls[i];
      const newUrl = urlMap[originalUrl] || originalUrl;
      const dyn = dynList[mapping.dynIndex];
      
      if (mapping.field === 'userAvatar') {
        dyn.userAvatar = newUrl;
      } else if (mapping.field === 'images' && mapping.arrayIndex !== null) {
        dyn.images[mapping.arrayIndex] = newUrl;
      } else if (mapping.field === 'videoUrl') {
        dyn.videoUrl = newUrl;
      } else if (mapping.field === 'voiceUrl') {
        dyn.voiceUrl = newUrl;
      } else if (mapping.field === 'musicInfo.musicPoster' && dyn.musicInfo) {
        dyn.musicInfo.musicPoster = newUrl;
      } else if (mapping.field === 'musicInfo.musicSrc' && dyn.musicInfo) {
        dyn.musicInfo.musicSrc = newUrl;
      } else if (mapping.field === 'repostPost.userAvatar' && dyn.repostPost) {
        dyn.repostPost.userAvatar = newUrl;
      } else if (mapping.field === 'repostPost.images' && mapping.arrayIndex !== null && dyn.repostPost && dyn.repostPost.images) {
        dyn.repostPost.images[mapping.arrayIndex] = newUrl;
      }
    });
    
    console.log(`[convertDynListUrls] 成功转换 ${Object.keys(urlMap).length} 个 URL`);
    return dynList;
  } catch (err) {
    console.error('[convertDynListUrls] 批量转换错误:', err.message);
    return dynList;
  }
}

/**
 * 转换评论中的 cloud:// URL
 * @param {Array<Object>} comments - 评论列表
 * @returns {Promise<Array<Object>>} 转换后的评论列表
 */
async function convertCommentUrls(comments) {
  if (!comments || !Array.isArray(comments) || comments.length === 0) {
    return comments;
  }
  
  const allUrls = [];
  const urlMappings = [];
  
  comments.forEach((comment, commentIndex) => {
    if (!comment) return;
    
    if (comment.userAvatar && isCloudUrl(comment.userAvatar)) {
      allUrls.push(comment.userAvatar);
      urlMappings.push({ commentIndex, replyIndex: null, field: 'userAvatar' });
    }
    
    if (comment.imagePath && isCloudUrl(comment.imagePath)) {
      allUrls.push(comment.imagePath);
      urlMappings.push({ commentIndex, replyIndex: null, field: 'imagePath' });
    }
    
    if (comment.replies && Array.isArray(comment.replies)) {
      comment.replies.forEach((reply, replyIndex) => {
        if (reply.userAvatar && isCloudUrl(reply.userAvatar)) {
          allUrls.push(reply.userAvatar);
          urlMappings.push({ commentIndex, replyIndex, field: 'userAvatar' });
        }
        if (reply.imagePath && isCloudUrl(reply.imagePath)) {
          allUrls.push(reply.imagePath);
          urlMappings.push({ commentIndex, replyIndex, field: 'imagePath' });
        }
      });
    }
  });
  
  if (allUrls.length === 0) {
    return comments;
  }
  
  try {
    const urlMap = {};
    const batchSize = 50;
    
    for (let i = 0; i < allUrls.length; i += batchSize) {
      const batch = allUrls.slice(i, i + batchSize);
      const result = await cloud.getTempFileURL({
        fileList: batch
      });
      
      if (result.fileList) {
        result.fileList.forEach(fileInfo => {
          if (fileInfo.status === 0 && fileInfo.tempFileURL) {
            urlMap[fileInfo.fileID] = fileInfo.tempFileURL;
          }
        });
      }
    }
    
    urlMappings.forEach((mapping, i) => {
      const originalUrl = allUrls[i];
      const newUrl = urlMap[originalUrl] || originalUrl;
      
      if (mapping.replyIndex === null) {
        comments[mapping.commentIndex][mapping.field] = newUrl;
      } else {
        comments[mapping.commentIndex].replies[mapping.replyIndex][mapping.field] = newUrl;
      }
    });
    
    return comments;
  } catch (err) {
    console.error('[convertCommentUrls] 转换错误:', err.message);
    return comments;
  }
}

module.exports = {
  isCloudUrl,
  convertCloudUrlToHttps,
  convertCloudUrlsToHttps,
  convertDynUrls,
  convertDynListUrls,
  convertCommentUrls
};
