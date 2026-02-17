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
    /// 1=文字 2=图片（对话消息）
    let contentType: Int?
    
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
        case contentType
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
        // 兼容聚合结果：fromName/fromPhoto 可能在 user[0] 中，由服务端格式化后带出
        fromName = try container.decodeIfPresent(String.self, forKey: .fromName) ?? ""
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
        status = try container.decodeIfPresent(Int.self, forKey: .status) ?? 0
        noReadCount = try container.decodeIfPresent(Int.self, forKey: .noReadCount) ?? 0
        groupType = try container.decodeIfPresent(Int.self, forKey: .groupType)
        groupId = try container.decodeIfPresent(Int.self, forKey: .groupId)
        url = try container.decodeIfPresent(String.self, forKey: .url)
        chatId = try container.decodeIfPresent(String.self, forKey: .chatId)
        dynId = try container.decodeIfPresent(String.self, forKey: .dynId)
        contentType = try container.decodeIfPresent(Int.self, forKey: .contentType)
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
        contentType: Int? = nil,
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
        self.contentType = contentType
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
        try container.encodeIfPresent(contentType, forKey: .contentType)
        try container.encodeIfPresent(user, forKey: .user)
        try container.encodeIfPresent(circles, forKey: .circles)
        try container.encodeIfPresent(userInfo, forKey: .userInfo)
        try container.encodeIfPresent(messageInfo, forKey: .messageInfo)
        try container.encodeIfPresent(riskControlReason, forKey: .riskControlReason)
    }
}

// MARK: - 消息类型常量（与云函数 getMessagesNew type 约定一致）
enum MessageTypeConstant {
    static let unreadSummary = 1
    static let firstScreen = 2
    static let charge = 3
    static let comment = 4
    static let visit = 5
    static let follow = 6
    static let cards = 7
    static let circle = 8
    static let commentLike = 9
    static let wechatApply = 10
    static let at = 11
}

// MARK: - 消息展示格式化（首屏与分类页共用）
extension Message {
    /// 根据 type 生成 msgText 并补全 formatDate，供列表展示；私聊等聚合结果无顶层 fromName/fromPhoto 时从 user/userInfo 补全
    static func formatForDisplay(_ message: Message) -> Message {
        var displayFromName = message.fromName
        var displayFromPhoto = message.fromPhoto
        if displayFromName.isEmpty || displayFromPhoto == nil {
            if let u = message.user?.first {
                if displayFromName.isEmpty { displayFromName = u.nickName ?? "未知" }
                if displayFromPhoto == nil { displayFromPhoto = u.avatar }
            }
            if let u = message.userInfo?.first {
                if displayFromName.isEmpty { displayFromName = u.nickName ?? "未知" }
                if displayFromPhoto == nil { displayFromPhoto = u.avatar }
            }
            if displayFromName.isEmpty { displayFromName = "未知" }
        }
        var msgText = message.msgText ?? message.message ?? ""
        switch message.type {
        case 1: msgText = "设置圈子信息"
        case 2: msgText = "你成为了管理员"
        case 3: msgText = "你被取消了管理员资格"
        case 4: msgText = "你被管理员\(message.fromName)踢出了本电站"
        case 5: msgText = "你的帖子被加精了"
        case 6: msgText = "你的帖子被拒绝/取消加精了"
        case 7: msgText = "你的帖子被电站屏蔽了"
        case 8: msgText = "你的帖子被电站取消屏蔽了"
        case 9: msgText = "风控"
        case 10: msgText = "你的帖子被置顶了"
        case 11: msgText = "你的帖子被取消置顶了"
        case 12: msgText = "你的加入申请已被通过了"
        case 13: msgText = "你的加入申请被拒绝，还请仔细阅读电站说明"
        case 14: msgText = "你的投稿被通过了"
        case 15: msgText = "你的投稿被拒绝了"
        case 16:
            if let user = message.user?.first {
                msgText = "\(user.nickName ?? "")关注了你"
            }
        case 17: msgText = "有人对你取消关注"
        case 18:
            if let messageText = message.message {
                msgText = messageText
            } else if let reason = message.riskControlReason {
                msgText = reason
            } else if let infoMsg = message.messageInfo?.first?.message {
                msgText = infoMsg
            }
        case 19: msgText = "你的评论被点赞了"
        case 20, 21, 22, 23: msgText = message.message ?? message.msgText ?? "申请/私信消息"
        default: msgText = message.message ?? message.msgText ?? ""
        }
        return Message(
            id: message.id,
            from: message.from,
            fromName: displayFromName,
            fromPhoto: displayFromPhoto,
            type: message.type,
            message: message.message,
            msgText: msgText,
            createTime: message.createTime,
            formatDate: message.createTime.formatMessageDate(),
            status: message.status,
            noReadCount: message.noReadCount,
            groupType: message.groupType,
            groupId: message.groupId,
            url: message.url,
            chatId: message.chatId,
            dynId: message.dynId,
            contentType: message.contentType,
            user: message.user,
            circles: message.circles,
            userInfo: message.userInfo,
            messageInfo: message.messageInfo,
            riskControlReason: message.riskControlReason
        )
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
