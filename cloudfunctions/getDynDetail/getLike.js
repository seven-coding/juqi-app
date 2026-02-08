// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  errorCode
} = require('./errorCode');
// const {
//   CONFIG
// } = require('./CONFIG');
const $ = db.command.aggregate;

// 给动态点赞
async function getLike(likeList) {
  try {

    let userList = (await db.collection('user')
      .aggregate().match({
        openId: _.in(likeList),
      })
      .project({
        _id: 0,
        avatarUrl: 1,
        nickName: 1,
        openId: 1,
        avatarVisitUrl: 1
      }).limit(1000)
      .end()).list;
      
      if (userList && userList.length) {
        let obj = {};
        userList.map(item => {
          return obj[item.openId] = item;
        })

        function sortBy(props) {
          return function(a,b) {
            let aIndex = likeList.indexOf(a[props]);
            let bIndex = likeList.indexOf(b[props]);
            return aIndex - bIndex;
          }
      }
        userList.sort(sortBy('openId'))
      }

      console.log(likeList, userList);
    return userList;
  } catch (error) {
    console.log(error)
  }
}

exports.getLike = getLike;