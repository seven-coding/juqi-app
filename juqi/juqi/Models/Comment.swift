//
//  Comment.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation

struct Comment: Identifiable, Codable {
    let id: String
    let postId: String
    let userId: String
    let userName: String
    let userAvatar: String?
    let content: String
    let imagePath: String?
    let publishTime: Date
    let likeCount: Int
    let isLiked: Bool
    let replies: [Comment]? // 二级评论数组
    let mentionedUsers: [MentionedUser]? // @的用户列表
    let replyToUserId: String? // 回复的用户ID（二级评论时使用）
    let replyToUserName: String? // 回复的用户名（二级评论时使用）
    let forwardStatus: Bool? // 是否为转发评论
    
    struct MentionedUser: Codable {
        let id: String
        let userName: String
    }
    
    var formatDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "MM-dd HH:mm"
        return formatter.string(from: publishTime)
    }
    
    var timeAgo: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        formatter.locale = Locale(identifier: "zh_CN")
        return formatter.localizedString(for: publishTime, relativeTo: Date())
    }
}

struct CommentListResponse: Codable {
    let list: [Comment]
    let total: Int?
    let hasMore: Bool
}

struct CommentResponse: Codable {
    let commentId: String?
    let code: Int
    let message: String
}
