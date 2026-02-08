// 上传模块
// 版本: 2.1.0 - App测试环境专用（修复环境初始化问题）
const cloud = require('wx-server-sdk');
// 注意：不在模块顶部初始化，由 index.js 统一初始化后通过 event 传递数据库实例

const { success, error } = require('../utils/response');

/**
 * 上传图片
 * 将base64图片数据上传到云存储
 */
async function UploadImage(event) {
  try {
    const { openId, data, db } = event;
    const { imageData, category = 'dyn', fileName } = data || {};

    if (!imageData) {
      return error(400, "缺少图片数据");
    }

    // 将base64转换为Buffer
    const imageBuffer = Buffer.from(imageData, 'base64');

    // 生成文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = fileName ? fileName.split('.').pop() : 'jpg';
    const cloudPath = `${category}/${openId}_${timestamp}_${randomStr}.${extension}`;

    console.log('[appUploadImage] 上传路径:', cloudPath);

    // 上传到云存储
    const result = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: imageBuffer
    });

    console.log('[appUploadImage] 上传结果:', result);

    if (!result.fileID) {
      return error(500, "上传失败");
    }

    // 获取临时访问链接（可选）
    let tempUrl = null;
    try {
      const urlResult = await cloud.getTempFileURL({
        fileList: [result.fileID]
      });
      if (urlResult.fileList && urlResult.fileList[0] && urlResult.fileList[0].tempFileURL) {
        tempUrl = urlResult.fileList[0].tempFileURL;
      }
    } catch (urlErr) {
      console.log('[appUploadImage] 获取临时链接失败:', urlErr);
    }

    return success({
      fileID: result.fileID,
      url: tempUrl || result.fileID
    });
  } catch (err) {
    console.error('[appUploadImage] error:', err);
    return error(500, err.message || '上传失败');
  }
}

/**
 * 批量上传图片
 */
async function UploadImages(event) {
  try {
    const { openId, data, db } = event;
    const { images, category = 'dyn' } = data || {};

    if (!images || !Array.isArray(images) || images.length === 0) {
      return error(400, "缺少图片数据");
    }

    if (images.length > 9) {
      return error(400, "最多上传9张图片");
    }

    const uploadResults = [];
    const timestamp = Date.now();

    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      const imageBuffer = Buffer.from(imageData, 'base64');
      const randomStr = Math.random().toString(36).substring(2, 8);
      const cloudPath = `${category}/${openId}_${timestamp}_${i}_${randomStr}.jpg`;

      try {
        const result = await cloud.uploadFile({
          cloudPath: cloudPath,
          fileContent: imageBuffer
        });

        if (result.fileID) {
          uploadResults.push({
            fileID: result.fileID,
            success: true
          });
        } else {
          uploadResults.push({
            success: false,
            error: '上传失败'
          });
        }
      } catch (uploadErr) {
        uploadResults.push({
          success: false,
          error: uploadErr.message
        });
      }
    }

    // 获取所有成功上传的文件的临时链接
    const successFileIDs = uploadResults
      .filter(r => r.success)
      .map(r => r.fileID);

    if (successFileIDs.length > 0) {
      try {
        const urlResult = await cloud.getTempFileURL({
          fileList: successFileIDs
        });
        
        if (urlResult.fileList) {
          urlResult.fileList.forEach(item => {
            const idx = uploadResults.findIndex(r => r.fileID === item.fileID);
            if (idx !== -1) {
              uploadResults[idx].url = item.tempFileURL;
            }
          });
        }
      } catch (urlErr) {
        console.log('[appUploadImages] 获取临时链接失败:', urlErr);
      }
    }

    return success({
      results: uploadResults,
      successCount: uploadResults.filter(r => r.success).length,
      failCount: uploadResults.filter(r => !r.success).length
    });
  } catch (err) {
    console.error('[appUploadImages] error:', err);
    return error(500, err.message || '批量上传失败');
  }
}

module.exports = {
  UploadImage,
  UploadImages
};
