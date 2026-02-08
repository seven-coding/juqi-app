// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;

// 添加消息
async function setMessagesUser(data) {
  try {
    let result = await db.collection('messagesUser').add({
      data
    });

    if (result._id) {


      let {
        from,
        to,
        groupType,
        type,
        fromName,
        fromPhoto
      } = data;

      let newMsType = await db.collection('messagesType').where({
        from,
        to,
        groupType
      }).get();

      if (newMsType.data && newMsType.data.length) {
        await db.collection('messagesType').where({
          from,
          to,
          groupType
        }).update({
          data: {
            status: 0,
            noReadCount: _.inc(1),
            createTime: new Date().valueOf(),
            messageUserId: result._id,
            type,
            fromName,
            fromPhoto
          }
        })
      } else {
        await db.collection('messagesType').add({
          data: {
            from,
            to,
            groupType,
            status: 0,
            noReadCount: 1,
            createTime: new Date().valueOf(),
            messageUserId: result._id,
            type,
            fromName,
            fromPhoto
          }
        });
      }
    }
  } catch (error) {
    console.log('setMessagesUser', error)
    return false;
  }

}


exports.setMessagesUser = setMessagesUser;