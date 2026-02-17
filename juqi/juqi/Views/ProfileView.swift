//
//  ProfileView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI
import UIKit

/// 个人主页导航目标：从设置页点「发布」进自己主页时传 isOwn=true，避免用可能错误的 profile.id 导致 404
struct ProfileDestination: Hashable {
    let userId: String
    let isOwn: Bool
}

struct ProfileView: View {
    @State private var userProfile: UserProfile?
    @State private var isLoading = true
    @State private var showSettings = false
    @State private var showPersonalizationSettings = false
    @State private var showLobby = false
    @State private var showAbout = false
    @State private var navigateToUserProfile: ProfileDestination?
    @State private var showFollowList = false
    @State private var showFollowerList = false
    @State private var showChargeList = false
    @State private var showFavoriteList = false
    @State private var showBlackList = false
    @State private var showQRCode = false
    @State private var showChargeTips = false
    @State private var showAvatarActionSheet = false
    @State private var showImagePicker = false
    @State private var selectedAvatar: UIImage?
    @State private var imageSourceType: UIImagePickerController.SourceType = .photoLibrary
    @State private var isUploadingAvatar = false
    /// 加载资料失败时展示 EmptyState + 重试
    @State private var lastError: APIError?
    /// 头像上传失败 Toast
    @State private var showAvatarErrorToast = false
    @State private var avatarErrorToastMessage = ""

    private let themeOrange = Color(hex: "#FF6B35")
    private let secondaryText = Color(hex: "#71767A") // 更克制的灰色

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            // 极弱的顶部光晕，增加质感
            RadialGradient(colors: [themeOrange.opacity(0.08), .clear], center: .topLeading, startRadius: 0, endRadius: 400)
                .ignoresSafeArea()
            
            // 固定布局始终展示，仅数据刷新（profile 为 nil 时显示占位文案与 0）
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 44) {
                    headerSection(profile: userProfile)
                        .padding(.top, 32)
                    statsGrid(profile: userProfile)
                    actionGroup
                }
                .padding(.bottom, 120)
            }
            .scrollIndicators(.never, axes: .vertical)
            .refreshable { await loadUserProfile() }
            .overlay {
                // 首次加载失败且无数据时展示错误态 + 重试
                if let error = lastError, userProfile == nil {
                    EmptyStateView(
                        icon: error.iconName,
                        title: "加载失败",
                        message: error.userMessage,
                        actionTitle: "重试",
                        iconColor: .red.opacity(0.8),
                        action: {
                            lastError = nil
                            Task { await loadUserProfile() }
                        }
                    )
                }
            }
            .overlay(alignment: .top) {
                // 数据刷新中且未失败时，顶部轻量提示
                if isLoading && userProfile == nil && lastError == nil {
                    HStack(spacing: 6) {
                        ProgressView().scaleEffect(0.8).tint(themeOrange)
                        Text("加载中…").font(.system(size: 13)).foregroundColor(secondaryText)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(8)
                    .padding(.top, 12)
                }
            }
        }
        .task { await loadUserProfile() }
        .onChange(of: showSettings) { _, newValue in
            if !newValue { Task { await loadUserProfile() } }
        }
        .onChange(of: showPersonalizationSettings) { _, newValue in
            if !newValue { Task { await loadUserProfile() } }
        }
        .onChange(of: showAbout) { _, newValue in
            if !newValue { Task { await loadUserProfile() } }
        }
        .navigationDestination(item: $navigateToUserProfile) { dest in
            UserProfileView(userId: dest.userId, userName: userProfile?.userName ?? "匿名用户", isOwnProfile: dest.isOwn)
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showPersonalizationSettings) { PersonalizationSettingsView() }
        .sheet(isPresented: $showLobby) { LobbyView() }
        .sheet(isPresented: $showAbout) { AboutView() }
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
        .sheet(isPresented: $showFavoriteList) {
            if let userId = userProfile?.id {
                FavoriteListView(userId: userId)
            }
        }
        .sheet(isPresented: $showBlackList) {
            if let userId = userProfile?.id {
                BlackListView(userId: userId)
            }
        }
        .sheet(isPresented: $showQRCode) {
            if let userId = userProfile?.id {
                QRCodeView(userId: userId)
            }
        }
        .sheet(isPresented: $showChargeTips) { ChargeTipsView() }
        .confirmationDialog("选择头像", isPresented: $showAvatarActionSheet, titleVisibility: .visible) {
            Button("从相册选择") {
                imageSourceType = .photoLibrary
                showImagePicker = true
            }
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                Button("拍照") {
                    imageSourceType = .camera
                    showImagePicker = true
                }
            }
            Button("取消", role: .cancel) {}
        }
        .sheet(isPresented: $showImagePicker) {
            AvatarImagePicker(image: $selectedAvatar, sourceType: imageSourceType, isPresented: $showImagePicker)
        }
        .onChange(of: selectedAvatar) { oldValue, newValue in
            if let newValue = newValue {
                Task {
                    await uploadAvatar(newValue)
                }
            }
        }
        .toast(isPresented: $showAvatarErrorToast, message: avatarErrorToastMessage, type: .error)
    }
    
    // MARK: - 个人头部：高对比排版
    private func headerSection(profile: UserProfile?) -> some View {
        HStack(alignment: .center, spacing: 20) {
            // 头像：超窄边框（可点击）
            Button(action: {
                showAvatarActionSheet = true
            }) {
                ZStack {
                    if let selectedAvatar = selectedAvatar {
                        Image(uiImage: selectedAvatar)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        AsyncImage(url: URL(string: profile?.avatar ?? "")) { image in
                            image.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Circle().fill(Color(hex: "#1A1A1A"))
                                .overlay(Text(profile?.userName.prefix(1) ?? "匿").font(.system(size: 30, weight: .bold)).foregroundColor(.white))
                        }
                    }
                    
                    if isUploadingAvatar {
                        Circle()
                            .fill(Color.black.opacity(0.5))
                            .overlay(
                                ProgressView()
                                    .tint(themeOrange)
                            )
                    }
                }
                .frame(width: 76, height: 76)
                .clipShape(Circle())
                .overlay(Circle().stroke(.white.opacity(0.1), lineWidth: 0.5))
            }
            .buttonStyle(PlainButtonStyle())
            
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Text(profile?.userName ?? "匿名用户")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                        .fixedSize() // 禁止折行
                    
                    // 状态标签：极简设计
                    Text(profile?.vipStatus == true ? "投喂中" : "等待投喂")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(themeOrange)
                        .cornerRadius(6)
                }
                
                Button(action: {
                    showSettings = true
                }) {
                    Text(profile?.signature?.isEmpty == false ? profile!.signature! : "点击编辑个性签名")
                        .font(.system(size: 14))
                        .foregroundColor(secondaryText)
                        .lineLimit(1)
                }
                .buttonStyle(PlainButtonStyle())
            }
            
            Spacer()
            
            Button(action: {
                shareMyProfile()
            }) {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 18, weight: .light))
                    .foregroundColor(.white.opacity(0.6))
            }
            
            Button(action: {
                showQRCode = true
            }) {
                Image(systemName: "qrcode")
                    .font(.system(size: 18, weight: .light))
                    .foregroundColor(.white.opacity(0.6))
            }
        }
        .padding(.horizontal, 24)
    }
    
    /// 分享我的主页：链接+文案，系统分享
    private func shareMyProfile() {
        guard let profile = userProfile else { return }
        let link = "https://app.juqi.life/user?userId=\(profile.id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? profile.id)"
        let text = "来橘气看看我的主页吧 \(link)"
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
    
    // MARK: - 核心数据：单行无边框网格
    private func statsGrid(profile: UserProfile?) -> some View {
        VStack(spacing: 32) {
            HStack(spacing: 0) {
                statBox(title: "发布", value: "\(profile?.publishCount ?? 0)") {
                    if let uid = profile?.id {
                        navigateToUserProfile = ProfileDestination(userId: uid, isOwn: true)
                    }
                }
                ZStack(alignment: .topTrailing) {
                    statBox(title: "电量", value: "\(profile?.chargeNums ?? 0)") {
                        showChargeList = true
                    }
                    Button(action: { showChargeTips = true }) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 14))
                            .foregroundColor(secondaryText)
                    }
                    .padding(.top, 4)
                    .padding(.trailing, 8)
                    .accessibilityLabel("电量说明")
                }
                .frame(maxWidth: .infinity)
                statBox(title: "关注", value: "\(profile?.followCount ?? 0)") {
                    showFollowList = true
                }
                statBox(title: "粉丝", value: "\(profile?.followerCount ?? 0)") {
                    showFollowerList = true
                }
            }
            
            HStack(spacing: 0) {
                statBox(title: "收藏", value: "\(profile?.collectionCount ?? 0)") {
                    showFavoriteList = true
                }
                statBox(title: "邀请", value: "\(profile?.inviteCount ?? 0)")
                statBox(title: "拉黑", value: "\(profile?.blockedCount ?? 0)") {
                    showBlackList = true
                }
                Spacer().frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 12)
    }
    
    private func statBox(title: String, value: String, action: @escaping () -> Void = {}) -> some View {
        Button(action: {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            action()
        }) {
            VStack(spacing: 6) {
                Text(value)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text(title)
                    .font(.system(size: 12))
                    .foregroundColor(secondaryText)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - 菜单列表：通透无背景列表
    private var actionGroup: some View {
        VStack(spacing: 0) {
            menuRow(icon: "person.crop.circle", title: "资料设置", subtitle: "编辑你的个人资料") { showSettings = true }
            menuRowDivider()
            menuRow(icon: "circle.grid.cross", title: "个性化设置", subtitle: "定制你的冲浪偏好") { showPersonalizationSettings = true }
            menuRowDivider()
            menuRow(icon: "tent", title: "橘气大厅", subtitle: "自助冲浪入口") { showLobby = true }
            menuRowDivider()
            menuRow(icon: "info.circle", title: "关于橘气", subtitle: "橘气说明书") { showAbout = true }
        }
        .padding(.horizontal, 20)
    }
    
    /// 菜单行之间的横向分割线（在行与行之间，不压在 icon 下方）
    private func menuRowDivider() -> some View {
        HStack(spacing: 0) {
            Color.clear.frame(width: 44)
            Rectangle()
                .fill(Color.white.opacity(0.05))
                .frame(height: 1)
                .frame(maxWidth: .infinity)
        }
        .frame(height: 1)
    }
    
    private func menuRow(icon: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 20) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(.white)
                    .frame(width: 24)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(secondaryText)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white.opacity(0.15))
            }
            .padding(.vertical, 20)
            .background(Color.black)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func loadUserProfile() async {
        lastError = nil
        isLoading = true
        do {
            userProfile = try await APIService.shared.getCurrentUserProfile()
        } catch {
            if let apiError = error as? APIError {
                lastError = apiError
            } else {
                lastError = .unknown
            }
            print("Failed to load user profile: \(error)")
        }
        isLoading = false
    }
    
    private func uploadAvatar(_ image: UIImage) async {
        isUploadingAvatar = true
        do {
            let avatarUrl = try await APIService.shared.uploadImage(image: image)
            let data: [String: Any] = ["avatar": avatarUrl]
            _ = try await APIService.shared.updateUserInfo(data: data)
            await loadUserProfile()
            selectedAvatar = nil
        } catch {
            avatarErrorToastMessage = (error as? APIError)?.userMessage ?? "头像上传失败，请重试"
            showAvatarErrorToast = true
            print("Failed to upload avatar: \(error)")
        }
        isUploadingAvatar = false
    }
}

// MARK: - 占位视图（已移至独立文件）


struct LobbyView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                Text("橘气大厅")
                    .foregroundColor(.white)
                    .font(.headline)
            }
            .navigationTitle("橘气大厅")
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
        .toolbar(.hidden, for: .tabBar)
    }
}

struct AboutView: View {
    @Environment(\.dismiss) private var dismiss
    private let themeOrange = Color(hex: "#FF6B35")
    private let secondaryText = Color(hex: "#71767A")
    
    #if DEBUG
    @AppStorage("AppConfig.dataEnv") private var dataEnv = "test"
    #endif
    
    private var appVersion: String {
        let short = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "版本 \(short) (\(build))"
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 32) {
                        // 品牌区：图标 + 名称 + 版本
                        VStack(spacing: 16) {
                            RoundedRectangle(cornerRadius: 18)
                                .fill(themeOrange.opacity(0.2))
                                .frame(width: 76, height: 76)
                                .overlay(
                                    Image(systemName: "leaf.circle.fill")
                                        .font(.system(size: 40))
                                        .foregroundColor(themeOrange)
                                )
                            Text("橘气")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(.white)
                            Text(appVersion)
                                .font(.system(size: 14))
                                .foregroundColor(secondaryText)
                        }
                        .padding(.top, 24)
                        
                        // 功能列表：白底卡片风格（深色主题下用深色卡片）
                        VStack(spacing: 0) {
                            aboutRow(title: "给个好评") {
                                if let url = URL(string: "https://apps.apple.com/app/idXXXXXXXX") {
                                    UIApplication.shared.open(url)
                                }
                            }
                            aboutDivider()
                            aboutRow(title: "用户协议") {
                                if let url = URL(string: "https://www.juqi.life/terms") {
                                    UIApplication.shared.open(url)
                                }
                            }
                            aboutDivider()
                            aboutRow(title: "隐私政策") {
                                if let url = URL(string: "https://www.juqi.life/privacy") {
                                    UIApplication.shared.open(url)
                                }
                            }
                        }
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(12)
                        .padding(.horizontal, 20)
                        
                        #if DEBUG
                        // 隐藏选项（仅调试）
                        VStack(alignment: .leading, spacing: 8) {
                            Text("隐藏选项")
                                .font(.system(size: 13))
                                .foregroundColor(secondaryText)
                            Picker("数据环境", selection: $dataEnv) {
                                Text("测试数据").tag("test")
                                Text("线上数据").tag("prod")
                            }
                            .pickerStyle(.segmented)
                            .onChange(of: dataEnv) { _, newValue in
                                CacheService.shared.clearResponseCache()
                                NotificationCenter.default.post(name: NSNotification.Name("DataEnvDidChange"), object: nil)
                                print("🔄 [About] 数据环境切换为: \(newValue)，已清除 API 缓存并通知首页清空列表")
                                // 排查：确认写入后读回一致
                                let readBack = UserDefaults.standard.string(forKey: "AppConfig.dataEnv") ?? "nil"
                                print("🔍 [排查] 切换后 UserDefaults.dataEnv=\(readBack), AppConfig.dataEnv=\(AppConfig.dataEnv)")
                            }
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(12)
                        .padding(.horizontal, 20)
                        #endif
                    }
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("关于")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                    .foregroundColor(themeOrange)
                    .font(.system(size: 16, weight: .medium))
                }
            }
        }
        .toolbar(.hidden, for: .tabBar)
    }
    
    private func aboutRow(title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white.opacity(0.4))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func aboutDivider() -> some View {
        Divider()
            .background(Color.white.opacity(0.08))
            .padding(.leading, 16)
    }
}

// MARK: - Avatar Image Picker
struct AvatarImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    var sourceType: UIImagePickerController.SourceType
    @Binding var isPresented: Bool
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.allowsEditing = true // 允许编辑，可以裁剪头像
        // 检查源类型是否可用，如果不可用则使用相册作为后备
        if UIImagePickerController.isSourceTypeAvailable(sourceType) {
            picker.sourceType = sourceType
        } else {
            picker.sourceType = .photoLibrary
        }
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: AvatarImagePicker
        
        init(_ parent: AvatarImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            // 优先使用编辑后的图片，如果没有则使用原始图片
            if let editedImage = info[.editedImage] as? UIImage {
                parent.image = editedImage
            } else if let originalImage = info[.originalImage] as? UIImage {
                parent.image = originalImage
            }
            parent.isPresented = false
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.isPresented = false
        }
    }
}
