//
//  PostDetailView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import UIKit
import PhotosUI

struct PostDetailView: View {
    let post: Post
    @State private var detailPost: Post?
    @State private var isLoading = true
    @State private var isReposted = false
    @State private var isCharged = false
    @State private var selectedImageIndex: Int = 0
    @State private var showImagePreview = false
    @State private var replyToComment: Comment? = nil
    @State private var commentListRefreshTrigger = UUID()
    /// 展示用评论数（评论成功后 +1，与 detailPost 同步）
    @State private var displayCommentCount: Int = 0
    /// 展示用充电数（充电成功后 +1，与 detailPost 同步）
    @State private var displayChargeCount: Int = 0
    @State private var isFollowing = false
    @State private var followStatus: Int? = nil // 0: 本人, 1: 无关注, 2: 已关注, 3: 已关注你, 4: 互相关注
    @State private var showActionSheet = false
    @State private var isLikeListExpanded = false
    @State private var showCommentInput = false
    @State private var isCollected = false
    @State private var commentInputText = ""
    @State private var selectedCommentImage: UIImage? = nil
    @State private var showCommentImagePicker = false
    @State private var pendingCommentImage: UIImage?
    @State private var showCommentImageConfirmSheet = false
    @State private var showCommentEmojiPicker = false
    @State private var currentUserId: String? = nil
    @State private var currentUserName: String = ""
    @State private var currentUserAvatar: String? = nil
    @FocusState private var isCommentInputFocused: Bool
    @State private var showRepostSheet = false
    @State private var repostContent = ""
    @State private var isReposting = false
    @State private var navigationTopic: String? = nil
    @State private var navigationUser: String? = nil
    @State private var showCopyToast = false
    @State private var isPinned = false
    @State private var errorMessage: String? = nil
    /// 当前用户是否为管理员（是则无论谁的帖子都显示管理入口）
    @State private var isCurrentUserAdmin = false
    @State private var showUnfollowConfirm = false
    /// 发现页电站列表（用于判断帖子电站是否可跳转）
    @State private var discoverCircles: [CircleItem] = []
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if isLoading {
                ProgressView()
                    .tint(Color(hex: "#FF6B35"))
            } else if let detailPost = detailPost {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        // 错误态：加载失败时展示重试
                        if let msg = errorMessage {
                            EmptyStateView(
                                icon: "wifi.exclamationmark",
                                title: "加载失败",
                                message: msg,
                                actionTitle: "重试",
                                iconColor: .red.opacity(0.8),
                                iconSize: 44,
                                action: {
                                    errorMessage = nil
                                    Task {
                                        await loadDetail()
                                        await MainActor.run {
                                            commentListRefreshTrigger = UUID()
                                        }
                                    }
                                }
                            )
                            .padding(.horizontal, 16)
                            .padding(.top, 12)
                            .padding(.bottom, 8)
                        }
                        
                        // 用户信息区
                        userInfoSection(post: detailPost)
                            .padding(.horizontal, 16)
                            .padding(.top, 12)
                            .padding(.bottom, 16)
                        
                        Divider()
                            .background(Color(hex: "#2F3336"))
                        
                        // 帖子内容区（已取消独立电站栏，仅保留日期下方「发布在 xx电站」）
                        postContentSection(post: detailPost)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 16)
                        
                        Divider()
                            .background(Color(hex: "#2F3336"))
                        
                        // 互动详情区：仅在有充电时显示充电栏
                        if (displayChargeCount > 0) || isCharged {
                            interactionSection(post: detailPost)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 16)
                            
                            Divider()
                                .background(Color(hex: "#2F3336"))
                        }
                        
                        // 评论区域
                        CommentListView(
                            postId: detailPost.id,
                            postOwnerId: detailPost.userId,
                            currentUserId: currentUserId,
                            onReply: { comment in
                                replyToComment = comment
                                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                    showCommentInput = true
                                }
                            }
                        )
                        .id(commentListRefreshTrigger)
                        .padding(.vertical, 20)
                    }
                }
                .refreshable {
                    // 下拉刷新
                    await loadDetail()
                    commentListRefreshTrigger = UUID()
                }
                .safeAreaInset(edge: .bottom) {
                    if showCommentInput {
                        // 展开的评论输入界面（参考图2）
                        expandedCommentInputView(post: detailPost)
                    } else {
                        // 底部操作栏（参考图1）
                        compactBottomBar(post: detailPost)
                    }
                }
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("动态详情")
                    .foregroundColor(.white)
                    .font(.system(size: 17, weight: .semibold))
            }
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: {
                    dismiss()
                }) {
                    Image(systemName: "chevron.left")
                        .foregroundColor(.white)
                        .font(.system(size: 16, weight: .medium))
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    showActionSheet = true
                }) {
                    Image(systemName: "ellipsis")
                        .foregroundColor(.white)
                        .font(.system(size: 16))
                }
            }
        }
        .task {
            // 先展示列表带来的 post，避免白屏长时间转圈；再后台拉详情与用户信息
            detailPost = post
            displayCommentCount = post.commentCount
            displayChargeCount = post.chargeCount
            isCharged = post.isCharged
            isPinned = post.isPinned ?? false
            isLoading = false
            await loadDetail()
            await loadDiscoverCircles()
        }
        .fullScreenCover(isPresented: $showImagePreview) {
            if let images = detailPost?.images {
                ImagePreviewView(images: images, currentIndex: selectedImageIndex)
            }
        }
        .toolbar(.hidden, for: .tabBar)
        .sheet(isPresented: $showActionSheet) {
            MoreOptionsSheetView(
                actions: actionSheetItems,
                onActionSelected: { handleAction($0) },
                onDismiss: { showActionSheet = false }
            )
        }
        .confirmationDialog("取消关注", isPresented: $showUnfollowConfirm, titleVisibility: .visible) {
            Button("确定取消关注", role: .destructive) {
                Task { await toggleFollow() }
            }
            Button("取消", role: .cancel) {}
        } message: {
            Text("确定不再关注该用户？")
        }
        .environment(\.openURL, OpenURLAction { url in
            if url.scheme == "juqi" {
                let host = url.host ?? ""
                let path = url.path.replacingOccurrences(of: "/", with: "").removingPercentEncoding ?? ""
                if host == "user" {
                    navigationUser = path
                    return .handled
                } else if host == "topic" {
                    navigationTopic = path
                    return .handled
                }
                return .handled
            }
            return .systemAction
        })
        .navigationDestination(isPresented: Binding(get: { navigationUser != nil }, set: { if !$0 { navigationUser = nil } })) {
            if let userId = navigationUser {
                UserProfileView(userId: userId, userName: "")
            }
        }
        .navigationDestination(isPresented: Binding(get: { navigationTopic != nil }, set: { if !$0 { navigationTopic = nil } })) {
            if let topicName = navigationTopic {
                TopicDetailView(topicName: topicName)
            }
        }
        .overlay {
            if showCopyToast {
                Text("已复制")
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color(hex: "#2F3336"))
                    .cornerRadius(8)
            }
        }
    }
    
    // MARK: - 圈子信息区
    private func circleInfoSection(circleId: String, circleTitle: String, joinCount: Int?) -> some View {
        HStack(spacing: 8) {
            // 圈子标识点
            Circle()
                .fill(Color(hex: "#FF6B35"))
                .frame(width: 6, height: 6)
            
            // 圈子名称（可点击跳转）
            NavigationLink(destination: CircleDetailView(circleId: circleId, circleTitle: circleTitle)) {
                Text(circleTitle)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(hex: "#FF6B35"))
            }
            
            // 参与人数
            if let count = joinCount {
                Text("与 \(count) 个橘友一起记录")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "#71767A"))
            }
            
            Spacer()
        }
    }
    
    // MARK: - 用户信息区
    private func userInfoSection(post: Post) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                // 用户头像
                NavigationLink(destination: UserProfileView(userId: post.userId, userName: post.userName)) {
                    AsyncImage(url: URL(string: post.userAvatar ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Circle()
                            .fill(Color(hex: "#2F3336"))
                            .overlay(
                                Text(post.userName.isEmpty ? "匿" : String(post.userName.prefix(1)))
                                    .foregroundColor(.white)
                                    .font(.system(size: 18, weight: .medium))
                            )
                    }
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 6) {
                    // 用户昵称和VIP标识
                    HStack(alignment: .center, spacing: 6) {
                        NavigationLink(destination: UserProfileView(userId: post.userId, userName: post.userName)) {
                            Text(post.userName.isEmpty ? "匿名用户" : post.userName)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(Color(hex: "#FF6B35"))
                        }
                        
                        if post.isVip {
                            Image(systemName: "crown.fill")
                                .foregroundColor(Color(hex: "#FFD700"))
                                .font(.system(size: 14))
                        }
                    }
                    
                    // 用户签名
                    if let signature = post.userSignature, !signature.isEmpty {
                        Text(signature)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                    }
                    // 个性签名下方：日期 + IP 属地（合规展示，仅属地如「广东」）
                    Text(dateAndLocationString(post: post))
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#71767A"))
                }
                
                Spacer()
                
                // 本人帖子不在此处显示管理入口（已移入右上角「更多」）
                if (followStatus ?? 0) != 0 {
                    // 非本人帖子，显示关注按钮；已关注时点击弹出取消关注确认
                    Button(action: {
                        if isFollowing {
                            showUnfollowConfirm = true
                        } else {
                            Task { await toggleFollow() }
                        }
                    }) {
                        Text(isFollowing ? "已关注" : "关注")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(isFollowing ? Color(hex: "#71767A") : Color(hex: "#FF6B35"))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(isFollowing ? Color.clear : Color.clear)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(isFollowing ? Color(hex: "#71767A") : Color(hex: "#FF6B35"), lineWidth: 1)
                            )
                    }
                }
            }
        }
    }
    
    // MARK: - 帖子内容区
    private func postContentSection(post: Post) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // 帖子文字（支持话题和@用户跳转，长按复制）
            RichTextView(text: post.content, mentionedUsers: post.mentionedUsers)
                .onLongPressGesture {
                    if !post.content.isEmpty {
                        UIPasteboard.general.string = post.content
                        showCopyToast = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            showCopyToast = false
                        }
                    }
                }
            
            // 转发内容
            if let repost = post.repostPost {
                VStack(alignment: .leading, spacing: 10) {
                    NavigationLink(destination: UserProfileView(userId: repost.userId ?? "", userName: repost.userName)) {
                        Text("@\(repost.userName)")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(Color(hex: "#FF6B35"))
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    if !repost.content.isEmpty {
                        Text(repost.content)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#E7E9EA"))
                            .lineLimit(4)
                            .multilineTextAlignment(.leading)
                    }
                    
                    if let repostImages = repost.images, !repostImages.isEmpty {
                        if repostImages.count == 1 {
                            AsyncImage(url: URL(string: repostImages[0])) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color(hex: "#2F3336"))
                                    .aspectRatio(1, contentMode: .fit)
                            }
                            .frame(maxWidth: 200, maxHeight: 200)
                            .aspectRatio(1, contentMode: .fit)
                            .clipped()
                            .cornerRadius(8)
                        } else {
                            ImageGridView(images: repostImages)
                                .scaleEffect(0.75, anchor: .topLeading)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(Color(hex: "#16181C"))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(hex: "#2F3336"), lineWidth: 1)
                )
            }
            
            // 语音条
            if let voiceUrl = post.voiceUrl, let duration = post.voiceDuration {
                VoicePlayerView(voiceUrl: voiceUrl, duration: duration)
            }
            
            // 视频
            if let videoUrl = post.videoUrl {
                VideoPlayerView(videoUrl: videoUrl)
            }
            
            // 音乐
            if let musicInfo = post.musicInfo {
                MusicPlayerView(musicInfo: musicInfo)
            }
            
            // 帖子图片
            if let images = post.images, !images.isEmpty {
                if images.count == 1 {
                    AsyncImage(url: URL(string: images[0])) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Rectangle()
                            .fill(Color(hex: "#2F3336"))
                            .aspectRatio(4/3, contentMode: .fit)
                            .overlay(
                                ProgressView()
                                    .tint(Color(hex: "#FF6B35"))
                            )
                    }
                    .cornerRadius(5)
                    .clipped()
                    .onTapGesture {
                        selectedImageIndex = 0
                        showImagePreview = true
                    }
                } else {
                    // 多图网格
                    ImageGridView(images: images) { index in
                        selectedImageIndex = index
                        showImagePreview = true
                    }
                }
            }
            
            // 底部信息栏：电站（信箱 icon+电站名/日常）与互动按钮，此处不显示日期
            HStack(alignment: .top, spacing: 0) {
                VStack(alignment: .leading, spacing: 4) {
                    circleDisplayView(post: post)
                }
                .frame(minWidth: 100, alignment: .leading)
                
                Spacer()
                
                // 转发
                detailInteractionButton(
                    icon: "arrow.2.squarepath",
                    count: post.shareCount,
                    color: isReposted ? Color(hex: "#FF6B35") : Color(hex: "#71767A"),
                    action: {
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                        showRepostSheet = true
                    }
                )
                
                Spacer()
                
                // 评论
                detailInteractionButton(
                    icon: "bubble.right",
                    count: displayCommentCount,
                    color: Color(hex: "#71767A"),
                    action: {
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                    }
                )
                
                Spacer()
                
                // 充电（电池图标 - 代替喜欢功能）
                ChargeButton(
                    isCharged: isCharged,
                    count: displayChargeCount,
                    action: {
                        let generator = UIImpactFeedbackGenerator(style: .medium)
                        generator.impactOccurred()
                        Task {
                            do {
                                _ = try await APIService.shared.chargeDyn(id: post.id)
                                await MainActor.run {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                        isCharged = true
                                        displayChargeCount += 1
                                    }
                                }
                                await loadDetail()
                            } catch let err as APIError {
                                if err.isAlreadyChargedError {
                                    await MainActor.run {
                                        isCharged = true
                                        if displayChargeCount == 0 { displayChargeCount = 1 }
                                    }
                                } else {
                                    print("Failed to charge: \(err)")
                                    await loadDetail()
                                }
                            } catch {
                                print("Failed to charge: \(error)")
                                await loadDetail()
                            }
                        }
                    }
                )
            }
            .padding(.top, 12)
        }
    }
    
    // 详情页专用的简单互动按钮
    private func detailInteractionButton(icon: String, count: Int?, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.system(size: 16))
                
                if let count = count, count > 0 {
                    Text("\(count)")
                        .font(.system(size: 13))
                        .foregroundColor(color)
                }
            }
            .frame(minWidth: 44)
        }
    }
    
    /// 充电列表展示用用户：接口返回的 likeUsers + 充电成功时当前用户（若尚未在列表中）放最前；当前用户先占位头像，等 loadDetail 返回 likeUsers 后显示真实头像
    private func chargeListDisplayUsers(post: Post) -> [Post.LikeUser] {
        let fromApi = post.likeUsers ?? []
        guard isCharged, let uid = currentUserId else { return fromApi }
        if fromApi.contains(where: { $0.id == uid }) { return fromApi }
        let current = Post.LikeUser(id: uid, userName: currentUserName, avatar: nil)
        return [current] + fromApi
    }
    
    // MARK: - 互动详情区
    private func interactionSection(post: Post) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // 充电统计 (代替放电/点赞)
            HStack(spacing: 4) {
                Text("|")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#71767A"))
                
                Text("充电")
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                
                Text("\(displayChargeCount)")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
            }
            
            // 互动用户头像列表
            let chargeListUsers = chargeListDisplayUsers(post: post)
            if !chargeListUsers.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            let displayCount = isLikeListExpanded ? chargeListUsers.count : min(8, chargeListUsers.count)
                            
                            ForEach(Array(chargeListUsers.prefix(displayCount).enumerated()), id: \.element.id) { index, user in
                                NavigationLink(destination: UserProfileView(userId: user.id, userName: user.userName)) {
                                    AsyncImage(url: URL(string: user.avatar ?? "")) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Circle()
                                            .fill(Color(hex: "#2F3336"))
                                            .overlay(
                                                Text(user.userName.isEmpty ? "匿" : String(user.userName.prefix(1)))
                                                    .foregroundColor(.white)
                                                    .font(.system(size: 10))
                                            )
                                    }
                                }
                                .frame(width: 32, height: 32)
                                .clipShape(Circle())
                                .overlay(
                                    Circle()
                                        .stroke(Color(hex: "#2F3336"), lineWidth: 1)
                                )
                            }
                            
                            // 如果还有更多用户，显示省略号或展开按钮
                            if chargeListUsers.count > 8 {
                                if !isLikeListExpanded {
                                    Button(action: {
                                        withAnimation {
                                            isLikeListExpanded = true
                                        }
                                    }) {
                                        Text("...")
                                            .font(.system(size: 12))
                                            .foregroundColor(Color(hex: "#71767A"))
                                            .frame(width: 32, height: 32)
                                    }
                                }
                            }
                        }
                    }
                    
                    // 展开/收起按钮
                    if chargeListUsers.count > 8 {
                        Button(action: {
                            withAnimation {
                                isLikeListExpanded.toggle()
                            }
                        }) {
                            Text(isLikeListExpanded ? "收起" : "展开 \(chargeListUsers.count) 个用户")
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "#FF6B35"))
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - 紧凑底部栏（回复框 + 圆形充电按钮，居中显示）
    private func compactBottomBar(post: Post) -> some View {
        HStack(spacing: 12) {
            Spacer()
            
            // 回复输入框（固定宽度）
            Button(action: {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                    showCommentInput = true
                }
            }) {
                HStack {
                    Text("善意的回应是沟通的开始")
                        .font(.system(size: 15))
                        .foregroundColor(.white.opacity(0.5))
                }
                .padding(.horizontal, 18)
                .frame(width: 220, height: 64)
                .background {
                    transparentLiquidGlassEffect(cornerRadius: 32)
                }
            }
            .buttonStyle(PlainButtonStyle())
            
            // 圆形充电按钮（未充电白色，已充电橘色，不显示数字）
            Button(action: {
                let generator = UIImpactFeedbackGenerator(style: .medium)
                generator.impactOccurred()
                Task {
                    do {
                        _ = try await APIService.shared.chargeDyn(id: post.id)
                        await MainActor.run {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                isCharged = true
                                displayChargeCount += 1
                            }
                        }
                        await loadDetail()
                    } catch let err as APIError {
                        if err.isAlreadyChargedError {
                            await MainActor.run {
                                isCharged = true
                                if displayChargeCount == 0 { displayChargeCount = 1 }
                            }
                        } else {
                            print("Failed to charge: \(err)")
                            await loadDetail()
                        }
                    } catch {
                        print("Failed to charge: \(error)")
                        await loadDetail()
                    }
                }
            }) {
                Image(systemName: isCharged ? "bolt.fill" : "bolt")
                    .foregroundColor(isCharged ? Color(hex: "#FF6B35") : .white)
                    .font(.system(size: 20, weight: .medium))
                    .frame(width: 64, height: 64)
                    .background {
                        Circle()
                            .fill(.clear)
                            .glassEffect(.regular.interactive())
                    }
            }
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 0)
    }
    
    // iOS 26 标准液态玻璃渲染效果（增强版，与首页保持一致）
    private func liquidGlassEffect(cornerRadius: CGFloat) -> some View {
        ZStack {
            // 底层：超薄模糊材质（增强模糊效果）
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(.ultraThinMaterial)
            
            // 中层：液态光泽感渐变（增强高光效果）
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(
                    LinearGradient(
                        stops: [
                            .init(color: .white.opacity(0.25), location: 0),  // 增强顶部高光
                            .init(color: .white.opacity(0.08), location: 0.3),
                            .init(color: .clear, location: 0.5),
                            .init(color: .white.opacity(0.08), location: 0.7),
                            .init(color: .white.opacity(0.12), location: 1)  // 增强底部反光
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            // 顶层：增强光边缘（更明显的高光边框）
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            .white.opacity(0.8),  // 增强顶部边缘高光
                            .white.opacity(0.3),
                            .white.opacity(0.1),
                            .white.opacity(0.4),  // 增强底部边缘反光
                            .white.opacity(0.6)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 0.8  // 增加边框宽度
                )
        }
        .shadow(color: .black.opacity(0.4), radius: 20, x: 0, y: 10)  // 增强阴影效果
        .shadow(color: .white.opacity(0.05), radius: 5, x: 0, y: -2)  // 添加顶部高光阴影
    }
    
    // MARK: - iOS 26 官方液态玻璃效果（与首页底部Tab对齐）
    // 使用系统原生 .glassEffect() API 实现真正的液态玻璃效果
    private func transparentLiquidGlassEffect(cornerRadius: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(.clear)
            .glassEffect(.regular.interactive())
    }
    
    // MARK: - 展开的评论输入界面（参考图2）
    private func expandedCommentInputView(post: Post) -> some View {
        VStack(spacing: 0) {
            // 输入框和发送按钮
            HStack(spacing: 12) {
                // 输入框
                TextField(
                    replyToComment != nil ? "回复 \(replyToComment?.userName ?? "")" : "善意的回应是沟通的开始",
                    text: $commentInputText,
                    axis: .vertical
                )
                .focused($isCommentInputFocused)
                .font(.system(size: 15))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color(hex: "#2F3336"))
                .cornerRadius(20)
                .lineLimit(1...5)
                
                // 发送按钮
                Button(action: {
                    Task {
                        await submitCommentFromExpandedView(post: post)
                    }
                }) {
                    Text("发送")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background((commentInputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && selectedCommentImage == nil) ? Color(hex: "#71767A") : Color(hex: "#4CAF50"))
                        .cornerRadius(20)
                }
                .disabled(commentInputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && selectedCommentImage == nil)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            
            // 表情和图片按钮
            HStack(spacing: 16) {
                Button(action: {
                    showCommentEmojiPicker = true
                }) {
                    Image(systemName: "face.smiling")
                        .foregroundColor(Color(hex: "#71767A"))
                        .font(.system(size: 20))
                        .frame(width: 40, height: 40)
                        .background(Color(hex: "#2F3336"))
                        .clipShape(Circle())
                }
                
                Button(action: {
                    showCommentImagePicker = true
                }) {
                    Image(systemName: "photo")
                        .foregroundColor(Color(hex: "#71767A"))
                        .font(.system(size: 20))
                        .frame(width: 40, height: 40)
                        .background(Color(hex: "#2F3336"))
                        .clipShape(Circle())
                }
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
            
            // 表情建议行
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(["😊", "😍", "👍", "❤️", "🔥", "✨", "🎉", "💯", "👏"], id: \.self) { emoji in
                        Button(action: {
                            commentInputText += emoji
                        }) {
                            Text(emoji)
                                .font(.system(size: 28))
                                .frame(width: 40, height: 40)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
            .frame(height: 50)
            
            // 关闭按钮
            Button(action: {
                withAnimation {
                    showCommentInput = false
                    commentInputText = ""
                    selectedCommentImage = nil
                    replyToComment = nil
                    isCommentInputFocused = false
                }
            }) {
                HStack {
                    Spacer()
                    Image(systemName: "chevron.down")
                        .foregroundColor(Color(hex: "#71767A"))
                        .font(.system(size: 14))
                    Spacer()
                }
                .padding(.vertical, 8)
            }
        }
        .background(Color(hex: "#000000"))
        .overlay(
            Rectangle()
                .frame(height: 0.5)
                .foregroundColor(Color(hex: "#2F3336")),
            alignment: .top
        )
        .photosPicker(
            isPresented: $showCommentImagePicker,
            selection: Binding(
                get: { nil },
                set: { newValue in
                    if let newValue = newValue {
                        Task {
                            await loadCommentImageForConfirm(from: newValue)
                        }
                    }
                }
            ),
            matching: .images
        )
        .sheet(isPresented: $showCommentImageConfirmSheet) {
            commentImageConfirmSheet
        }
        .sheet(isPresented: $showRepostSheet) {
            RepostSheetView(
                post: post,
                repostContent: $repostContent,
                isReposting: $isReposting,
                onRepost: {
                    await performRepost()
                }
            )
        }
        .sheet(isPresented: $showCommentEmojiPicker) {
            EmojiPickerView(
                isPresented: $showCommentEmojiPicker,
                onEmojiSelected: { emoji in
                    commentInputText += emoji
                }
            )
            .presentationDetents([.height(300)])
            .presentationDragIndicator(.visible)
        }
        .onAppear {
            // 自动聚焦输入框
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                isCommentInputFocused = true
            }
        }
    }
    
    /// 相册选图后仅加载并弹出确认，确认后再填入评论
    private func loadCommentImageForConfirm(from item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data) else {
            return
        }
        await MainActor.run {
            pendingCommentImage = image
            showCommentImageConfirmSheet = true
        }
    }
    
    /// 评论图片确认弹窗：预览 + 确认 / 取消
    private var commentImageConfirmSheet: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#000000").ignoresSafeArea()
                if let image = pendingCommentImage {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .padding()
                }
            }
            .navigationTitle("使用图片")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        pendingCommentImage = nil
                        showCommentImageConfirmSheet = false
                    }
                    .foregroundColor(Color(hex: "#71767A"))
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("确认") {
                        selectedCommentImage = pendingCommentImage
                        pendingCommentImage = nil
                        showCommentImageConfirmSheet = false
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(hex: "#FF6B35"))
                }
            }
        }
    }
    
    private func submitCommentFromExpandedView(post: Post) async {
        let trimmedText = commentInputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty || selectedCommentImage != nil else { return }
        
        // 如果有图片，先上传图片
        var imagePath: String? = nil
        if let image = selectedCommentImage {
            do {
                imagePath = try await APIService.shared.uploadImage(image: image)
            } catch {
                print("Failed to upload image: \(error)")
                return
            }
        }
        
        do {
            _ = try await APIService.shared.submitComment(
                postId: post.id,
                content: trimmedText,
                imagePath: imagePath,
                replyTo: replyToComment?.id,
                replyToUserId: replyToComment?.userId,
                mentionedUsers: nil
            )
            
            await MainActor.run {
                commentInputText = ""
                selectedCommentImage = nil
                replyToComment = nil
                showCommentInput = false
                isCommentInputFocused = false
                commentListRefreshTrigger = UUID()
                displayCommentCount += 1
            }
        } catch {
            print("Failed to submit comment: \(error)")
        }
    }
    
    // MARK: - 辅助方法
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "MM-dd HH:mm"
        return formatter.string(from: date)
    }
    
    /// 个性签名下方：日期 + IP 属地（合规，仅展示属地如「广东」）
    private func dateAndLocationString(post: Post) -> String {
        let dateStr = formatDate(post.publishTime)
        guard let loc = post.ipLocation, !loc.isEmpty else { return dateStr }
        return "\(dateStr) · \(loc)"
    }
    
    /// 发布在 xx 电站：与发现页同一数据源（appGetCircleList 白名单），按电站 id 匹配；icon + 电站名可跳转，否则显示「日常」不跳转
    private func circleDisplayView(post: Post) -> some View {
        let matchedCircle = post.circleId.flatMap { cid in discoverCircles.first { $0.id == cid } }
        let displayName: String = matchedCircle?.title ?? "日常"
        let canNavigate = matchedCircle != nil
        
        return Group {
            if canNavigate, let circle = matchedCircle {
                NavigationLink(destination: CircleDetailView(circleId: circle.id, circleTitle: circle.title)) {
                    HStack(spacing: 4) {
                        Image(systemName: "link.circle")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#71767A"))
                        Text(displayName)
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#71767A"))
                    }
                }
                .buttonStyle(.plain)
            } else if post.circleId != nil || (post.circleTitle != nil && !(post.circleTitle?.isEmpty ?? true)) {
                HStack(spacing: 4) {
                    Image(systemName: "link.circle")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#71767A"))
                    Text("日常")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#71767A"))
                }
            }
        }
    }
    
    private func loadDiscoverCircles() async {
        do {
            let list = try await APIService.shared.getCircleList()
            await MainActor.run { discoverCircles = list }
        } catch {
            // 静默失败，仅影响电站是否可跳转
        }
    }
    
    private func loadDetail() async {
        // 不再置 isLoading = true，首屏已用 post 展示，此处仅后台刷新详情
        async let detailTask = APIService.shared.getDynDetail(id: post.id)
        async let userTask = APIService.shared.getCurrentUserProfile()
        
        do {
            let (detail, userProfile) = try await (detailTask, userTask)
            await MainActor.run {
                errorMessage = nil
                detailPost = detail
                displayCommentCount = detail.commentCount
                displayChargeCount = detail.chargeCount
                isCharged = detail.isCharged
                currentUserId = userProfile.id
                currentUserName = userProfile.userName
                currentUserAvatar = userProfile.avatar
                isCollected = detail.isCollected
                isPinned = detail.isPinned ?? false
                isCurrentUserAdmin = userProfile.admin == true
            }
            // 本人帖子：followStatus = 0；非本人：从接口拉取关注状态
            if userProfile.id == detail.userId {
                await MainActor.run {
                    followStatus = 0
                    isFollowing = false
                }
            } else {
                let status = try await APIService.shared.getUserFollowStatus(userId: detail.userId)
                await MainActor.run {
                    switch status {
                    case .isSelf: followStatus = 0
                    case .notFollowing: followStatus = 1
                    case .following: followStatus = 2
                    case .followBack: followStatus = 3
                    case .mutual: followStatus = 4
                    }
                    isFollowing = status == .following || status == .followBack || status == .mutual
                }
            }
        } catch {
            if error is CancellationError { return }
            print("Failed to load detail: \(error)")
            await MainActor.run {
                errorMessage = "加载失败，请重试"
            }
            if let userProfile = try? await userTask {
                await MainActor.run {
                    currentUserId = userProfile.id
                    currentUserName = userProfile.userName
                    currentUserAvatar = userProfile.avatar
                }
            }
        }
    }
    
    private func toggleFollow() async {
        guard let detailPost = detailPost else { return }
        if followStatus == 0 { return } // 本人，不请求关注接口
        
        // 乐观更新：先刷新按钮状态，请求完成后再用接口结果校正
        await MainActor.run {
            withAnimation(.easeInOut(duration: 0.2)) {
                isFollowing.toggle()
            }
        }
        
        do {
            if isFollowing {
                _ = try await APIService.shared.followUser(userId: detailPost.userId)
            } else {
                _ = try await APIService.shared.unfollowUser(userId: detailPost.userId)
            }
            
            // 重新获取关注状态并刷新按钮；若获取状态失败则按请求方向保持已关注/未关注
            do {
                let status = try await APIService.shared.getUserFollowStatus(userId: detailPost.userId)
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        switch status {
                        case .isSelf:
                            followStatus = 0
                        case .notFollowing:
                            followStatus = 1
                        case .following:
                            followStatus = 2
                        case .followBack:
                            followStatus = 3
                        case .mutual:
                            followStatus = 4
                        }
                        isFollowing = status == .following || status == .followBack || status == .mutual
                    }
                }
            } catch {
                // 关注/取关接口已成功，仅刷新状态失败：按当前 isFollowing 写回 followStatus，避免按钮回滚
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        followStatus = isFollowing ? 2 : 1
                    }
                }
            }
        } catch let err as APIError {
            if err.isAlreadyFollowedError {
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.2)) { isFollowing = true }
                    followStatus = 2
                }
            } else {
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.2)) { isFollowing.toggle() }
                }
                print("Failed to toggle follow: \(err)")
                CrashReporter.shared.logError(err, context: [
                    "action": "toggleFollow",
                    "userId": detailPost.userId
                ])
            }
        } catch {
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.2)) { isFollowing.toggle() }
            }
            print("Failed to toggle follow: \(error)")
            CrashReporter.shared.logError(error, context: [
                "action": "toggleFollow",
                "userId": detailPost.userId
            ])
        }
    }
    
    private var actionSheetItems: [ActionSheetView.ActionItem] {
        guard detailPost != nil else { return [] }
        
        var items: [ActionSheetView.ActionItem] = []
        
        // 分享
        items.append(ActionSheetView.ActionItem(
            title: "分享",
            icon: "square.and.arrow.up",
            isDestructive: false
        ))
        
        // 收藏（如果未收藏）
        if !isCollected {
            items.append(ActionSheetView.ActionItem(
                title: "收藏",
                icon: "bookmark",
                isDestructive: false
            ))
        } else {
            items.append(ActionSheetView.ActionItem(
                title: "取消收藏",
                icon: "bookmark.fill",
                isDestructive: false
            ))
        }
        
        // 当前用户是管理员时，无论谁的帖子都显示管理入口
        if isCurrentUserAdmin {
            items.append(ActionSheetView.ActionItem(
                title: "管理入口",
                icon: "gearshape",
                isDestructive: false
            ))
        }
        // 本人帖子：个人主页置顶/取消置顶、删除
        if followStatus == 0 {
            items.append(ActionSheetView.ActionItem(
                title: isPinned ? "取消个人主页置顶" : "个人主页置顶",
                icon: "pin",
                isDestructive: false
            ))
            items.append(ActionSheetView.ActionItem(
                title: "删除",
                icon: "trash",
                isDestructive: true
            ))
        } else {
            // 举报
            items.append(ActionSheetView.ActionItem(
                title: "举报",
                icon: "exclamationmark.triangle",
                isDestructive: true
            ))
            
            // 拉黑（如果不是已关注用户）
            if followStatus != 2 && followStatus != 4 {
                items.append(ActionSheetView.ActionItem(
                    title: "拉黑",
                    icon: "person.crop.circle.badge.minus",
                    isDestructive: true
                ))
            }
        }
        
        return items
    }
    
    private func handleAction(_ action: ActionSheetView.ActionItem) {
        guard let detailPost = detailPost else { return }
        
        switch action.title {
        case "分享":
            sharePost(detailPost)
        case "删除":
            deletePost(detailPost)
        case "举报":
            reportPost(detailPost)
        case "收藏":
            Task {
                await toggleCollect(detailPost)
            }
        case "取消收藏":
            Task {
                await toggleCollect(detailPost)
            }
        case "拉黑":
            Task {
                await blackUser(detailPost.userId)
            }
        case "个人主页置顶":
            Task {
                await setUserProfilePin(detailPost, pin: true)
            }
        case "取消个人主页置顶":
            Task {
                await setUserProfilePin(detailPost, pin: false)
            }
        case "管理入口":
            // 管理入口：跳转或占位，后续可接入圈子管理页
            break
        default:
            break
        }
    }
    
    private func setUserProfilePin(_ post: Post, pin: Bool) async {
        do {
            try await APIService.shared.setUserProfilePin(postId: post.id, pin: pin)
            await MainActor.run {
                isPinned = pin
                NotificationCenter.default.post(name: Notification.Name("PostDetailDidPinChange"), object: nil)
            }
        } catch {
            print("个人主页置顶失败: \(error)")
        }
    }
    
    private func toggleCollect(_ post: Post) async {
        do {
            if isCollected {
                _ = try await APIService.shared.unfavoriteDyn(id: post.id)
            } else {
                _ = try await APIService.shared.favoriteDyn(id: post.id)
            }
            await MainActor.run {
                isCollected.toggle()
            }
        } catch {
            print("Failed to toggle collect: \(error)")
        }
    }
    
    private func blackUser(_ userId: String) async {
        do {
            _ = try await APIService.shared.blackUser(userId: userId)
            await MainActor.run {
                // 显示提示
                print("已拉黑用户: \(userId)")
            }
        } catch {
            print("Failed to black user: \(error)")
        }
    }
    
    private func sharePost(_ post: Post) {
        // 使用系统分享
        let activityVC = UIActivityViewController(
            activityItems: [post.content],
            applicationActivities: nil
        )
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootViewController = windowScene.windows.first?.rootViewController {
            rootViewController.present(activityVC, animated: true)
        }
    }
    
    private func deletePost(_ post: Post) {
        Task {
            do {
                _ = try await APIService.shared.deleteDyn(id: post.id)
                await MainActor.run {
                    dismiss()
                }
            } catch {
                print("Failed to delete post: \(error)")
            }
        }
    }
    
    private func reportPost(_ post: Post) {
        // 举报接口待后端提供后对接
        // 暂时仅做占位，可后续接入 appReportDyn 或 setMessage type=10
    }
    
    private func performRepost() async {
        guard let detailPost = detailPost else { return }
        
        isReposting = true
        
        do {
            _ = try await APIService.shared.repostDyn(
                id: detailPost.id,
                content: repostContent.isEmpty ? nil : repostContent,
                ifForComment: !repostContent.isEmpty
            )
            
            await MainActor.run {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    isReposted = true
                    showRepostSheet = false
                    repostContent = ""
                }
            }
        } catch {
            print("Failed to repost: \(error)")
            CrashReporter.shared.logError(error, context: [
                "action": "repost",
                "postId": detailPost.id
            ])
            await MainActor.run {
                isReposting = false
            }
        }
    }
}
