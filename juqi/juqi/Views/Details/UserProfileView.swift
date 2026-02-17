//
//  UserProfileView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import UIKit

struct UserProfileView: View {
    let userId: String
    let userName: String
    /// 从设置页进「我的主页」时为 true，直接用 getCurrentUserProfile 避免 profile.id 错误导致 404
    var isOwnProfile: Bool = false

    @Environment(\.dismiss) private var dismiss
    @State private var userProfile: UserProfile?
    @State private var posts: [Post] = []
    @State private var isLoading = false
    @State private var isLoadingPosts = false  // 帖子列表初始加载状态
    @State private var publicTime: Double? = nil
    @State private var hasMore = true
    @State private var showActionSheet = false
    @State private var showChargeTips = false
    @State private var showSettings = false
    @State private var showConfirmDialog = false
    @State private var confirmDialogTitle = ""
    @State private var confirmDialogMessage = ""
    @State private var confirmDialogAction: (() -> Void)?
    @State private var actionSheetItems: [ActionSheetItem] = []
    @State private var showFollowList = false
    @State private var showFollowerList = false
    @State private var showChargeList = false
    @State private var currentUserId: String? = nil
    @State private var currentUserOpenId: String? = nil
    /// 实际是否本人（含：入参 isOwnProfile 为 true，或 userId 与当前用户的 id/openId 一致），用于避免误走「他人」接口导致超时
    @State private var effectiveIsOwnProfile: Bool = false
    @State private var currentUserIsVip: Bool = false
    @State private var currentUserIsAdmin: Bool = false
    @State private var showActionHistorySheet = false
    @State private var userActionHistory: [UserActionHistory] = []
    @State private var showAdminStatusSheet = false
    @State private var adminStatusTargetUserId: String? = nil
    @State private var navigationUserId: String? = nil  // 用于导航到其他用户主页
    @State private var privateChatDestination: PrivateChatDestination? = nil  // 点击私信后跳转用户私聊页
    @State private var showHeaderImagePreview = false
    @State private var headerPreviewImages: [String] = []
    @State private var headerPreviewIndex = 0
    
    var body: some View {
        ZStack {
            Color(hex: "#000000")
                .ignoresSafeArea()
            
            if isLoading && userProfile == nil && posts.isEmpty {
                // 只在初始加载且没有任何数据时显示加载指示器
                ProgressView()
                    .foregroundColor(.white)
            } else if let profile = userProfile {
                // 根据状态显示不同内容
                if profile.restStatus == true && !profile.isOwnProfile {
                    // 闭门休息状态
                    restStatusView(profile: profile)
                } else if !profile.canViewContent {
                    // 不能查看内容（拉黑、验证状态等）
                    restrictedView(profile: profile)
                } else {
                    // 正常状态
                    normalContentView(profile: profile)
                }
            } else {
                // 加载失败或数据为空，显示默认内容（使用传入的基本信息）
                defaultContentViewWithData
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                if let profile = userProfile, !profile.isOwnProfile, profile.isInvisible == true {
                    HStack(spacing: 6) {
                        Image(systemName: "eye.slash.fill")
                            .font(.system(size: 14))
                        Text("隐身中")
                            .font(.system(size: 15, weight: .medium))
                    }
                    .foregroundColor(Color(hex: "#71767A"))
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    showMoreActionSheet()
                }) {
                    Image(systemName: "ellipsis")
                        .foregroundColor(.white)
                        .font(.system(size: 16, weight: .medium))
                }
            }
        }
        .task {
            print("📥 [UserProfileView] .task 入口 isOwnProfile=\(isOwnProfile), userId=\(userId)")
            await loadCurrentUserId()
            if effectiveIsOwnProfile {
                await loadUserProfile()
                await loadUserPosts()
            } else {
                async let _profile: Void = loadUserProfile()
                async let _posts: Void = loadUserPosts()
                _ = await (_profile, _posts)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("PostDetailDidPinChange"))) { _ in
            if userProfile?.isOwnProfile == true {
                Task { await refreshData() }
            }
        }
        .confirmationDialog(confirmDialogTitle, isPresented: $showConfirmDialog, titleVisibility: .visible) {
            Button("确定", role: .destructive) {
                confirmDialogAction?()
            }
            Button("取消", role: .cancel) {}
        } message: {
            Text(confirmDialogMessage)
        }
        .fullScreenCover(isPresented: $showHeaderImagePreview) {
            ImagePreviewView(images: headerPreviewImages, currentIndex: headerPreviewIndex)
        }
        .sheet(isPresented: $showFollowList) {
            if let userId = userProfile?.id {
                UserListView(type: .follow, userId: userId)
            }
        }
        .sheet(isPresented: $showFollowerList) {
            if let userId = userProfile?.id {
                UserListView(type: .follower, userId: userId)
            }
        }
        .sheet(isPresented: $showChargeList) {
            if let userId = userProfile?.id {
                ChargeListView(userId: userId)
            }
        }
        .sheet(isPresented: $showChargeTips) {
            ChargeTipsView()
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .onDisappear { Task { await loadUserProfile() } }
        }
        .sheet(isPresented: $showActionHistorySheet) {
            NavigationStack {
                List(userActionHistory) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.content)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                        if let reason = item.reason, !reason.isEmpty {
                            Text("原因：\(reason)")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#71767A"))
                        }
                        Text(formatActionHistoryTime(item.createTime))
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#71767A"))
                    }
                    .listRowBackground(Color(hex: "#1A1A1A"))
                    .listRowSeparatorTint(Color(hex: "#2F3336"))
                }
                .scrollContentBackground(.hidden)
                .background(Color.black)
                .navigationTitle("操作记录")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("完成") { showActionHistorySheet = false }
                            .foregroundColor(Color(hex: "#FF6B35"))
                    }
                }
            }
        }
        .sheet(isPresented: $showAdminStatusSheet) {
            if let targetId = adminStatusTargetUserId {
                AdminStatusSheet(userId: targetId) {
                    adminStatusTargetUserId = nil
                    showAdminStatusSheet = false
                    Task { await loadUserProfile() }
                }
            }
        }
        .sheet(isPresented: $showActionSheet) {
            MoreActionBottomSheet(items: actionSheetItems) {
                showActionSheet = false
            }
        }
        .toolbar(.hidden, for: .tabBar)
        .navigationDestination(isPresented: Binding(
            get: { navigationUserId != nil },
            set: { if !$0 { navigationUserId = nil } }
        )) {
            if let targetId = navigationUserId {
                UserProfileView(userId: targetId, userName: "")
            }
        }
        .navigationDestination(item: $privateChatDestination) { dest in
            MessageChatView(
                from: dest.targetOpenId,
                type: 20,
                title: dest.title,
                messageTypeId: "",
                chatId: dest.chatId,
                fromPhoto: dest.fromPhoto
            )
            .onDisappear { privateChatDestination = nil }
        }
    }
    
    // MARK: - 正常内容视图
    private func normalContentView(profile: UserProfile) -> some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: 0) {
                    // 个人资料区域
                    profileInfoSection(profile: profile)
                        .padding(.top, 20)
                    
                    // 头图列表
                    if let imgList = profile.imgList, !imgList.isEmpty {
                        headerImageList(images: imgList)
                            .padding(.top, 16)
                    }
                    
                    // 动态列表
                    if isLoadingPosts && posts.isEmpty {
                        // 加载中显示骨架屏
                        VStack(spacing: 0) {
                            ForEach(0..<5) { _ in
                                SkeletonPostCardView()
                                    .overlay(
                                        Rectangle()
                                            .frame(height: 0.5)
                                            .foregroundColor(Color(hex: "#2F3336"))
                                        , alignment: .bottom
                                    )
                            }
                        }
                        .padding(.top, 20)
                        .padding(.bottom, 100) // 为悬浮操作栏留出空间
                    } else if !posts.isEmpty {
                        VStack(spacing: 0) {
                            ForEach(posts) { post in
                                PostCardView(post: post, onNavigateToUser: { targetUserId in
                                    // 如果点击的是当前主页用户的头像/昵称，则不进行导航
                                    if targetUserId != userId {
                                        navigationUserId = targetUserId
                                    }
                                })
                                    .overlay(
                                        Rectangle()
                                            .frame(height: 0.5)
                                            .foregroundColor(Color(hex: "#2F3336"))
                                        , alignment: .bottom
                                    )
                            }
                            
                            // 加载更多指示器
                            if hasMore {
                                ProgressView()
                                    .padding()
                                    .onAppear {
                                        if !isLoading {
                                            Task {
                                                await loadMorePosts()
                                            }
                                        }
                                    }
                            }
                        }
                        .padding(.top, 20)
                        .padding(.bottom, 100) // 为悬浮操作栏留出空间
                    } else {
                        Spacer()
                            .frame(height: 100)
                    }
                }
            }
            .refreshable {
                await refreshData()
            }
            
            // 底部操作栏（查看他人主页时显示）
            if !profile.isOwnProfile {
                bottomActionBar(profile: profile)
            }
        }
    }
    
    // MARK: - 闭门休息视图
    private func restStatusView(profile: UserProfile) -> some View {
        VStack(spacing: 20) {
            // 头像
            AsyncImage(url: URL(string: profile.avatar ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(Color(hex: "#2F3336"))
                    .overlay(
                        Text(profile.userName.isEmpty ? "匿" : String(profile.userName.prefix(1)))
                            .foregroundColor(.white)
                            .font(.system(size: 40, weight: .medium))
                    )
            }
            .frame(width: 132, height: 132)
            .clipShape(Circle())
            
            // 用户名 + 会员图标
            HStack(spacing: 6) {
                Text(profile.userName.isEmpty ? "匿名用户" : profile.userName)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                if profile.isVip || profile.vipStatus == true {
                    Image(systemName: "crown.fill")
                        .foregroundColor(Color(hex: "#FFD700"))
                        .font(.system(size: 16))
                }
            }
            
            // 提示信息
            VStack(spacing: 8) {
                Text("她最近在闭门休息中")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#71767A"))
            }
            .padding(.top, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - 受限视图（拉黑、验证状态等）
    private func restrictedView(profile: UserProfile) -> some View {
        VStack(spacing: 20) {
            // 头像
            AsyncImage(url: URL(string: profile.avatar ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(Color(hex: "#2F3336"))
                    .overlay(
                        Text(profile.userName.isEmpty ? "匿" : String(profile.userName.prefix(1)))
                            .foregroundColor(.white)
                            .font(.system(size: 40, weight: .medium))
                    )
            }
            .frame(width: 132, height: 132)
            .clipShape(Circle())
            
            // 用户名 + 会员图标
            HStack(spacing: 6) {
                Text(profile.userName.isEmpty ? "匿名用户" : profile.userName)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                if profile.isVip || profile.vipStatus == true {
                    Image(systemName: "crown.fill")
                        .foregroundColor(Color(hex: "#FFD700"))
                        .font(.system(size: 16))
                }
            }
            
            // 状态提示
            VStack(spacing: 8) {
                if let blackStatus = profile.blackStatus {
                    switch blackStatus {
                    case .beBlacked, .mutualBlack:
                        Text("抱歉，对方已将你拉黑。")
                        Text("你没有查看对方主页的权限")
                    case .blackedOther:
                        Text("你已拉黑对方")
                    default:
                        EmptyView()
                    }
                } else if let joinStatus = profile.joinStatus {
                    switch joinStatus {
                    case .pending, .pendingVoice:
                        Text("她没有验证成功")
                    case .deleted:
                        Text("她暂时离开了橘气")
                    case .banned:
                        Text("为了保护橘气社区安全，")
                        Text("此账号已被封禁")
                    default:
                        EmptyView()
                    }
                }
            }
            .font(.system(size: 14))
            .foregroundColor(Color(hex: "#71767A"))
            .padding(.top, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - 默认内容视图（使用传入的基本信息）
    private var defaultContentViewWithData: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: 0) {
                    // 个人资料区域（使用传入的基本信息）
                    VStack(alignment: .leading, spacing: 12) {
                        // 头像和用户名（水平布局）
                        HStack(alignment: .top, spacing: 12) {
                            Circle()
                                .fill(Color(hex: "#2F3336"))
                                .overlay(
                                    Text(userName.isEmpty ? "匿" : String(userName.prefix(1)))
                                        .foregroundColor(.white)
                                        .font(.system(size: 40, weight: .medium))
                                )
                                .frame(width: 80, height: 80)
                            
                            // 用户名（在头像右侧）
                            VStack(alignment: .leading, spacing: 4) {
                                Text(userName.isEmpty ? "匿名用户" : userName)
                                    .font(.system(size: 20, weight: .bold))
                                    .foregroundColor(.white)
                                
                                // 个人简介（在用户名下方）
                                Text("这是\(userName.isEmpty ? "匿名用户" : userName)的个性签名")
                                    .font(.system(size: 14))
                                    .foregroundColor(Color(hex: "#71767A"))
                                    .padding(.top, 2)
                            }
                            
                            Spacer()
                        }
                        
                        // 关注/粉丝/充电（默认值）
                        HStack(spacing: 20) {
                            Button(action: {
                                showFollowList = true
                            }) {
                                HStack(spacing: 4) {
                                    Text("关注")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color(hex: "#71767A"))
                                    Text("0")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                            
                            Button(action: {
                                showFollowerList = true
                            }) {
                                HStack(spacing: 4) {
                                    Text("粉丝")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color(hex: "#71767A"))
                                    Text("0")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                            
                            Button(action: {
                                showChargeList = true
                            }) {
                                HStack(spacing: 4) {
                                    Text("充电")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color(hex: "#71767A"))
                                    Text("0")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        .padding(.top, 12)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 20)
                    
                    // 动态列表（即使没有profile数据也显示）
                    if isLoadingPosts && posts.isEmpty {
                        // 加载中显示骨架屏
                        VStack(spacing: 0) {
                            ForEach(0..<5) { _ in
                                SkeletonPostCardView()
                                    .overlay(
                                        Rectangle()
                                            .frame(height: 0.5)
                                            .foregroundColor(Color(hex: "#2F3336"))
                                        , alignment: .bottom
                                    )
                            }
                        }
                        .padding(.top, 20)
                        .padding(.bottom, 100) // 为悬浮操作栏留出空间
                    } else if !posts.isEmpty {
                        VStack(spacing: 0) {
                            ForEach(posts) { post in
                                PostCardView(post: post, onNavigateToUser: { targetUserId in
                                    // 如果点击的是当前主页用户的头像/昵称，则不进行导航
                                    if targetUserId != userId {
                                        navigationUserId = targetUserId
                                    }
                                })
                                    .overlay(
                                        Rectangle()
                                            .frame(height: 0.5)
                                            .foregroundColor(Color(hex: "#2F3336"))
                                        , alignment: .bottom
                                    )
                            }
                            
                            // 加载更多指示器
                            if hasMore {
                                ProgressView()
                                    .padding()
                                    .onAppear {
                                        if !isLoading {
                                            Task {
                                                await loadMorePosts()
                                            }
                                        }
                                    }
                            }
                        }
                        .padding(.top, 20)
                        .padding(.bottom, 100) // 为悬浮操作栏留出空间
                    } else {
                        Spacer()
                            .frame(height: 100)
                    }
                }
            }
            .refreshable {
                await loadUserProfile()
            }
            // 未加载到 profile 时不显示底部栏；加载成功后由 normalContentView 根据 profile.isOwnProfile 控制
        }
    }
    
    // MARK: - 默认底部操作栏（iOS 26 液态玻璃设计，与 bottomActionBar 布局一致）
    private var bottomActionBarForDefault: some View {
        HStack(spacing: 12) {
            // 主操作区（固定宽度，与 bottomActionBar 保持一致）
            HStack(spacing: 0) {
                // 私聊按钮（线性图标）
                Button(action: {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    Task {
                        await openChatWithUser(userId: userId, userName: userName, fromPhoto: userProfile?.avatar)
                    }
                }) {
                    VStack(spacing: 6) {
                        Image(systemName: "message")
                            .font(.system(size: 20, weight: .medium))
                        Text("私聊")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .frame(width: 80)
                    .padding(.vertical, 10)
                }
                .buttonStyle(PlainButtonStyle())
                
                // 分隔线
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.white.opacity(0.15), .white.opacity(0.05), .white.opacity(0.15)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: 0.5, height: 32)
                
                // 充电按钮
                Button(action: {
                    let generator = UIImpactFeedbackGenerator(style: .medium)
                    generator.impactOccurred()
                    Task {
                        await handleChargeForDefault()
                    }
                }) {
                    VStack(spacing: 6) {
                        Image(systemName: "battery.0")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.white)
                        Text("充电")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .frame(width: 80)
                    .padding(.vertical, 10)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .background {
                liquidGlassEffect(cornerRadius: 32)
            }
            .frame(height: 64)
            
            // 关注按钮（圆形，只显示icon，不显示文案，高度与左侧一致）
            Button(action: {
                let generator = UIImpactFeedbackGenerator(style: .medium)
                generator.impactOccurred()
                Task {
                    await handleFollowForDefault()
                }
            }) {
                Image(systemName: "plus")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.white)
                    .frame(width: 64, height: 64)
                    .background {
                        Circle()
                            .fill(.clear)
                            .glassEffect(.regular.interactive())
                    }
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 0)
    }
    
    // MARK: - 默认状态下的交互功能
    private func handleChargeForDefault() async {
        do {
            _ = try await APIService.shared.chargeUser(userId: userId)
            await loadUserProfile()
        } catch {
            if let apiErr = error as? APIError, apiErr.isAlreadyChargedError {
                await loadUserProfile()
                return
            }
            print("Failed to charge user: \(error)")
        }
    }
    
    private func handleFollowForDefault() async {
        do {
            _ = try await APIService.shared.followUser(userId: userId)
            await loadUserProfile()
        } catch {
            if let apiErr = error as? APIError, apiErr.isAlreadyFollowedError {
                await loadUserProfile()
                return
            }
            print("Failed to follow user: \(error)")
        }
    }
    
    // MARK: - 个人资料区域
    private func profileInfoSection(profile: UserProfile) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // 头像和用户名（水平布局）
            HStack(alignment: .top, spacing: 12) {
                // 头像
                AsyncImage(url: URL(string: profile.avatar ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(hex: "#2F3336"))
                        .overlay(
                            Text(profile.userName.isEmpty ? "匿" : String(profile.userName.prefix(1)))
                                .foregroundColor(.white)
                                .font(.system(size: 40, weight: .medium))
                        )
                }
                .frame(width: 80, height: 80)
                .clipShape(Circle())
                
                // 用户名和VIP标识（在头像右侧）
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(profile.userName.isEmpty ? "匿名用户" : profile.userName)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                        
                        if profile.isVip || profile.vipStatus == true {
                            Image(systemName: "crown.fill")
                                .foregroundColor(Color(hex: "#FFD700"))
                                .font(.system(size: 16))
                        }
                    }
                    
                    // 个人简介（本人可点击进入编辑）
                    if profile.isOwnProfile {
                        Button(action: { showSettings = true }) {
                            Text(profile.signature?.isEmpty == false ? profile.signature! : "点击编辑个性签名")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#71767A"))
                                .lineLimit(1)
                                .padding(.top, 2)
                        }
                        .buttonStyle(PlainButtonStyle())
                    } else if let signature = profile.signature, !signature.isEmpty {
                        Text(signature)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                            .padding(.top, 2)
                    }
                }
                
                Spacer()
                
                if profile.isOwnProfile {
                    Button(action: { showSettings = true }) {
                        Image(systemName: "pencil")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(Color(hex: "#71767A"))
                    }
                    .accessibilityLabel("编辑资料")
                }
            }
            
            // 标签（在头像下方）：有任一标签数据时才显示整行，避免空占位
            if profile.age != nil
                || (profile.constellation?.isEmpty == false)
                || (profile.city?.isEmpty == false)
                || profile.joinStatus == .pending
                || profile.joinStatus == .pendingVoice
            {
                HStack(spacing: 8) {
                    if let age = profile.age {
                        TagView(text: "\(age)")
                    }
                    if let constellation = profile.constellation, !constellation.isEmpty {
                        TagView(text: constellation)
                    }
                    if let city = profile.city, !city.isEmpty {
                        TagView(text: city)
                    }
                    if profile.joinStatus == .pending || profile.joinStatus == .pendingVoice {
                        TagView(text: "待验证", color: Color(hex: "#10AEFF"))
                    }
                }
                .padding(.top, 8)
            }
            
            // 关注/粉丝/充电
            HStack(spacing: 20) {
                Button(action: {
                    if canViewList(profile: profile, type: .follow) {
                        showFollowList = true
                    }
                }) {
                    HStack(spacing: 4) {
                        Text("关注")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                        Text("\(profile.followCount)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                
                Button(action: {
                    if canViewList(profile: profile, type: .follower) {
                        showFollowerList = true
                    }
                }) {
                    HStack(spacing: 4) {
                        Text("粉丝")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                        Text("\(profile.followerCount)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                
                Button(action: {
                    if canViewList(profile: profile, type: .charge) {
                        showChargeList = true
                    } else {
                        showChargeTips = true
                    }
                }) {
                    HStack(spacing: 4) {
                        Text("充电")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                        Text("\(profile.chargeNums ?? 0)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                Button(action: { showChargeTips = true }) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#71767A"))
                }
                .accessibilityLabel("电量说明")
            }
            .padding(.top, 12)
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - 头图列表（加载中/失败态 + 点击查看大图）
    private func headerImageList(images: [String]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(images.enumerated()), id: \.offset) { index, imageUrl in
                    headerImageCell(url: imageUrl)
                        .onTapGesture {
                            headerPreviewImages = images
                            headerPreviewIndex = index
                            showHeaderImagePreview = true
                        }
                }
            }
            .padding(.horizontal, 16)
        }
    }
    
    private func headerImageCell(url: String) -> some View {
        Group {
            if let u = URL(string: url) {
                AsyncImage(url: u) { phase in
                    switch phase {
                    case .empty:
                        Rectangle()
                            .fill(Color(hex: "#2F3336"))
                            .overlay(ProgressView().tint(.white))
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        Rectangle()
                            .fill(Color(hex: "#2F3336"))
                            .overlay(
                                Image(systemName: "photo")
                                    .font(.title2)
                                    .foregroundColor(.white.opacity(0.5))
                            )
                    @unknown default:
                        Rectangle()
                            .fill(Color(hex: "#2F3336"))
                    }
                }
            } else {
                Rectangle()
                    .fill(Color(hex: "#2F3336"))
                    .overlay(
                        Image(systemName: "photo")
                            .font(.title2)
                            .foregroundColor(.white.opacity(0.5))
                    )
            }
        }
        .frame(width: 100, height: 100)
        .cornerRadius(8)
        .clipped()
    }
    
    // MARK: - 底部操作栏（iOS 26 液态玻璃设计）
    private func bottomActionBar(profile: UserProfile) -> some View {
        let followStatus = profile.followStatus ?? .notFollowing
        let isFollowing = followStatus == .following || followStatus == .mutual
        // nil 视为未充电，仅 true 为已充电，避免状态显示异常
        let isCharged = profile.chargingStatus == true

        return HStack(spacing: 12) {
            // 已关注状态下，添加左侧弹性空间实现居中
            if isFollowing {
                Spacer()
            }
            
            // 主操作区
            HStack(spacing: 0) {
                // 私聊按钮（线性图标）
                Button(action: {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    Task {
                        await openChatWithUser(userId: profile.id, userName: profile.userName, fromPhoto: profile.avatar)
                    }
                }) {
                    VStack(spacing: 6) {
                        Image(systemName: "message")
                            .font(.system(size: 20, weight: .medium))
                        Text("私聊")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .frame(width: 80)
                    .padding(.vertical, 10)
                }
                .buttonStyle(PlainButtonStyle())
                
                // 分隔线（液态玻璃风格）
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.white.opacity(0.15), .white.opacity(0.05), .white.opacity(0.15)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: 0.5, height: 32)
                
                // 充电按钮
                Button(action: {
                    let generator = UIImpactFeedbackGenerator(style: .medium)
                    generator.impactOccurred()
                    Task {
                        await handleCharge(profile: profile)
                    }
                }) {
                    VStack(spacing: 6) {
                        Image(systemName: isCharged ? "battery.100" : "battery.0")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(isCharged ? Color(hex: "#FF6B35") : .white)
                        Text(isCharged ? "已充电" : "充电")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(isCharged ? Color(hex: "#FF6B35") : .white)
                    .frame(width: 80)
                    .padding(.vertical, 10)
                }
                .buttonStyle(PlainButtonStyle())
                .disabled(isCharged)
            }
            .background {
                liquidGlassEffect(cornerRadius: 32)
            }
            .frame(height: 64)
            
            // 右侧：未关注时显示圆形关注按钮，已关注时显示「已关注」标签（与「已充电」样式对称）
            if isFollowing {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 18, weight: .medium))
                    Text("已关注")
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundColor(Color(hex: "#34C759").opacity(0.95))
                .frame(width: 64, height: 64)
                .background {
                    Circle()
                        .fill(.clear)
                        .glassEffect(.regular.interactive())
                }
            } else {
                Button(action: {
                    let generator = UIImpactFeedbackGenerator(style: .medium)
                    generator.impactOccurred()
                    Task {
                        await handleFollow(profile: profile)
                    }
                }) {
                    Image(systemName: followStatus == .notFollowing || followStatus == .followBack ? "plus" : "checkmark")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(.white)
                        .frame(width: 64, height: 64)
                        .background {
                            Circle()
                                .fill(.clear)
                                .glassEffect(.regular.interactive())
                        }
                }
                .buttonStyle(PlainButtonStyle())
            }
            
            // 已关注状态下，添加右侧弹性空间实现居中
            if isFollowing {
                Spacer()
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 0)
    }
    
    // MARK: - iOS 26 官方液态玻璃效果（与首页底部Tab对齐）
    // 使用系统原生 .glassEffect() API 实现真正的液态玻璃效果
    private func liquidGlassEffect(cornerRadius: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(.clear)
            .glassEffect(.regular.interactive())
    }
    
    // MARK: - 标签视图
    private struct TagView: View {
        let text: String
        var color: Color = Color(hex: "#2F3336")
        
        var body: some View {
            Text(text)
                .font(.system(size: 12))
                .foregroundColor(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(color)
                .cornerRadius(12)
        }
    }
    
    // MARK: - 辅助方法
    private func isAdmin(profile: UserProfile) -> Bool {
        return currentUserIsAdmin
    }
    
    private func canViewList(profile: UserProfile, type: ListType) -> Bool {
        if profile.isOwnProfile {
            return true
        }
        
        guard let vipConfig = profile.vipConfig else {
            return true // 默认可以查看
        }
        
        switch type {
        case .follow:
            return vipConfig.showFollow ?? true
        case .follower:
            return vipConfig.showFollower ?? true
        case .charge:
            return vipConfig.showCharge ?? true
        }
    }
    
    private func showMoreActionSheet() {
        guard let profile = userProfile else { return }
        
        var items: [ActionSheetItem] = []
        
        if profile.isOwnProfile {
            // 自己主页：复制ID
            items.append(ActionSheetItem(title: "复制ID", action: {
                UIPasteboard.general.string = profile.id
            }))
        } else {
            // 他人主页：分享主页、拉黑/取消拉黑、隐身访问
            items.append(ActionSheetItem(title: "分享主页", action: {
                shareUserProfile(userId: profile.id, userName: profile.userName)
            }))
            if let blackStatus = profile.blackStatus {
                if blackStatus == .blackedOther || blackStatus == .mutualBlack {
                    items.append(ActionSheetItem(title: "取消拉黑", action: {
                        showConfirmDialog(title: "取消拉黑", message: "确定要取消拉黑吗？") {
                            Task {
                                await unblackUser(profile: profile)
                            }
                        }
                    }))
                } else {
                    items.append(ActionSheetItem(title: "拉黑", action: {
                        showConfirmDialog(title: "拉黑", message: "确定要拉黑该用户吗？") {
                            Task {
                                await blackUser(profile: profile)
                            }
                        }
                    }))
                }
            }
            
            // 隐身访问（仅当前用户为 VIP 时显示）
            if currentUserIsVip {
                let isInvisible = profile.isInvisible ?? false
                items.append(ActionSheetItem(title: isInvisible ? "取消隐身" : "隐身访问", action: {
                    Task {
                        await setVisitStatusAndReload(profile: profile, leaveTrace: isInvisible)
                    }
                }))
            }
            
            // 管理员入口
            if currentUserIsAdmin {
                items.append(ActionSheetItem(title: "设置用户状态", action: {
                    adminStatusTargetUserId = profile.id
                    showAdminStatusSheet = true
                }))
                items.append(ActionSheetItem(title: "设置用户标签", action: {
                    Task {
                        await showSetUserAuthPlaceholder()
                    }
                }))
                items.append(ActionSheetItem(title: "操作记录", action: {
                    Task {
                        await loadAndShowActionHistory(userId: profile.id)
                    }
                }))
            }
        }
        
        actionSheetItems = items
        showActionSheet = true
    }
    
    private func showSetUserAuthPlaceholder() async {
        await MainActor.run {
            ToastManager.shared.info("设置用户标签功能敬请期待")
        }
    }
    
    private func loadAndShowActionHistory(userId: String) async {
        do {
            let list = try await APIService.shared.getUserActionHistory(userId: userId)
            await MainActor.run {
                userActionHistory = list
                showActionHistorySheet = true
            }
        } catch {
            await MainActor.run {
                ToastManager.shared.error("加载操作记录失败")
            }
        }
    }
    
    private func formatActionHistoryTime(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd HH:mm"
        return f.string(from: date)
    }
    
    private func showConfirmDialog(title: String, message: String, action: @escaping () -> Void) {
        confirmDialogTitle = title
        confirmDialogMessage = message
        confirmDialogAction = action
        showConfirmDialog = true
    }
    
    /// 设置隐身访问并刷新主页数据
    private func setVisitStatusAndReload(profile: UserProfile, leaveTrace: Bool) async {
        do {
            try await APIService.shared.setVisitStatus(userId: profile.id, leaveTrace: leaveTrace)
            await loadUserProfile()
        } catch {
            print("设置隐身访问失败: \(error)")
        }
    }
    
    /// 分享他人主页：生成链接/文案并用系统分享
    private func shareUserProfile(userId: String, userName: String) {
        let link = "https://app.juqi.life/user?userId=\(userId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? userId)"
        let text = "来橘气看看 \(userName.isEmpty ? "TA" : userName) 的主页吧 \(link)"
        let activityVC = UIActivityViewController(
            activityItems: [text],
            applicationActivities: nil
        )
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootViewController = windowScene.windows.first?.rootViewController {
            var top = rootViewController
            while let presented = top.presentedViewController {
                top = presented
            }
            top.present(activityVC, animated: true)
        }
    }
    
    // MARK: - 数据加载
    private func loadCurrentUserId() async {
        do {
            let profile = try await APIService.shared.getCurrentUserProfile()
            await MainActor.run {
                currentUserId = profile.id
                currentUserOpenId = profile.ownOpenId
                currentUserIsVip = profile.isVip || (profile.vipStatus == true)
                currentUserIsAdmin = profile.admin == true
                // 入参未标「本人」时，若 userId 与当前用户的 id 或 openId 一致，仍按本人处理，避免误走 get_follow_status 导致超时
                effectiveIsOwnProfile = isOwnProfile || (userId == profile.id || userId == (profile.ownOpenId ?? ""))
            }
        } catch {
            print("Failed to load current user ID: \(error)")
        }
    }

    private func loadUserProfile() async {
        print("📥 [UserProfileView] loadUserProfile 入口 effectiveIsOwnProfile=\(effectiveIsOwnProfile), userId=\(userId)")
        do {
            let profile: UserProfile
            if effectiveIsOwnProfile {
                profile = try await APIService.shared.getCurrentUserProfile()
                print("📥 [UserProfileView] loadUserProfile getCurrentUserProfile 成功 profile.id=\(profile.id)")
            } else {
                profile = try await APIService.shared.getUserProfile(userId: userId)
                print("📥 [UserProfileView] loadUserProfile getUserProfile(\(userId)) 成功 profile.id=\(profile.id)")
            }
            await MainActor.run {
                userProfile = profile
            }
            // 仅当非本人且未对该用户隐身访问时留下访客痕迹
            if !profile.isOwnProfile, profile.isInvisible != true {
                try? await APIService.shared.recordVisit(userId: userId)
            }
        } catch {
            print("❌ [UserProfileView] loadUserProfile 失败 effectiveIsOwnProfile=\(effectiveIsOwnProfile), userId=\(userId), error=\(error)")
        }
    }

    private func loadUserPosts() async {
        let targetUserId = (effectiveIsOwnProfile ? userProfile?.id : nil) ?? userId
        print("📥 [UserProfileView] loadUserPosts 入口 effectiveIsOwnProfile=\(effectiveIsOwnProfile), userId=\(userId), userProfile?.id=\(userProfile?.id ?? "nil"), targetUserId=\(targetUserId)")
        await MainActor.run { isLoadingPosts = true }
        do {
            let response = try await APIService.shared.getUserDynList(userId: targetUserId, publicTime: nil)
            await MainActor.run {
                posts = response.list
                publicTime = response.publicTime
                hasMore = response.hasMore
                isLoadingPosts = false
            }
            print("📥 [UserProfileView] loadUserPosts 成功 targetUserId=\(targetUserId), listCount=\(response.list.count), hasMore=\(response.hasMore)")
        } catch {
            print("❌ [UserProfileView] loadUserPosts 失败 targetUserId=\(targetUserId), error=\(error)")
            await MainActor.run {
                posts = []
                isLoadingPosts = false
            }
        }
    }
    
    private func refreshData() async {
        // 并行刷新用户信息和动态
        async let _profile: Void = loadUserProfile()
        async let _posts: Void = loadUserPosts()
        _ = await (_profile, _posts)
    }
    
    private func loadMorePosts() async {
        let targetUserId = (effectiveIsOwnProfile ? userProfile?.id : nil) ?? userId
        let cursor = publicTime
        print("📥 [UserProfileView] loadMorePosts 入口 targetUserId=\(targetUserId), publicTime=\(cursor ?? 0)")
        await MainActor.run { isLoading = true }
        do {
            let response = try await APIService.shared.getUserDynList(userId: targetUserId, publicTime: cursor)
            await MainActor.run {
                let existingIds = Set(posts.map(\.id))
                posts.append(contentsOf: response.list.filter { !existingIds.contains($0.id) })
                publicTime = response.publicTime
                hasMore = response.hasMore
                isLoading = false
            }
            print("📥 [UserProfileView] loadMorePosts 成功 targetUserId=\(targetUserId), appended=\(response.list.count), hasMore=\(response.hasMore)")
        } catch {
            print("❌ [UserProfileView] loadMorePosts 失败 targetUserId=\(targetUserId), error=\(error)")
            await MainActor.run { isLoading = false }
        }
    }
    
    // MARK: - 私聊跳转（获取/创建会话后推入用户私聊页）
    private func openChatWithUser(userId: String, userName: String, fromPhoto: String? = nil) async {
        do {
            let res = try await APIService.shared.getChatId(userId: userId)
            await MainActor.run {
                privateChatDestination = PrivateChatDestination(
                    chatId: res.chatId,
                    targetOpenId: res.targetOpenId,
                    title: userName.isEmpty ? "私聊" : userName,
                    fromPhoto: fromPhoto
                )
            }
        } catch {
            print("Failed to get chat: \(error)")
        }
    }
    
    // MARK: - 交互功能
    private func handleCharge(profile: UserProfile) async {
        // 仅当明确已充电时不再请求；nil 视为未充电允许点击
        guard profile.chargingStatus != true else {
            return
        }
        
        do {
            _ = try await APIService.shared.chargeUser(userId: profile.id)
            await loadUserProfile()
        } catch {
            if let apiErr = error as? APIError, apiErr.isAlreadyChargedError {
                await loadUserProfile()
                return
            }
            print("Failed to charge user: \(error)")
        }
    }
    
    private func handleFollow(profile: UserProfile) async {
        guard let followStatus = profile.followStatus else { return }
        if case .isSelf = followStatus { return } // 本人不请求关注接口
        
        do {
            switch followStatus {
            case .isSelf:
                return // 已在上方 guard 处理，此处满足穷尽性
            case .notFollowing, .followBack:
                _ = try await APIService.shared.followUser(userId: profile.id)
            case .following, .mutual:
                _ = try await APIService.shared.unfollowUser(userId: profile.id)
            }
            await loadUserProfile()
        } catch {
            if let apiErr = error as? APIError, apiErr.isAlreadyFollowedError {
                await loadUserProfile()
                return
            }
            print("Failed to follow/unfollow user: \(error)")
        }
    }
    
    private func blackUser(profile: UserProfile) async {
        do {
            _ = try await APIService.shared.blackUser(userId: profile.id)
            await loadUserProfile()
        } catch {
            print("Failed to black user: \(error)")
        }
    }
    
    private func unblackUser(profile: UserProfile) async {
        do {
            _ = try await APIService.shared.unblackUser(userId: profile.id)
            await loadUserProfile()
        } catch {
            print("Failed to unblack user: \(error)")
        }
    }
}

/// 个人主页「私信」跳转目标：用于推入用户私聊页（MessageChatView）
private struct PrivateChatDestination: Identifiable, Hashable {
    let id = UUID()
    let chatId: String
    let targetOpenId: String
    let title: String
    let fromPhoto: String?
}

// MARK: - 更多操作项（与底部弹窗配合）
private struct ActionSheetItem {
    let title: String
    let action: () -> Void
}

// MARK: - 更多操作底部弹窗
private struct MoreActionBottomSheet: View {
    let items: [ActionSheetItem]
    let onDismiss: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color(hex: "#3D3D3D"))
                .frame(width: 36, height: 5)
                .padding(.top, 8)
                .padding(.bottom, 16)

            Text("更多操作")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(Color(hex: "#71767A"))
                .frame(maxWidth: .infinity)
                .padding(.bottom, 16)

            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                    Button(action: {
                        item.action()
                        onDismiss()
                        dismiss()
                    }) {
                        Text(item.title)
                            .font(.system(size: 16, weight: .regular))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                    }
                    .buttonStyle(.plain)
                    if index != items.count - 1 {
                        Divider()
                            .background(Color(hex: "#2F3336"))
                            .padding(.leading, 20)
                    }
                }
            }
            .background(Color(hex: "#1A1A1A"))

            Button(action: {
                onDismiss()
                dismiss()
            }) {
                Text("取消")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Color(hex: "#71767A"))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .background(Color.black)
        .presentationDetents([.height(CGFloat(items.count * 50 + 120))])
        .presentationDragIndicator(.hidden)
    }
}

// MARK: - 管理员设置用户状态
private struct AdminStatusSheet: View {
    let userId: String
    let onComplete: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var isSubmitting = false
    
    private let statuses: [UserJoinStatus] = [.normal, .pending, .pendingVoice, .deleted, .banned]
    
    var body: some View {
        NavigationStack {
            List(statuses, id: \.rawValue) { status in
                Button(action: {
                    Task {
                        await setStatus(status)
                    }
                }) {
                    Text(status.displayText)
                        .foregroundColor(.white)
                }
                .listRowBackground(Color(hex: "#1A1A1A"))
                .listRowSeparatorTint(Color(hex: "#2F3336"))
                .disabled(isSubmitting)
            }
            .scrollContentBackground(.hidden)
            .background(Color.black)
            .navigationTitle("设置用户状态")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") {
                        onComplete()
                        dismiss()
                    }
                    .foregroundColor(Color(hex: "#71767A"))
                }
            }
        }
    }
    
    private func setStatus(_ status: UserJoinStatus) async {
        await MainActor.run { isSubmitting = true }
        defer { Task { @MainActor in isSubmitting = false } }
        do {
            _ = try await APIService.shared.setUserStatus(userId: userId, status: status)
            await MainActor.run {
                onComplete()
                dismiss()
            }
        } catch {
            await MainActor.run {
                ToastManager.shared.error("设置失败，请重试")
            }
        }
    }
}

