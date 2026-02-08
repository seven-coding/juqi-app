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
    
    @Environment(\.dismiss) private var dismiss
    @State private var userProfile: UserProfile?
    @State private var posts: [Post] = []
    @State private var isLoading = false
    @State private var isLoadingPosts = false  // 帖子列表初始加载状态
    @State private var publicTime: Double? = nil
    @State private var hasMore = true
    @State private var showActionSheet = false
    @State private var showChargeTips = false
    @State private var showConfirmDialog = false
    @State private var confirmDialogTitle = ""
    @State private var confirmDialogMessage = ""
    @State private var confirmDialogAction: (() -> Void)?
    @State private var actionSheetItems: [ActionSheetItem] = []
    @State private var showFollowList = false
    @State private var showFollowerList = false
    @State private var showChargeList = false
    @State private var currentUserId: String? = nil
    
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
            // 先获取当前用户ID
            await loadCurrentUserId()
            // 并行加载用户信息和动态
            async let _profile: Void = loadUserProfile()
            async let _posts: Void = loadUserPosts()
            _ = await (_profile, _posts)
        }
        .confirmationDialog(confirmDialogTitle, isPresented: $showConfirmDialog, titleVisibility: .visible) {
            Button("确定", role: .destructive) {
                confirmDialogAction?()
            }
            Button("取消", role: .cancel) {}
        } message: {
            Text(confirmDialogMessage)
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
        .actionSheet(isPresented: $showActionSheet) {
            ActionSheet(
                title: Text("更多操作"),
                buttons: actionSheetItems.map { item in
                    ActionSheet.Button.default(Text(item.title)) {
                        item.action()
                    }
                } + [ActionSheet.Button.cancel(Text("取消"))]
            )
        }
        .toolbar(.hidden, for: .tabBar)
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
                                PostCardView(post: post)
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
            
            // 用户名
            Text(profile.userName.isEmpty ? "匿名用户" : profile.userName)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.white)
            
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
            
            // 用户名
            Text(profile.userName.isEmpty ? "匿名用户" : profile.userName)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.white)
            
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
                                PostCardView(post: post)
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
            
            // 底部操作栏（查看他人主页时显示）
            if currentUserId != nil && currentUserId != userId {
                bottomActionBarForDefault
            }
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
                    // TODO: 跳转私聊页面
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
            print("Failed to charge user: \(error)")
        }
    }
    
    private func handleFollowForDefault() async {
        do {
            _ = try await APIService.shared.followUser(userId: userId)
            await loadUserProfile()
        } catch {
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
                    
                    // 个人简介（在用户名下方）
                    if let signature = profile.signature, !signature.isEmpty {
                        Text(signature)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                            .padding(.top, 2)
                    }
                }
                
                Spacer()
            }
            
            // 标签（在头像下方）
            HStack(spacing: 8) {
                if let age = profile.age {
                    TagView(text: "\(age)")
                }
                if let constellation = profile.constellation {
                    TagView(text: constellation)
                }
                if let city = profile.city {
                    TagView(text: city)
                }
                // 待验证标签
                if let joinStatus = profile.joinStatus, joinStatus == .pending || joinStatus == .pendingVoice {
                    TagView(text: "待验证", color: Color(hex: "#10AEFF"))
                }
            }
            .padding(.top, 8)
            
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
            }
            .padding(.top, 12)
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - 头图列表
    private func headerImageList(images: [String]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(images, id: \.self) { imageUrl in
                    AsyncImage(url: URL(string: imageUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color(hex: "#2F3336"))
                    }
                    .frame(width: 100, height: 100)
                    .cornerRadius(8)
                    .clipped()
                }
            }
            .padding(.horizontal, 16)
        }
    }
    
    // MARK: - 底部操作栏（iOS 26 液态玻璃设计）
    private func bottomActionBar(profile: UserProfile) -> some View {
        let followStatus = profile.followStatus ?? .notFollowing
        let isFollowing = followStatus == .following || followStatus == .mutual
        
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
                    // TODO: 跳转私聊页面
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
                        Image(systemName: profile.chargingStatus == false ? "battery.0" : "battery.100")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(profile.chargingStatus == false ? .white : Color(hex: "#FF6B35"))
                        Text(profile.chargingStatus == false ? "充电" : "已充电")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(profile.chargingStatus == false ? .white : Color(hex: "#FF6B35"))
                    .frame(width: 80)
                    .padding(.vertical, 10)
                }
                .buttonStyle(PlainButtonStyle())
                .disabled(profile.chargingStatus == false ? false : true)
            }
            .background {
                liquidGlassEffect(cornerRadius: 32)
            }
            .frame(height: 64)
            
            // 右侧/关注按钮（圆形，只显示icon，不显示文案，高度与左侧一致）
            if !isFollowing {
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
        // TODO: 从用户信息中获取管理员权限
        return false
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
            // 他人主页：拉黑/取消拉黑、隐身访问
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
            
            // 隐身访问（需要VIP）
            if profile.vipStatus == true {
                items.append(ActionSheetItem(title: "隐身访问", action: {
                    // TODO: 实现隐身访问
                }))
            }
        }
        
        actionSheetItems = items
        showActionSheet = true
    }
    
    private func showConfirmDialog(title: String, message: String, action: @escaping () -> Void) {
        confirmDialogTitle = title
        confirmDialogMessage = message
        confirmDialogAction = action
        showConfirmDialog = true
    }
    
    // MARK: - 数据加载
    private func loadCurrentUserId() async {
        do {
            let profile = try await APIService.shared.getCurrentUserProfile()
            await MainActor.run {
                currentUserId = profile.id
            }
        } catch {
            print("Failed to load current user ID: \(error)")
        }
    }
    
    private func loadUserProfile() async {
        do {
            let profile = try await APIService.shared.getUserProfile(userId: userId)
            await MainActor.run {
                userProfile = profile
            }
        } catch {
            print("Failed to load user profile: \(error)")
            // 即使加载失败，也不阻止显示默认内容
        }
    }
    
    private func loadUserPosts() async {
        await MainActor.run { isLoadingPosts = true }
        do {
            let response = try await APIService.shared.getUserDynList(userId: userId, publicTime: nil)
            await MainActor.run {
                posts = response.list
                publicTime = response.publicTime
                hasMore = response.hasMore
                isLoadingPosts = false
            }
        } catch {
            print("Failed to load user posts: \(error)")
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
        guard !isLoading && hasMore else { return }
        isLoading = true
        let cursor = publicTime
        do {
            let response = try await APIService.shared.getUserDynList(userId: userId, publicTime: cursor)
            await MainActor.run {
                let existingIds = Set(posts.map(\.id))
                posts.append(contentsOf: response.list.filter { !existingIds.contains($0.id) })
                publicTime = response.publicTime
                hasMore = response.hasMore
            }
        } catch {
            print("Failed to load more posts: \(error)")
        }
        isLoading = false
    }
    
    // MARK: - 交互功能
    private func handleCharge(profile: UserProfile) async {
        guard profile.chargingStatus == false else {
            return
        }
        
        do {
            _ = try await APIService.shared.chargeUser(userId: profile.id)
            await loadUserProfile()
        } catch {
            print("Failed to charge user: \(error)")
        }
    }
    
    private func handleFollow(profile: UserProfile) async {
        guard let followStatus = profile.followStatus else { return }
        
        do {
            switch followStatus {
            case .notFollowing, .followBack:
                _ = try await APIService.shared.followUser(userId: profile.id)
            case .following, .mutual:
                _ = try await APIService.shared.unfollowUser(userId: profile.id)
            }
            await loadUserProfile()
        } catch {
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

// MARK: - 辅助结构
struct ActionSheetItem: Identifiable {
    let id = UUID()
    let title: String
    let action: () -> Void
}

// MARK: - 充电提示视图
struct ChargeTipsView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "battery.100")
                .font(.system(size: 60))
                .foregroundColor(Color(hex: "#FF6B35"))
            
            Text("这是你获得的电量之和，代表你受喜欢的程度，也将获得我们更多的推荐")
                .font(.system(size: 14))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
            
            Button("我知道了") {
                dismiss()
            }
            .font(.system(size: 16, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 40)
            .padding(.vertical, 12)
            .background(Color(hex: "#FF6B35"))
            .cornerRadius(20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: "#000000"))
    }
}
