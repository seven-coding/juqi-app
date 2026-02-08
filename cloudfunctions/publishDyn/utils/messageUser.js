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
        createTime,
      } = data;

      let newMsType = await db.collection('messagesType').where({
        from,
        to,
        groupType
      }).get();

      if (newMsType.data && newMsType.data.length) {
        let messageId = newMsType.data;

        await db.collection('messagesType').where({
          from,
          to,
          groupType
        }).update({
          data: {
            status: 0,
            noReadCount: _.inc(1),
            createTime,
            messageUserId: result._id,
            type
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
            createTime,
            messageUserId: result._id,
            type
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