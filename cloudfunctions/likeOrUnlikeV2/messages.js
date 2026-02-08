// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  CONFIG
} = require('./config')

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
        createTime
      } = data;

      let newMsType = await db.collection('messagesType').where({
        to,
        groupType
      }).get();

      if (newMsType.data && newMsType.data.length) {
        await db.collection('messagesType').where({
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
        return result._id;
      } else {
        let addResult = await db.collection('messagesType').add({
          data: {
            from: "COMMENT_LIKE",
            to,
            groupType,
            status: 0,
            noReadCount: 1,
            createTime,
            messageUserId: result._id,
            type,
            fromName: '评论点赞',
            fromPhoto: 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png'
          }
        });
        return addResult._id
      }
    }
  } catch (error) {
    console.log('setMessagesUser', error)
    return false;
  }
}

// 消息重置
async function resetMessagesUser(data) {
  try {
    let {messageId, groupType, type, to } = data;

    let messageInfo = await db.collection('messagesUser').doc(messageId).get();
    if (messageInfo.data.to == to) {
      await db.collection('messagesUser').doc(messageId).update({
        data: {
          status: 2
        }
      })
    }
   
    let oldMessageResult = await db.collection('messagesUser').where({
      groupType,
      type,
      status: _.neq(2)
    }).orderBy('createTime', 'desc').get();

    let newMessageId;
    if (oldMessageResult.data && oldMessageResult.data.length) {
      newMessageId = oldMessageResult.data[0]._id;
    }
    if (newMessageId) {
      await db.collection('messagesType').where({
        to,
        groupType
      }).update({
        data: {
          messageUserId: newMessageId
        }
      });
    } else {
      await db.collection('messagesType').where({
        to,
        groupType
      }).update({
        data: {
          status: 2
        }
      });
    }
    
  } catch (error) {
    console.log('resetMessagesUser', error)
    return false;
  }
}

exports.setMessagesUser = setMessagesUser;
exports.resetMessagesUser = resetMessagesUser;