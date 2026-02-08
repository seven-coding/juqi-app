// 橘气币明细列表
// timestamp当月时间戳
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()
const _ = db.command;

async function getNearPeople(event, openId) {
  let location = (await db.collection('userGeo').where({openId}).get()).data[0].location;
  console.log(location)
  let result = await db.collection('userGeo').where({
    // location: _.geoNear({
    //   location: location,
    //   minDistance: 1,
    //   maxDistance: 20,
    // })
    location: _.geoNear({
      geometry: db.Geo.Point(113.323809, 23.097732),
      minDistance: 1000,
      maxDistance: 5000,
    })
  }).get()

  
}


exports.getNearPeople = getNearPeople;