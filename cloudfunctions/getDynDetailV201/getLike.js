// 不在此处 cloud.init()，由 index.js 按 event.envId 初始化，避免查错库 404
const cloud = require('wx-server-sdk');
const {
  errorCode
} = require('./errorCode');

// 给动态点赞
async function getLike(likeList) {
  const db = cloud.database();
  const _ = db.command;
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