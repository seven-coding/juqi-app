//
//  Message.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import Foundation

/// 消息数据模型
struct Message: Identifiable, Codable {
    let id: String
    let from: String // 发送者ID
    let fromName: String // 发送者名称
    let fromPhoto: String? // 发送者头像
    let type: Int // 消息类型
    let message: String? // 消息内容
    let msgText: String? // 格式化后的消息文本
    let createTime: Date // 创建时间
    let formatDate: String? // 格式化后的日期字符串
    let status: Int // 状态：0-未读，1-已读
    let noReadCount: Int // 未读数量
    let groupType: Int? // 分组类型
    let groupId: Int? // 分组ID
    let url: String? // 跳转URL
    let chatId: String? // 聊天ID
    let dynId: String? // 动态ID
    
    // 从API返回的额外字段
    let user: [MessageUser]? // 用户信息
    let circles: [MessageCircle]? // 圈子信息
    let userInfo: [MessageUser]? // 用户信息
    let messageInfo: [MessageInfo]? // 消息信息
    let riskControlReason: String? // 风控原因
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case from
        case fromName
        case fromPhoto
        case type
        case message
        case msgText
        case createTime
        case formatDate
        case status
        case noReadCount
        case groupType
        case groupId
        case url
        case chatId
        case dynId
        case user
        case circles
        case userInfo
        case messageInfo
        case riskControlReason
    }
    
    // 自定义解码，支持时间戳字符串
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        from = try container.decode(String.self, forKey: .from)
        fromName = try container.decode(String.self, forKey: .fromName)
        fromPhoto = try container.decodeIfPresent(String.self, forKey: .fromPhoto)
        type = try container.decode(Int.self, forKey: .type)
        message = try container.decodeIfPresent(String.self, forKey: .message)
        msgText = try container.decodeIfPresent(String.self, forKey: .msgText)
        
        // 处理日期：可能是Date、时间戳字符串或Date对象
        if let date = try? container.decode(Date.self, forKey: .createTime) {
            createTime = date
        } else if let timestampString = try? container.decode(String.self, forKey: .createTime),
                  let date = Date.fromTimestamp(timestampString) {
            createTime = date
        } else {
            createTime = Date()
        }
        
        formatDate = try container.decodeIfPresent(String.self, forKey: .formatDate)
        status = try container.decode(Int.self, forKey: .status)
        noReadCount = try container.decode(Int.self, forKey: .noReadCount)
        groupType = try container.decodeIfPresent(Int.self, forKey: .groupType)
        groupId = try container.decodeIfPresent(Int.self, forKey: .groupId)
        url = try container.decodeIfPresent(String.self, forKey: .url)
        chatId = try container.decodeIfPresent(String.self, forKey: .chatId)
        dynId = try container.decodeIfPresent(String.self, forKey: .dynId)
        user = try container.decodeIfPresent([MessageUser].self, forKey: .user)
        circles = try container.decodeIfPresent([MessageCircle].self, forKey: .circles)
        userInfo = try container.decodeIfPresent([MessageUser].self, forKey: .userInfo)
        messageInfo = try container.decodeIfPresent([MessageInfo].self, forKey: .messageInfo)
        riskControlReason = try container.decodeIfPresent(String.self, forKey: .riskControlReason)
    }
    
    // 便捷初始化方法
    init(
        id: String,
        from: String,
        fromName: String,
        fromPhoto: String?,
        type: Int,
        message: String?,
        msgText: String?,
        createTime: Date,
        formatDate: String?,
        status: Int,
        noReadCount: Int,
        groupType: Int?,
        groupId: Int?,
        url: String?,
        chatId: String?,
        dynId: String?,
        user: [MessageUser]?,
        circles: [MessageCircle]?,
        userInfo: [MessageUser]?,
        messageInfo: [MessageInfo]?,
        riskControlReason: String?
    ) {
        self.id = id
        self.from = from
        self.fromName = fromName
        self.fromPhoto = fromPhoto
        self.type = type
        self.message = message
        self.msgText = msgText
        self.createTime = createTime
        self.formatDate = formatDate
        self.status = status
        self.noReadCount = noReadCount
        self.groupType = groupType
        self.groupId = groupId
        self.url = url
        self.chatId = chatId
        self.dynId = dynId
        self.user = user
        self.circles = circles
        self.userInfo = userInfo
        self.messageInfo = messageInfo
        self.riskControlReason = riskControlReason
    }
    
    // 编码方法
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(from, forKey: .from)
        try container.encode(fromName, forKey: .fromName)
        try container.encodeIfPresent(fromPhoto, forKey: .fromPhoto)
        try container.encode(type, forKey: .type)
        try container.encodeIfPresent(message, forKey: .message)
        try container.encodeIfPresent(msgText, forKey: .msgText)
        try container.encode(createTime, forKey: .createTime)
        try container.encodeIfPresent(formatDate, forKey: .formatDate)
        try container.encode(status, forKey: .status)
        try container.encode(noReadCount, forKey: .noReadCount)
        try container.encodeIfPresent(groupType, forKey: .groupType)
        try container.encodeIfPresent(groupId, forKey: .groupId)
        try container.encodeIfPresent(url, forKey: .url)
        try container.encodeIfPresent(chatId, forKey: .chatId)
        try container.encodeIfPresent(dynId, forKey: .dynId)
        try container.encodeIfPresent(user, forKey: .user)
        try container.encodeIfPresent(circles, forKey: .circles)
        try container.encodeIfPresent(userInfo, forKey: .userInfo)
        try container.encodeIfPresent(messageInfo, forKey: .messageInfo)
        try container.encodeIfPresent(riskControlReason, forKey: .riskControlReason)
    }
}

struct MessageUser: Codable {
    let openId: String?
    let nickName: String?
    let avatar: String?
}

struct MessageCircle: Codable {
    let _id: String?
    let title: String?
    let desc: String?
}

struct MessageInfo: Codable {
    let message: String?
}

/// 消息导航栏项
struct MessageNavItem: Identifiable, Equatable {
    let id: Int
    let title: String
    let icon: String
    var count: Int // 未读数量
    let url: String? // 跳转URL
    
    static func == (lhs: MessageNavItem, rhs: MessageNavItem) -> Bool {
        return lhs.id == rhs.id &&
               lhs.title == rhs.title &&
               lhs.icon == rhs.icon &&
               lhs.count == rhs.count &&
               lhs.url == rhs.url
    }
}

/// 未读消息统计
struct MessageNotReadCount: Codable {
    let chargeNums: MessageCount
    let commentNums: MessageCount
    let aitType1Nums: MessageCount
    let aitType2Nums: MessageCount
    let visitorNums: MessageCount
}

struct MessageCount: Codable {
    let total: Int
}

/// 消息列表响应
struct MessageListResponse: Codable {
    let messages: [Message]
    let count: Int
    let notReadCount: MessageNotReadCount?
}
