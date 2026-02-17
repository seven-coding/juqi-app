// 发送新人消息（使用 env.getDb 按 dataEnv 写库）
const cloud = require('wx-server-sdk');
const { getDb } = require('./env');

// 添加消息
async function setMessagesUser(data) {
  const db = getDb();
  const _ = db.command;
  try {

  
    let result = await db.collection('messagesUser').add({
      data
    });

    if (result._id) {
      // await db.collection('messagesType').add({
      //   data
      // });
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