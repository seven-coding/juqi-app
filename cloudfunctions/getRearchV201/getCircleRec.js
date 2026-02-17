// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
// const {
//   errorCode
// } = require('./errorCode')
const _ = db.command;

// 获取用户权限
async function getCircleRec(keyword, page = 1, limit = 20) {
    try {
      let query = _.or([
        {
          title: db.RegExp({
            regexp: keyword,
            options: 'i',
          })
        },
        {
          desc: db.RegExp({
            regexp: keyword,
            options: 'i',
          })
        },
      ]);

      let count = await db.collection('circle').where(query).count();
      let list = (await db.collection('circle').aggregate().match(query).skip((page - 1) * limit).limit(limit).end()).list;

      return {
        code: 200,
        list: list,
        count: count.total,
      };

    } catch(error) {
      console.log(error);
      return {
        code: 400,
        message: "后端执行报错，请反馈到橘气家长电站"
      }
    }
}

exports.getCircleRec = getCircleRec;
