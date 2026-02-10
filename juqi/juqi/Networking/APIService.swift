//
//  APIService.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation
import UIKit

class APIService {
    static let shared = APIService()
    
    private init() {}
    
    /// 获取动态列表（服务端为游标分页：首页不传 publicTime，加载更多传上一页返回的 publicTime）
    /// - Parameters:
    ///   - type: 类型 (all, follow, circle, topic等)
    ///   - limit: 每页数量
    ///   - publicTime: 游标，仅加载更多时传（上一页返回的 publicTime）
    ///   - circleId: 圈子ID（type == "circle" 时必传）
    /// - Note: 不使用缓存，确保 content（含 #话题#、@用户）与服务器一致
    func getDynList(type: String, limit: Int = 20, publicTime: Double? = nil, circleId: String? = nil) async throws -> DynListResponse {
        var data: [String: Any] = [
            "type": type,
            "limit": limit
        ]
        if let cursor = publicTime {
            data["publicTime"] = cursor
        }
        if let circleId = circleId {
            data["circleId"] = circleId
        }
        return try await NetworkService.shared.request(
            operation: "appGetDynList",
            data: data,
            useCache: false
        )
    }
    
    /// 点赞动态
    func likeDyn(id: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appLikeDyn",
            data: ["id": id]
        )
    }
    
    /// 转发动态
    /// - Parameters:
    ///   - id: 动态ID
    ///   - content: 转发时的评论内容（可选）
    ///   - circleId: 圈子ID（可选）
    ///   - circleTitle: 圈子标题（可选）
    ///   - mentionedUsers: @的用户列表（可选）
    ///   - ifForComment: 是否转发并评论（默认false）
    /// - Returns: 转发响应
    func repostDyn(
        id: String,
        content: String? = nil,
        circleId: String? = nil,
        circleTitle: String? = nil,
        mentionedUsers: [AitUser]? = nil,
        ifForComment: Bool = false
    ) async throws -> RepostResponse {
        var data: [String: Any] = [
            "id": id,
            "ifForComment": ifForComment
        ]
        
        if let content = content {
            data["content"] = content
        }
        
        if let circleId = circleId {
            data["circleId"] = circleId
        }
        
        if let circleTitle = circleTitle {
            data["circleTitle"] = circleTitle
        }
        
        if let mentionedUsers = mentionedUsers {
            data["ait"] = mentionedUsers.map { ["openId": $0.openId, "nickName": $0.nickName] }
        }
        
        return try await NetworkService.shared.request(
            operation: "appRepostDyn",
            data: data
        )
    }
    
    /// 充电
    func chargeDyn(id: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appChargeDyn",
            data: ["id": id]
        )
    }
    
    /// 收藏动态
    func favoriteDyn(id: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appFavoriteDyn",
            data: ["id": id]
        )
    }
    
    /// 取消收藏动态
    func unfavoriteDyn(id: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appUnfavoriteDyn",
            data: ["id": id]
        )
    }
    
    /// 删除动态（本人）
    func deleteDyn(id: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appDeleteDyn",
            data: ["id": id]
        )
    }
    
    /// 个人主页置顶/取消置顶（本人动态）
    /// - Parameters:
    ///   - postId: 动态 ID
    ///   - pin: true=置顶到个人主页，false=取消置顶
    func setUserProfilePin(postId: String, pin: Bool) async throws {
        _ = try await NetworkService.shared.request(
            operation: "appSetUserProfilePin",
            data: ["postId": postId, "pin": pin]
        ) as EmptyResponse
    }
    
    /// 获取话题列表
    func getTopicList() async throws -> [Topic] {
        return try await NetworkService.shared.request(operation: "appGetTopicList")
    }
    
    /// 发布动态
    /// - Parameters:
    ///   - content: 动态内容
    ///   - circleId: 圈子ID
    ///   - circleTitle: 圈子标题
    ///   - imageIds: 图片URL列表
    ///   - topic: 话题列表
    ///   - ait: @用户列表
    ///   - music: 音乐信息
    func publishDyn(
        content: String,
        circleId: String,
        circleTitle: String,
        imageIds: [String] = [],
        topic: [String]? = nil,
        ait: [AitUser]? = nil,
        music: MusicInfo? = nil
    ) async throws -> PublishResponse {
        var data: [String: Any] = [
            "dynContent": content,
            "circleId": circleId,
            "circleTitle": circleTitle,
            "imageIds": imageIds
        ]
        
        if let topic = topic {
            data["topic"] = topic
        }
        
        if let ait = ait {
            data["ait"] = ait.map { ["openId": $0.openId, "nickName": $0.nickName] }
        }
        
        if let music = music {
            data["musicPoster"] = music.musicPoster
            data["musicName"] = music.musicName
            data["musicId"] = music.musicId
            data["musicAuthor"] = music.musicAuthor
            data["musicSrc"] = music.musicSrc
            data["isAudioShow"] = music.isAudioShow
        }
        
        return try await NetworkService.shared.request(
            operation: "appPublishDyn",
            data: data
        )
    }
    
    /// 上传图片
    /// - Parameter image: 图片UIImage对象
    /// - Returns: 图片URL
    func uploadImage(image: UIImage) async throws -> String {
        // 这里需要将UIImage转换为Data并上传
        // 实际实现中需要调用真实的上传接口
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw APIError.unknown
        }
        
        // 模拟上传，返回一个URL
        // 实际实现中需要调用 appUploadImage 接口
        let response: ImageUploadResponse = try await NetworkService.shared.request(
            operation: "appUploadImage",
            data: ["imageData": imageData.base64EncodedString()]
        )
        return response.url
    }
    
    /// 搜索话题
    /// - Parameter keyword: 搜索关键词（可选）
    /// - Returns: 话题列表
    func searchTopic(keyword: String? = nil) async throws -> [Topic] {
        var data: [String: Any] = [:]
        if let keyword = keyword {
            data["keyword"] = keyword
        }
        return try await NetworkService.shared.request(
            operation: "appSearchTopic",
            data: data
        )
    }
    
    /// 创建话题
    /// - Parameter name: 话题名称
    /// - Returns: 创建的话题
    func createTopic(name: String) async throws -> Topic {
        return try await NetworkService.shared.request(
            operation: "appCreateTopic",
            data: ["topic": name]
        )
    }
    
    /// 获取话题详情
    /// - Parameter topicName: 话题名称
    /// - Returns: 话题详情
    func getTopicDetail(topicName: String) async throws -> TopicDetail {
        return try await NetworkService.shared.request(
            operation: "appGetTopicDetail",
            data: ["topic": topicName]
        )
    }
    
    /// 获取话题动态列表（服务端游标分页：传 publicTime 加载下一页）
    func getTopicDynList(topicName: String, limit: Int = 20, publicTime: Double? = nil) async throws -> DynListResponse {
        var data: [String: Any] = ["topic": topicName, "limit": limit]
        if let cursor = publicTime { data["publicTime"] = cursor }
        return try await NetworkService.shared.request(
            operation: "appGetTopicDynList",
            data: data
        )
    }
    
    /// 搜索用户
    /// - Parameter keyword: 搜索关键词
    /// - Returns: 用户列表
    func searchUser(keyword: String) async throws -> [User] {
        return try await NetworkService.shared.request(
            operation: "appSearchUser",
            data: ["keyword": keyword]
        )
    }
    
    /// 搜索内容（动态/帖子）
    /// - Parameter keyword: 搜索关键词
    /// - Returns: 动态列表响应
    func searchContent(keyword: String, page: Int = 1, limit: Int = 20) async throws -> DynListResponse {
        return try await NetworkService.shared.request(
            operation: "appSearchDyn",
            data: [
                "keyword": keyword,
                "page": page,
                "limit": limit
            ]
        )
    }
    
    /// 获取电站（圈子）列表
    /// - Returns: 全部电站列表
    func getCircleList() async throws -> [CircleItem] {
        let response: CircleListResponse = try await NetworkService.shared.request(
            operation: "appGetCircleList",
            data: [:]
        )
        return response.list
    }

    /// 获取电站详情（名称、加入状态等）
    /// - Parameter circleId: 电站ID
    /// - Returns: 电站详情与关注状态
    func getCircleDetail(circleId: String) async throws -> CircleDetailResponse {
        return try await NetworkService.shared.request(
            operation: "appGetCircleDetail",
            data: ["circleId": circleId]
        )
    }

    /// 获取帖子详情
    /// - Parameter id: 帖子ID
    /// - Returns: 帖子详情
    /// - Note: 不使用缓存，确保 content（含 #话题#、@用户）与服务器一致
    func getDynDetail(id: String) async throws -> Post {
        return try await NetworkService.shared.request(
            operation: "appGetDynDetail",
            data: ["id": id],
            useCache: false
        )
    }
    
    /// 获取评论列表
    /// - Parameters:
    ///   - postId: 帖子ID
    ///   - page: 页码
    ///   - limit: 每页数量
    /// - Returns: 评论列表响应
    func getDynComment(postId: String, page: Int = 1, limit: Int = 20) async throws -> CommentListResponse {
        return try await NetworkService.shared.request(
            operation: "appGetDynComment",
            data: [
                "id": postId,
                "page": page,
                "limit": limit
            ]
        )
    }
    
    /// 提交评论
    /// - Parameters:
    ///   - postId: 帖子ID
    ///   - content: 评论内容
    ///   - imagePath: 评论图片URL（可选）
    ///   - replyTo: 回复的评论ID（可选，二级评论时使用）
    ///   - replyToUserId: 回复的用户ID（可选，二级评论时使用）
    ///   - mentionedUsers: @的用户列表（可选）
    /// - Returns: 评论响应
    func submitComment(
        postId: String,
        content: String,
        imagePath: String? = nil,
        replyTo: String? = nil,
        replyToUserId: String? = nil,
        mentionedUsers: [AitUser]? = nil
    ) async throws -> CommentResponse {
        var data: [String: Any] = [
            "id": postId,
            "commentContent": content
        ]
        
        if let imagePath = imagePath {
            data["imagePath"] = imagePath
        }
        
        if let replyTo = replyTo {
            data["commentid"] = replyTo
            data["type"] = "replay"
        } else {
            data["type"] = "add"
        }
        
        if let replyToUserId = replyToUserId {
            data["to"] = replyToUserId
        }
        
        if let mentionedUsers = mentionedUsers {
            data["ait"] = mentionedUsers.map { ["openId": $0.openId, "nickName": $0.nickName] }
        }
        
        return try await NetworkService.shared.request(
            operation: "appCommentDyn",
            data: data
        )
    }
    
    /// 评论点赞/取消点赞
    /// - Parameters:
    ///   - commentId: 评论ID
    ///   - postId: 帖子ID
    ///   - isFirstLevel: 是否为一级评论
    ///   - firstIndex: 一级评论索引（二级评论时使用）
    ///   - secondIndex: 二级评论索引（二级评论时使用）
    /// - Returns: 空响应
    func likeComment(
        commentId: String,
        postId: String,
        isFirstLevel: Bool = true,
        firstIndex: Int? = nil,
        secondIndex: Int? = nil
    ) async throws -> EmptyResponse {
        var data: [String: Any] = [
            "id": postId,
            "commentId": commentId
        ]
        
        if isFirstLevel {
            data["type"] = 3 // 一级评论点赞
        } else {
            data["type"] = 4 // 二级评论点赞
            if let firstIndex = firstIndex {
                data["firstIndex"] = firstIndex
            }
            if let secondIndex = secondIndex {
                data["secondIndex"] = secondIndex
            }
        }
        
        return try await NetworkService.shared.request(
            operation: "appLikeComment",
            data: data
        )
    }
    
    /// 删除评论
    /// - Parameters:
    ///   - commentId: 评论ID
    ///   - postId: 帖子ID
    ///   - isFirstLevel: 是否为一级评论
    ///   - firstIndex: 一级评论索引（二级评论时使用）
    ///   - secondIndex: 二级评论索引（二级评论时使用）
    /// - Returns: 空响应
    func deleteComment(
        commentId: String,
        postId: String,
        isFirstLevel: Bool = true,
        firstIndex: Int? = nil,
        secondIndex: Int? = nil
    ) async throws -> EmptyResponse {
        var data: [String: Any] = [
            "id": postId,
            "commentId": commentId
        ]
        
        if isFirstLevel {
            data["type"] = 3 // 一级评论
        } else {
            data["type"] = 4 // 二级评论
            if let firstIndex = firstIndex {
                data["firstIndex"] = firstIndex
            }
            if let secondIndex = secondIndex {
                data["secondIndex"] = secondIndex
            }
        }
        
        return try await NetworkService.shared.request(
            operation: "appDeleteComment",
            data: data
        )
    }
    
    /// 关注用户
    /// - Parameter userId: 用户ID
    /// - Returns: 空响应
    func followUser(userId: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appFollowUser",
            data: ["userId": userId]
        )
    }
    
    /// 取消关注用户
    /// - Parameter userId: 用户ID
    /// - Returns: 空响应
    func unfollowUser(userId: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appUnfollowUser",
            data: ["userId": userId]
        )
    }
    
    /// 获取当前用户信息
    /// - Returns: 用户信息
    func getCurrentUserProfile() async throws -> UserProfile {
        return try await NetworkService.shared.request(
            operation: "appGetCurrentUserProfile"
        )
    }
    
    /// 获取指定用户信息
    /// - Parameter userId: 用户ID
    /// - Returns: 用户信息
    func getUserProfile(userId: String) async throws -> UserProfile {
        return try await NetworkService.shared.request(
            operation: "appGetUserProfile",
            data: ["userId": userId]
        )
    }
    
    /// 获取用户动态列表（服务端游标分页：传 publicTime 加载下一页）
    func getUserDynList(userId: String? = nil, limit: Int = 20, publicTime: Double? = nil) async throws -> DynListResponse {
        var data: [String: Any] = ["limit": limit]
        if let uid = userId { data["userId"] = uid }
        if let cursor = publicTime { data["publicTime"] = cursor }
        return try await NetworkService.shared.request(
            operation: "appGetUserDynList",
            data: data
        )
    }
    
    /// 给用户充电
    /// - Parameter userId: 用户ID
    /// - Returns: 空响应
    func chargeUser(userId: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appChargeUser",
            data: ["userId": userId]
        )
    }
    
    /// 获取用户关注状态
    /// - Parameter userId: 用户ID
    /// - Returns: 关注状态
    func getUserFollowStatus(userId: String) async throws -> FollowStatus {
        let response: FollowStatusResponse = try await NetworkService.shared.request(
            operation: "appGetUserFollowStatus",
            data: ["userId": userId]
        )
        // 将数字状态转换为枚举
        return FollowStatus(rawValue: response.followStatus) ?? .notFollowing
    }
    
    /// 拉黑用户
    /// - Parameter userId: 用户ID
    /// - Returns: 空响应
    func blackUser(userId: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appBlackUser",
            data: ["userId": userId]
        )
    }
    
    /// 取消拉黑用户
    /// - Parameter userId: 用户ID
    /// - Returns: 空响应
    func unblackUser(userId: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appUnblackUser",
            data: ["userId": userId]
        )
    }
    
    /// 获取或创建与目标用户的私聊会话 ID（用于个人主页「私聊」跳转）
    /// - Parameter userId: 目标用户 ID
    /// - Returns: chatId 与 targetOpenId
    func getChatId(userId: String) async throws -> ChatIdResponse {
        return try await NetworkService.shared.request(
            operation: "appGetChatId",
            data: ["userId": userId]
        )
    }
    
    /// 记录访问他人主页（访客痕迹，用于最近来访等）
    /// - Parameter userId: 被访问用户 ID
    func recordVisit(userId: String) async throws {
        _ = try await NetworkService.shared.request(
            operation: "appRecordVisit",
            data: ["userId": userId]
        ) as EmptyResponse
    }
    
    /// 设置隐身访问（VIP）：对某用户访问时是否留下访客痕迹
    /// - Parameters:
    ///   - userId: 目标用户 ID
    ///   - leaveTrace: true=留下痕迹，false=不留下（隐身）
    func setVisitStatus(userId: String, leaveTrace: Bool) async throws {
        _ = try await NetworkService.shared.request(
            operation: "appSetVisitStatus",
            data: ["userId": userId, "leaveTrace": leaveTrace]
        ) as EmptyResponse
    }
    
    /// 获取隐身访问列表（对哪些用户设置了不留下访客痕迹）
    func getNoVisitList(page: Int = 1, limit: Int = 20) async throws -> NoVisitListResponse {
        try await NetworkService.shared.request(
            operation: "appGetNoVisitList",
            data: ["page": page, "limit": limit]
        ) as NoVisitListResponse
    }
    
    /// 获取「不看对方动态」列表
    func getNoSeeList(page: Int = 1, limit: Int = 20) async throws -> NoVisitListResponse {
        try await NetworkService.shared.request(
            operation: "appGetNoSeeList",
            data: ["page": page, "limit": limit]
        ) as NoVisitListResponse
    }
    
    /// 获取「不让对方看我动态」列表
    func getNoSeeMeList(page: Int = 1, limit: Int = 20) async throws -> NoVisitListResponse {
        try await NetworkService.shared.request(
            operation: "appGetNoSeeMeList",
            data: ["page": page, "limit": limit]
        ) as NoVisitListResponse
    }
    
    /// 设置用户状态（管理员）
    /// - Parameters:
    ///   - userId: 用户ID
    ///   - status: 用户状态
    /// - Returns: 空响应
    func setUserStatus(userId: String, status: UserJoinStatus) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appSetUserStatus",
            data: [
                "userId": userId,
                "status": status.rawValue
            ]
        )
    }
    
    /// 获取用户操作记录（管理员）
    /// - Parameter userId: 用户ID
    /// - Returns: 操作记录列表
    func getUserActionHistory(userId: String) async throws -> [UserActionHistory] {
        return try await NetworkService.shared.request(
            operation: "appGetUserActionHistory",
            data: ["userId": userId]
        )
    }
    
    /// 设置用户标签（管理员）
    /// - Parameters:
    ///   - userId: 用户ID
    ///   - auth: 用户标签信息
    /// - Returns: 空响应
    func setUserAuth(userId: String, auth: UserAuth) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appSetUserAuth",
            data: [
                "userId": userId,
                "auth": auth
            ]
        )
    }
    
    // MARK: - 个人中心相关API
    
    /// 获取用户列表（关注/粉丝）
    /// - Parameters:
    ///   - type: 列表类型（follow/follower）
    ///   - userId: 用户ID
    ///   - page: 页码
    ///   - limit: 每页数量
    /// - Returns: 用户列表响应
    func getUserList(type: ListType, userId: String, page: Int = 1, limit: Int = 20) async throws -> UserListResponse {
        let typeString: String
        switch type {
        case .follow:
            typeString = "follows"
        case .follower:
            typeString = "followers"
        case .charge:
            typeString = "charging"
        }
        
        return try await NetworkService.shared.request(
            operation: "appGetUserList",
            data: [
                "type": typeString,
                "openId": userId,
                "page": page,
                "limit": limit
            ]
        )
    }
    
    /// 获取被充电列表
    /// - Parameters:
    ///   - userId: 用户ID
    ///   - page: 页码
    ///   - limit: 每页数量
    /// - Returns: 充电列表响应
    func getChargeList(userId: String, page: Int = 1, limit: Int = 20) async throws -> ChargeListResponse {
        return try await NetworkService.shared.request(
            operation: "appGetChargeList",
            data: [
                "openId": userId,
                "page": page,
                "limit": limit
            ]
        )
    }
    
    /// 获取收藏列表（服务端游标分页：传 publicTime 加载下一页）
    func getFavoriteList(userId: String, limit: Int = 20, publicTime: Double? = nil) async throws -> DynListResponse {
        var data: [String: Any] = ["userId": userId, "limit": limit]
        if let cursor = publicTime { data["publicTime"] = cursor }
        return try await NetworkService.shared.request(
            operation: "appGetFavoriteList",
            data: data
        )
    }
    
    /// 获取拉黑列表
    /// - Parameters:
    ///   - userId: 用户ID
    ///   - page: 页码
    ///   - limit: 每页数量
    /// - Returns: 用户列表响应
    func getBlackList(userId: String, page: Int = 1, limit: Int = 20) async throws -> UserListResponse {
        return try await NetworkService.shared.request(
            operation: "appGetBlackList",
            data: [
                "openId": userId,
                "type": "black",
                "page": page,
                "limit": limit
            ]
        )
    }
    
    /// 移除拉黑
    /// - Parameters:
    ///   - userId: 当前用户ID
    ///   - blackUserId: 被拉黑的用户ID
    /// - Returns: 空响应
    func removeBlackUser(userId: String, blackUserId: String) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appUnblackUser",
            data: [
                "userId": blackUserId
            ]
        )
    }
    
    /// 更新用户信息
    /// - Parameter data: 用户信息数据
    /// - Returns: 空响应
    func updateUserInfo(data: [String: Any]) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appUpdateUserInfo",
            data: data
        )
    }
    
    /// 更新VIP隐私配置
    /// - Parameter config: VIP配置
    /// - Returns: 空响应
    func updateVipConfig(config: VipConfig) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appUpdateVipConfig",
            data: [
                "vipConfig": config
            ]
        )
    }
    
    /// 获取邀请码
    /// - Parameter userId: 用户ID
    /// - Returns: 邀请码
    func getInviteCode(userId: String) async throws -> String {
        let response: InviteCodeResponse = try await NetworkService.shared.request(
            operation: "appGetInviteCode",
            data: ["openId": userId]
        )
        return response.inviteCode
    }
    
    /// 获取邀请数量
    /// - Parameter userId: 用户ID
    /// - Returns: 邀请数量
    func getInviteCount(userId: String) async throws -> Int {
        let response: InviteCountResponse = try await NetworkService.shared.request(
            operation: "appGetInviteCount",
            data: ["openId": userId]
        )
        return response.count
    }
    
    /// 保存收货地址
    /// - Parameter address: 地址信息
    /// - Returns: 空响应
    func saveAddress(address: Address) async throws -> EmptyResponse {
        return try await NetworkService.shared.request(
            operation: "appSaveAddress",
            data: [
                "name": address.name,
                "phone": address.phone,
                "address": address.address,
                "detail": address.detail ?? ""
            ]
        )
    }
    
    // MARK: - 消息相关API
    
    /// 获取消息列表
    /// - Parameters:
    ///   - page: 页码
    ///   - limit: 每页数量
    ///   - type: 消息类型（可选）
    ///   - from: 发送者ID（可选）
    /// - Returns: 消息列表响应
    func getMessages(page: Int = 1, limit: Int = 20, type: Int? = nil, from: String? = nil) async throws -> MessageListResponse {
        var data: [String: Any] = [
            "page": page,
            "limit": limit
        ]
        
        if let type = type {
            data["type"] = type
        }
        
        if let from = from {
            data["from"] = from
        }
        
        return try await NetworkService.shared.request(
            operation: "getMessagesNew",
            data: data
        )
    }
    
    /// 设置消息状态（标记已读/删除）
    /// - Parameters:
    ///   - mesTypeId: 消息类型ID
    ///   - mesType: 消息类型
    ///   - status: 状态（1-已读，3-删除）
    ///   - grouptype: 分组类型（可选）
    ///   - messFromType: 消息来源类型（可选）
    /// - Returns: 空响应
    func setMessage(
        mesTypeId: String,
        mesType: Int,
        status: Int,
        grouptype: Int? = nil,
        messFromType: Int? = nil
    ) async throws -> EmptyResponse {
        var data: [String: Any] = [
            "type": 1,
            "status": status,
            "mesTypeId": mesTypeId,
            "mesType": mesType
        ]
        
        if let grouptype = grouptype {
            data["grouptype"] = grouptype
        }
        
        if let messFromType = messFromType {
            data["messFromType"] = messFromType
        }
        
        return try await NetworkService.shared.request(
            operation: "setMessage",
            data: data
        )
    }
}

// MARK: - API响应模型
struct FollowStatusResponse: Codable {
    let followStatus: Int // 0: 本人, 1: 未关注, 2: 已关注, 3: 已关注你, 4: 互相关注
}

struct ChatIdResponse: Codable {
    let chatId: String
    let targetOpenId: String
}

struct UserActionHistory: Identifiable, Codable {
    let id: String
    let type: Int
    let reason: String?
    let createTime: Date
    let content: String
}

struct UserAuth: Codable {
    let verifier: Bool?
    let admin: Bool?
    let superAdmin: Bool?
    let censor: Bool?
}

struct DynListResponse: Codable {
    let list: [Post]
    let total: Int?
    let hasMore: Bool
    /// 游标，加载下一页时传入（服务端为游标分页，不用 page）
    let publicTime: Double?

    init(list: [Post], total: Int? = nil, hasMore: Bool, publicTime: Double? = nil) {
        self.list = list
        self.total = total
        self.hasMore = hasMore
        self.publicTime = publicTime
    }
}

struct CircleDetailResponse: Codable {
    let circle: CircleItem?
    let followStatus: Int?

    init(circle: CircleItem?, followStatus: Int?) {
        self.circle = circle
        self.followStatus = followStatus
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        circle = try c.decodeIfPresent(CircleItem.self, forKey: .circle)
        followStatus = Self.decodeIntIfPresent(from: c, forKey: .followStatus)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(circle, forKey: .circle)
        try c.encodeIfPresent(followStatus, forKey: .followStatus)
    }

    private enum CodingKeys: String, CodingKey { case circle, followStatus }

    private static func decodeIntIfPresent(from c: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> Int? {
        if let n = try? c.decodeIfPresent(Int.self, forKey: key) { return n }
        if let s = try? c.decodeIfPresent(String.self, forKey: key), let n = Int(s) { return n }
        return nil
    }
}

struct EmptyResponse: Codable {}

struct Topic: Identifiable, Codable {
    let id: String
    let name: String
    let icon: String?
}

struct ImageUploadResponse: Codable {
    let url: String
}

// MARK: - 个人中心相关响应模型
struct UserListResponse: Codable {
    let list: [User]
    let total: Int?
    let hasMore: Bool
}

struct NoVisitListResponse: Codable {
    let list: [UserListItem]
    let total: Int?
    let hasMore: Bool
}

struct ChargeListResponse: Codable {
    let list: [ChargeItem]
    let total: Int?
    let hasMore: Bool
}

struct InviteCodeResponse: Codable {
    let inviteCode: String
}

struct InviteCountResponse: Codable {
    let count: Int
}

struct Address: Codable {
    let name: String
    let phone: String
    let address: String
    let detail: String?
}

struct RepostResponse: Codable {
    let dynId: String
    let message: String
}
