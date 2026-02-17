//
//  Post.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import Foundation

struct Post: Identifiable, Codable, Hashable {
    static func == (lhs: Post, rhs: Post) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    let id: String
    let userId: String
    let userName: String
    let userAvatar: String?
    let userSignature: String?
    let isVip: Bool
    let content: String
    let images: [String]?
    let tag: PostTag?
    let publishTime: Date
    let commentCount: Int
    let likeCount: Int
    let shareCount: Int
    let chargeCount: Int
    let isLiked: Bool
    let isCollected: Bool
    let isCharged: Bool
    let repostPost: RepostPost?
    // 详情页额外字段（声明在此处以便 init(from decoder:) 可赋值）
    let likeUsers: [LikeUser]?
    let joinCount: Int?
    let circleId: String?
    let circleTitle: String?
    let circleJoinCount: Int?
    let voiceUrl: String?
    let voiceDuration: TimeInterval?
    let videoUrl: String?
    let musicInfo: MusicInfo?
    /// 正文 @ 的用户列表（id 用于跳转用户主页，与小程序/链接规则一致）
    let mentionedUsers: [MentionedUser]?
    /// 是否已置顶到个人主页（仅本人动态有效）
    let isPinned: Bool?
    /// 发布 IP 属地（合规展示，如「广东」，非完整 IP）
    let ipLocation: String?

    /// 解码时对可能缺失的布尔字段使用默认值，兼容服务端 JSON 序列化省略 undefined 的情况
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        userId = try c.decode(String.self, forKey: .userId)
        userName = try c.decode(String.self, forKey: .userName)
        userAvatar = try c.decodeIfPresent(String.self, forKey: .userAvatar)
        userSignature = try c.decodeIfPresent(String.self, forKey: .userSignature)
        isVip = try c.decodeIfPresent(Bool.self, forKey: .isVip) ?? false
        content = try c.decode(String.self, forKey: .content)
        images = try c.decodeIfPresent([String].self, forKey: .images)
        tag = try c.decodeIfPresent(PostTag.self, forKey: .tag)
        publishTime = try c.decode(Date.self, forKey: .publishTime)
        commentCount = try c.decode(Int.self, forKey: .commentCount)
        likeCount = try c.decode(Int.self, forKey: .likeCount)
        shareCount = try c.decode(Int.self, forKey: .shareCount)
        chargeCount = try c.decode(Int.self, forKey: .chargeCount)
        isLiked = try c.decodeIfPresent(Bool.self, forKey: .isLiked) ?? false
        isCollected = try c.decodeIfPresent(Bool.self, forKey: .isCollected) ?? false
        isCharged = try c.decodeIfPresent(Bool.self, forKey: .isCharged) ?? false
        repostPost = try c.decodeIfPresent(RepostPost.self, forKey: .repostPost)
        likeUsers = try c.decodeIfPresent([LikeUser].self, forKey: .likeUsers)
        joinCount = try c.decodeIfPresent(Int.self, forKey: .joinCount)
        circleId = try c.decodeIfPresent(String.self, forKey: .circleId)
        circleTitle = try c.decodeIfPresent(String.self, forKey: .circleTitle)
        circleJoinCount = try c.decodeIfPresent(Int.self, forKey: .circleJoinCount)
        voiceUrl = try c.decodeIfPresent(String.self, forKey: .voiceUrl)
        voiceDuration = try c.decodeIfPresent(TimeInterval.self, forKey: .voiceDuration)
        videoUrl = try c.decodeIfPresent(String.self, forKey: .videoUrl)
        musicInfo = try c.decodeIfPresent(MusicInfo.self, forKey: .musicInfo)
        mentionedUsers = try c.decodeIfPresent([MentionedUser].self, forKey: .mentionedUsers)
        isPinned = try c.decodeIfPresent(Bool.self, forKey: .isPinned)
        ipLocation = try c.decodeIfPresent(String.self, forKey: .ipLocation)
    }

    /// 成员初始化器（用于 mock 与本地构造）
    init(
        id: String,
        userId: String,
        userName: String,
        userAvatar: String?,
        userSignature: String?,
        isVip: Bool,
        content: String,
        images: [String]?,
        tag: PostTag?,
        publishTime: Date,
        commentCount: Int,
        likeCount: Int,
        shareCount: Int,
        chargeCount: Int,
        isLiked: Bool,
        isCollected: Bool,
        isCharged: Bool,
        repostPost: RepostPost?,
        likeUsers: [LikeUser]? = nil,
        joinCount: Int? = nil,
        circleId: String? = nil,
        circleTitle: String? = nil,
        circleJoinCount: Int? = nil,
        voiceUrl: String? = nil,
        voiceDuration: TimeInterval? = nil,
        videoUrl: String? = nil,
        musicInfo: MusicInfo? = nil,
        mentionedUsers: [MentionedUser]? = nil,
        isPinned: Bool? = nil,
        ipLocation: String? = nil
    ) {
        self.id = id
        self.userId = userId
        self.userName = userName
        self.userAvatar = userAvatar
        self.userSignature = userSignature
        self.isVip = isVip
        self.content = content
        self.images = images
        self.tag = tag
        self.publishTime = publishTime
        self.commentCount = commentCount
        self.likeCount = likeCount
        self.shareCount = shareCount
        self.chargeCount = chargeCount
        self.isLiked = isLiked
        self.isCollected = isCollected
        self.isCharged = isCharged
        self.repostPost = repostPost
        self.mentionedUsers = mentionedUsers
        self.likeUsers = likeUsers
        self.joinCount = joinCount
        self.circleId = circleId
        self.circleTitle = circleTitle
        self.circleJoinCount = circleJoinCount
        self.voiceUrl = voiceUrl
        self.voiceDuration = voiceDuration
        self.videoUrl = videoUrl
        self.musicInfo = musicInfo
        self.isPinned = isPinned
        self.ipLocation = ipLocation
    }

    struct LikeUser: Codable {
        let id: String
        let userName: String
        let avatar: String?
    }

    /// 正文 @ 提及用户（id 为 openId 或用户 id，用于 juqi://user/{id} 跳转）
    struct MentionedUser: Codable {
        let id: String
        let userName: String
    }
    
    struct RepostPost: Codable {
        let id: String
        let userId: String?
        let userName: String
        let userAvatar: String?
        let content: String
        let images: [String]?
    }
    
    /// 发帖时间相对文案，与小程序 getDateDiff 规则一致
    var timeAgo: String {
        publishTime.formatMessageDate()
    }
}

enum PostTag: String, Codable {
    case daily = "日常"
    case hot = "热榜"
    case announcement = "公告"
    case talent = "才艺"
    
    var color: String {
        switch self {
        case .daily:
            return "#FF6B35"
        case .hot:
            return "#FF6B35"
        case .announcement:
            return "#FF6B35"
        case .talent:
            return "#FF6B35"
        }
    }
}

struct User: Identifiable, Codable {
    let id: String
    let userName: String
    let avatar: String?
    let signature: String?
    let isVip: Bool
}

// MARK: - 关注状态枚举
enum FollowStatus: Int, Codable {
    case isSelf = 0         // 本人（不可关注）
    case notFollowing = 1   // 未关注
    case following = 2      // 已关注
    case followBack = 3     // 回关
    case mutual = 4         // 互相关注
    
    var displayText: String {
        switch self {
        case .isSelf: return ""
        case .notFollowing: return "关注"
        case .following: return "已关注"
        case .followBack: return "回关"
        case .mutual: return "互相关注"
        }
    }
}

// MARK: - 用户验证状态枚举
enum UserJoinStatus: Int, Codable {
    case normal = 1         // 正常
    case pending = 2        // 待验证
    case pendingVoice = 3   // 待语音验证
    case deleted = -1      // 注销
    case banned = -2        // 封禁
    
    var displayText: String {
        switch self {
        case .normal: return "正常"
        case .pending: return "待验证"
        case .pendingVoice: return "待语音验证"
        case .deleted: return "注销"
        case .banned: return "封禁"
        }
    }
}

// MARK: - 拉黑状态枚举
enum BlackStatus: Int, Codable {
    case none = 1           // 未拉黑
    case beBlacked = 2      // 被拉黑
    case blackedOther = 3   // 拉黑对方
    case mutualBlack = 4    // 双方拉黑
}

// MARK: - VIP隐私配置
struct VipConfig: Codable {
    let showVisit: Bool?
    let showFollow: Bool?
    let showFollower: Bool?
    let showCharge: Bool?
    let restStatus: Bool?
    let cancelFollow: Bool?  // 接受取消关注提醒
    
    enum CodingKeys: String, CodingKey {
        case showVisit
        case showFollow
        case showFollower
        case showCharge
        case restStatus
        case cancelFollow
    }
}

// MARK: - 个人主页用户信息模型
struct UserProfile: Identifiable, Codable {
    let id: String
    let userName: String
    let avatar: String?
    let signature: String?
    let isVip: Bool
    let level: Int? // 等级/积分
    let age: Int? // 年龄
    let constellation: String? // 星座
    let city: String? // 城市
    let followCount: Int // 关注数
    let followerCount: Int // 粉丝数
    let isFollowing: Bool? // 是否已关注（兼容字段）
    let isCharged: Bool? // 是否已充电（兼容字段）
    let chargeCount: Int? // 充电总数
    
    // 新增字段
    let chargeNums: Int? // 电量总数（显示在头像上）
    let followStatus: FollowStatus? // 关注状态（1未关注/2已关注/3回关/4互相关注）
    let chargingStatus: Bool? // 是否已充电（今天是否已充电）
    let joinStatus: UserJoinStatus? // 用户验证状态
    let blackStatus: BlackStatus? // 拉黑状态
    let restStatus: Bool? // 闭门休息状态
    let vipStatus: Bool? // VIP会员状态
    let vipConfig: VipConfig? // VIP隐私配置
    let imgList: [String]? // 头图列表
    let bindUserInfo: String? // 绑定账号信息（老账号认领）
    let ownOpenId: String? // 当前登录用户ID（用于判断是否是自己）
    
    // 统计数据字段
    let publishCount: Int? // 发布数
    let collectionCount: Int? // 收藏数
    let inviteCount: Int? // 邀请数
    let blockedCount: Int? // 拉黑数
    /// 当前用户对该主页用户是否处于「隐身访问」（不留下访客痕迹），仅他人主页且 VIP 时有效
    let isInvisible: Bool?
    /// 服务端明确返回的「是否本人」标识（如 GetCurrentUserProfile 返回 true），优先于 id==ownOpenId
    let isOwnProfileFromAPI: Bool?
    /// 当前用户是否为管理员（用于动态详情等是否展示管理入口）
    let admin: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case userName
        case avatar
        case signature
        case isVip
        case level
        case age
        case constellation
        case city
        case followCount
        case followerCount
        case isFollowing
        case isCharged
        case chargeCount
        case chargeNums
        case followStatus
        case chargingStatus
        case joinStatus
        case blackStatus
        case restStatus
        case vipStatus
        case vipConfig
        case imgList
        case bindUserInfo
        case ownOpenId
        case publishCount
        case collectionCount
        case inviteCount
        case blockedCount
        case isInvisible
        case isOwnProfileFromAPI = "isOwnProfile"
        case admin
    }
    
    // 判断是否是自己：优先用服务端返回的 isOwnProfile，否则用 id == ownOpenId
    var isOwnProfile: Bool {
        if let fromAPI = isOwnProfileFromAPI { return fromAPI }
        guard let ownOpenId = ownOpenId else { return false }
        return id == ownOpenId
    }
    
    // 判断是否可以查看内容
    var canViewContent: Bool {
        // 如果是自己，总是可以查看
        if isOwnProfile {
            return true
        }
        
        // 检查拉黑状态
        if let blackStatus = blackStatus {
            switch blackStatus {
            case .beBlacked, .mutualBlack:
                return false // 被拉黑或双方拉黑，不能查看
            case .none, .blackedOther:
                break // 可以查看
            }
        }
        
        // 检查用户状态
        if let joinStatus = joinStatus {
            switch joinStatus {
            case .normal:
                return true
            case .pending, .pendingVoice:
                return false // 待验证状态，他人不能查看
            case .deleted, .banned:
                return false // 注销或封禁，不能查看
            }
        }
        
        return true
    }
    
    /// 从旧版接口格式解析（data 为 { userInfo: {...}, isInvisible } 或直接为 profile 对象但缺少 id 时用 userInfo 补全）
    static func fromLegacyAPI(dataDict: [String: Any]) -> UserProfile? {
        guard let userInfo = dataDict["userInfo"] as? [String: Any] else { return nil }
        func str(_ key: String) -> String? { userInfo[key] as? String }
        func int(_ key: String) -> Int {
            guard let v = userInfo[key] else { return 0 }
            if let n = v as? Int { return n }
            if let s = v as? String, let n = Int(s) { return n }
            return 0
        }
        func intOpt(_ key: String) -> Int? {
            guard let v = userInfo[key] else { return nil }
            if let n = v as? Int { return n }
            if let s = v as? String, let n = Int(s) { return n }
            return nil
        }
        let id = str("_id") ?? str("openId") ?? ""
        let userName = str("nickName") ?? str("userName") ?? ""
        let avatar = str("avatarVisitUrl") ?? str("avatarUrl") ?? str("avatar")
        let followNums = int("followNums")
        let fansNums = int("fansNums")
        let chargeNums = int("chargeNums")
        let dynNums = int("dynNums")
        let usersSecret0 = (userInfo["usersSecret"] as? [[String: Any]])?.first
        let isVip = (usersSecret0?["vipStatus"] as? Bool) ?? (userInfo["vipStatus"] as? Bool) ?? false
        var built: [String: Any] = [
            "id": id,
            "userName": userName,
            "isVip": isVip,
            "followCount": followNums,
            "followerCount": fansNums,
            "chargeCount": chargeNums,
            "chargeNums": chargeNums,
            "publishCount": dynNums,
            "followStatus": userInfo["followStatus"] ?? 1,
            "blackStatus": userInfo["blackStatus"] ?? 1,
            "joinStatus": userInfo["joinStatus"] ?? 1
        ]
        if let v = avatar { built["avatar"] = v }
        if let v = userInfo["signature"] as? String, !v.isEmpty { built["signature"] = v }
        if let v = userInfo["level"] as? Int ?? (userInfo["levelNums"] as? Int) { built["level"] = v }
        if let v = userInfo["age"] as? Int ?? (userInfo["age"] as? String).flatMap(Int.init) { built["age"] = v }
        if let v = userInfo["constellation"] as? String, !v.isEmpty { built["constellation"] = v }
        if let v = userInfo["city"] as? String, !v.isEmpty { built["city"] = v }
        if let arr = userInfo["imgList"] as? [String], !arr.isEmpty { built["imgList"] = arr }
        else if let one = userInfo["backgroundImg"] as? String { built["imgList"] = [one] }
        if let jsonData = try? JSONSerialization.data(withJSONObject: built),
           let profile = try? JSONDecoder().decode(UserProfile.self, from: jsonData) {
            return profile
        }
        return nil
    }
}

// MARK: - 发布相关模型

struct AitUser: Codable {
    let openId: String
    let nickName: String
}

struct MusicInfo: Codable {
    let musicId: String?
    let musicName: String?
    let musicAuthor: String?
    let musicPoster: String?
    let musicSrc: String?
    let isAudioShow: Bool
    
    init(musicId: String? = nil, musicName: String? = nil, musicAuthor: String? = nil, musicPoster: String? = nil, musicSrc: String? = nil, isAudioShow: Bool = false) {
        self.musicId = musicId
        self.musicName = musicName
        self.musicAuthor = musicAuthor
        self.musicPoster = musicPoster
        self.musicSrc = musicSrc
        self.isAudioShow = isAudioShow
    }
}

struct PublishResponse: Codable {
    let dynId: String?
    let code: Int
    let message: String
    let requestID: String?
}
