//
//  ChargeListView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct ChargeListView: View {
    let userId: String
    
    @State private var charges: [ChargeItem] = []
    @State private var isLoading = false
    @State private var page = 1
    @State private var hasMore = true
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "#000000")
                    .ignoresSafeArea()
                
                if charges.isEmpty && !isLoading {
                    VStack {
                        Text("暂无数据")
                            .font(.system(size: 16))
                            .foregroundColor(Color(hex: "#71767A"))
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(charges) { charge in
                                ChargeRowView(charge: charge)
                                    .overlay(
                                        Rectangle()
                                            .frame(height: 0.5)
                                            .foregroundColor(Color(hex: "#2F3336"))
                                        , alignment: .bottom
                                    )
                            }
                            
                            if hasMore {
                                ProgressView()
                                    .padding()
                                    .onAppear {
                                        if !isLoading {
                                            Task {
                                                await loadMore()
                                            }
                                        }
                                    }
                            }
                        }
                    }
                    .refreshable {
                        await refresh()
                    }
                }
            }
            .navigationTitle("充电")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .foregroundColor(.white)
                            .font(.system(size: 16, weight: .medium))
                    }
                }
            }
        }
        .task {
            await loadCharges()
        }
        .toolbar(.hidden, for: .tabBar)
    }
    
    private func loadCharges() async {
        isLoading = true
        page = 1
        do {
            let response = try await APIService.shared.getChargeList(userId: userId, page: page)
            charges = response.list
            hasMore = response.hasMore
        } catch {
            print("Failed to load charges: \(error)")
        }
        applyMockChargesIfNeeded()
        isLoading = false
    }
    
    private func refresh() async {
        await loadCharges()
    }
    
    private func loadMore() async {
        guard !isLoading && hasMore else { return }
        isLoading = true
        page += 1
        do {
            let response = try await APIService.shared.getChargeList(userId: userId, page: page)
            charges.append(contentsOf: response.list)
            hasMore = response.hasMore
        } catch {
            print("Failed to load more charges: \(error)")
            page -= 1
        }
        isLoading = false
    }
    
    private func applyMockChargesIfNeeded() {
#if DEBUG
        guard charges.isEmpty else { return }
        
        // 创建mock帖子
        let mockPost1 = Post(
            id: "mock_post_001",
            userId: "mock_user_101",
            userName: "晴空万里",
            userAvatar: nil,
            userSignature: "既难飞至,则必跛行",
            isVip: true,
            content: "今天天气真好，适合出去走走。分享一些美好的瞬间给大家。",
            images: ["https://picsum.photos/400/400?random=1"],
            tag: .daily,
            publishTime: Date().addingTimeInterval(-300),
            commentCount: 5,
            likeCount: 20,
            shareCount: 3,
            chargeCount: 2,
            isLiked: false,
            isCollected: false,
            isCharged: false,
            repostPost: nil,
            likeUsers: nil,
            joinCount: nil,
            circleId: nil,
            circleTitle: nil,
            circleJoinCount: nil,
            voiceUrl: nil,
            voiceDuration: nil,
            videoUrl: nil,
            musicInfo: nil
        )
        
        let mockPost2 = Post(
            id: "mock_post_002",
            userId: "mock_user_102",
            userName: "小橘灯",
            userAvatar: nil,
            userSignature: "生活需要一点甜",
            isVip: false,
            content: "分享一张美图，希望大家喜欢。",
            images: ["https://picsum.photos/400/400?random=2", "https://picsum.photos/400/400?random=3"],
            tag: .daily,
            publishTime: Date().addingTimeInterval(-3600 * 3),
            commentCount: 2,
            likeCount: 10,
            shareCount: 1,
            chargeCount: 1,
            isLiked: false,
            isCollected: false,
            isCharged: false,
            repostPost: nil,
            likeUsers: nil,
            joinCount: nil,
            circleId: nil,
            circleTitle: nil,
            circleJoinCount: nil,
            voiceUrl: nil,
            voiceDuration: nil,
            videoUrl: nil,
            musicInfo: nil
        )
        
        charges = [
            ChargeItem(id: "mock_charge_001", userId: "mock_user_101", userName: "晴空万里", avatar: nil, signature: "既难飞至,则必跛行", chargeTime: Date().addingTimeInterval(-300), chargeNums: 2, dynId: "mock_post_001", post: mockPost1),
            ChargeItem(id: "mock_charge_002", userId: "mock_user_102", userName: "小橘灯", avatar: nil, signature: "生活需要一点甜", chargeTime: Date().addingTimeInterval(-3600 * 3), chargeNums: 1, dynId: "mock_post_002", post: mockPost2),
            ChargeItem(id: "mock_charge_003", userId: "mock_user_103", userName: "边城旧梦", avatar: nil, signature: "记录生活的点点滴滴", chargeTime: Date().addingTimeInterval(-3600 * 12), chargeNums: 5, dynId: nil, post: nil),
            ChargeItem(id: "mock_charge_004", userId: "mock_user_104", userName: "森屿昼", avatar: nil, signature: nil, chargeTime: Date().addingTimeInterval(-3600 * 26), chargeNums: 3, dynId: nil, post: nil),
            ChargeItem(id: "mock_charge_005", userId: "mock_user_105", userName: "懒猫作息", avatar: nil, signature: "享受慢生活", chargeTime: Date().addingTimeInterval(-3600 * 48), chargeNums: 1, dynId: nil, post: nil)
        ]
        hasMore = false
#endif
    }
}

struct ChargeItem: Identifiable, Codable {
    let id: String
    let userId: String
    let userName: String
    let avatar: String?
    let signature: String? // 用户个人简介
    let chargeTime: Date
    let chargeNums: Int? // 充电数量
    let dynId: String? // 被充电的帖子ID
    let post: Post? // 被充电的帖子信息
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case userId = "from"
        case userName
        case avatar
        case signature
        case chargeTime = "createTime"
        case chargeNums
        case dynId
        case post
        case userInfo // 从userInfo数组中提取用户信息
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decode(String.self, forKey: .userId)
        
        // 尝试从userInfo数组中提取用户信息
        if let userInfoArray = try? container.decodeIfPresent([ChargeUserInfo].self, forKey: .userInfo),
           let firstUser = userInfoArray.first {
            userName = firstUser.nickName ?? "匿名用户"
            avatar = firstUser.avatarVisitUrl ?? firstUser.avatarUrl
            signature = firstUser.signature
        } else {
            userName = try container.decodeIfPresent(String.self, forKey: .userName) ?? "匿名用户"
            avatar = try container.decodeIfPresent(String.self, forKey: .avatar)
            signature = try container.decodeIfPresent(String.self, forKey: .signature)
        }
        
        // 处理日期
        if let date = try? container.decode(Date.self, forKey: .chargeTime) {
            chargeTime = date
        } else if let timestampString = try? container.decode(String.self, forKey: .chargeTime),
                  let date = Date.fromTimestamp(timestampString) {
            chargeTime = date
        } else {
            chargeTime = Date()
        }
        
        chargeNums = try container.decodeIfPresent(Int.self, forKey: .chargeNums)
        dynId = try container.decodeIfPresent(String.self, forKey: .dynId)
        post = try container.decodeIfPresent(Post.self, forKey: .post)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(userName, forKey: .userName)
        try container.encodeIfPresent(avatar, forKey: .avatar)
        try container.encodeIfPresent(signature, forKey: .signature)
        try container.encode(chargeTime, forKey: .chargeTime)
        try container.encodeIfPresent(chargeNums, forKey: .chargeNums)
        try container.encodeIfPresent(dynId, forKey: .dynId)
        try container.encodeIfPresent(post, forKey: .post)
    }
    
    // 便捷初始化方法（用于mock数据）
    init(id: String, userId: String, userName: String, avatar: String?, signature: String? = nil, chargeTime: Date, chargeNums: Int? = nil, dynId: String? = nil, post: Post? = nil) {
        self.id = id
        self.userId = userId
        self.userName = userName
        self.avatar = avatar
        self.signature = signature
        self.chargeTime = chargeTime
        self.chargeNums = chargeNums
        self.dynId = dynId
        self.post = post
    }
}

struct ChargeUserInfo: Codable {
    let openId: String?
    let nickName: String?
    let avatarUrl: String?
    let avatarVisitUrl: String?
    let signature: String?
}

struct ChargeRowView: View {
    let charge: ChargeItem
    
    var body: some View {
        VStack(spacing: 0) {
            // 用户信息区域
            HStack(alignment: .top, spacing: 12) {
                // 头像（可点击跳转）
                NavigationLink(destination: UserProfileView(userId: charge.userId, userName: charge.userName)) {
                    AsyncImage(url: URL(string: charge.avatar ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Circle()
                            .fill(Color(hex: "#2F3336"))
                            .overlay(
                                Text(charge.userName.isEmpty ? "匿" : String(charge.userName.prefix(1)))
                                    .foregroundColor(.white)
                                    .font(.system(size: 18, weight: .medium))
                            )
                    }
                    .frame(width: 48, height: 48)
                    .clipShape(Circle())
                }
                .buttonStyle(PlainButtonStyle())
                
                // 用户信息
                VStack(alignment: .leading, spacing: 4) {
                    // 用户名（可点击跳转）
                    NavigationLink(destination: UserProfileView(userId: charge.userId, userName: charge.userName)) {
                        Text(charge.userName.isEmpty ? "匿名用户" : charge.userName)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // 用户个人简介（在用户名下方）
                    if let signature = charge.signature, !signature.isEmpty {
                        Text(signature)
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "#71767A"))
                            .lineLimit(1)
                    }
                    
                    // 充电时间和次数
                    HStack(spacing: 8) {
                        Text(charge.chargeTime.formatMessageDate())
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#71767A"))
                        
                        if let chargeNums = charge.chargeNums, chargeNums > 0 {
                            Text("充电 \(chargeNums) 次")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#FF6B35"))
                        }
                    }
                    .padding(.top, 2)
                }
                
                Spacer()
                
                // 充电图标
                Image(systemName: "battery.100")
                    .foregroundColor(Color(hex: "#FF6B35"))
                    .font(.system(size: 20))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            
            // 帖子卡片（如果有帖子信息）- 使用与首页一致的样式
            if let post = charge.post {
                VStack(alignment: .leading, spacing: 0) {
                    // 帖子内容预览（使用PostCardView的样式）
                    NavigationLink(destination: PostDetailView(post: post)) {
                        HStack(alignment: .top, spacing: 12) {
                            // 左侧占位（对齐用户信息）
                            Spacer()
                                .frame(width: 48 + 12) // 头像宽度 + 间距
                            
                            // 帖子内容区域（参考PostCardView的样式）
                            VStack(alignment: .leading, spacing: 8) {
                                // 帖子文本内容
                                if !post.content.isEmpty {
                                    Text(post.content)
                                        .font(.system(size: 14))
                                        .foregroundColor(.white)
                                        .lineLimit(3)
                                        .padding(.top, 2)
                                }
                                
                                // 帖子图片预览（如果有）- 使用ImageGridView样式
                                if let images = post.images, !images.isEmpty {
                                    Group {
                                        if images.count == 1 {
                                            AsyncImage(url: URL(string: images[0])) { image in
                                                image
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                            } placeholder: {
                                                Rectangle()
                                                    .fill(Color(hex: "#2F3336"))
                                            }
                                            .frame(height: 200)
                                            .frame(maxWidth: 240)
                                            .cornerRadius(5)
                                            .clipped()
                                        } else if images.count == 2 {
                                            HStack(spacing: 4) {
                                                ForEach(Array(images.prefix(2).enumerated()), id: \.offset) { index, imageUrl in
                                                    AsyncImage(url: URL(string: imageUrl)) { image in
                                                        image
                                                            .resizable()
                                                            .aspectRatio(contentMode: .fill)
                                                    } placeholder: {
                                                        Rectangle()
                                                            .fill(Color(hex: "#2F3336"))
                                                    }
                                                    .frame(height: 150)
                                                    .cornerRadius(5)
                                                    .clipped()
                                                }
                                            }
                                        } else {
                                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 3), spacing: 4) {
                                                ForEach(Array(images.prefix(9).enumerated()), id: \.offset) { index, imageUrl in
                                                    AsyncImage(url: URL(string: imageUrl)) { image in
                                                        image
                                                            .resizable()
                                                            .aspectRatio(contentMode: .fill)
                                                    } placeholder: {
                                                        Rectangle()
                                                            .fill(Color(hex: "#2F3336"))
                                                    }
                                                    .frame(height: 100)
                                                    .cornerRadius(5)
                                                    .clipped()
                                                }
                                            }
                                        }
                                    }
                                    .padding(.top, 4)
                                }
                                
                                // 转发内容预览（如果有）- 使用PostCardView的repostSection样式
                                if let repost = post.repostPost {
                                    HStack(spacing: 12) {
                                        AsyncImage(url: URL(string: repost.userAvatar ?? "")) { image in
                                            image
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                        } placeholder: {
                                            Rectangle()
                                                .fill(Color(hex: "#2F3336"))
                                        }
                                        .frame(width: 44, height: 44)
                                        .cornerRadius(4)
                                        .clipped()
                                        
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(repost.userName)
                                                .font(.system(size: 15, weight: .bold))
                                                .foregroundColor(.white)
                                            
                                            Text(repost.content)
                                                .font(.system(size: 14))
                                                .foregroundColor(Color(hex: "#71767A"))
                                                .lineLimit(1)
                                        }
                                        
                                        Spacer()
                                    }
                                    .padding(12)
                                    .background(Color(hex: "#16181C"))
                                    .cornerRadius(8)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(Color(hex: "#2F3336"), lineWidth: 0.5)
                                    )
                                    .padding(.top, 8)
                                }
                                
                                // 底部信息栏：时间和互动按钮（参考PostCardView）
                                HStack(spacing: 0) {
                                    Text(post.timeAgo)
                                        .font(.system(size: 13))
                                        .foregroundColor(Color(hex: "#71767A"))
                                        .frame(width: 80, alignment: .leading)
                                    
                                    Spacer()
                                    
                                    HStack(spacing: 20) {
                                        // 转发
                                        HStack(spacing: 4) {
                                            Image(systemName: "arrow.2.squarepath")
                                                .foregroundColor(Color(hex: "#71767A"))
                                                .font(.system(size: 16))
                                            if post.shareCount > 0 {
                                                Text("\(post.shareCount)")
                                                    .font(.system(size: 13))
                                                    .foregroundColor(Color(hex: "#71767A"))
                                            }
                                        }
                                        .frame(minWidth: 44)
                                        
                                        // 评论
                                        HStack(spacing: 4) {
                                            Image(systemName: "bubble.right")
                                                .foregroundColor(Color(hex: "#71767A"))
                                                .font(.system(size: 16))
                                            if post.commentCount > 0 {
                                                Text("\(post.commentCount)")
                                                    .font(.system(size: 13))
                                                    .foregroundColor(Color(hex: "#71767A"))
                                            }
                                        }
                                        .frame(minWidth: 44)
                                        
                                        // 充电
                                        HStack(spacing: 4) {
                                            Image(systemName: post.isCharged ? "battery.100" : "battery.0")
                                                .foregroundColor(post.isCharged ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                                                .font(.system(size: 16))
                                            if post.chargeCount > 0 {
                                                Text("\(post.chargeCount)")
                                                    .font(.system(size: 13))
                                                    .foregroundColor(post.isCharged ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                                            }
                                        }
                                        .frame(minWidth: 44)
                                    }
                                }
                                .padding(.top, 8)
                            }
                            .padding(.trailing, 4)
                            
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color(hex: "#000000"))
                    }
                    .buttonStyle(CardButtonStyle())
                }
            }
        }
        .background(Color(hex: "#000000"))
    }
}
