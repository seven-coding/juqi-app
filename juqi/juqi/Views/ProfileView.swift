//
//  ProfileView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI
import UIKit

struct ProfileView: View {
    @State private var userProfile: UserProfile?
    @State private var isLoading = true
    @State private var showSettings = false
    @State private var showPersonalizationSettings = false
    @State private var showInviteFriends = false
    @State private var showLobby = false
    @State private var showAbout = false
    @State private var navigateToUserProfile: String?
    @State private var showFollowList = false
    @State private var showFollowerList = false
    @State private var showChargeList = false
    @State private var showFavoriteList = false
    @State private var showBlackList = false
    @State private var showQRCode = false
    @State private var showAvatarActionSheet = false
    @State private var showImagePicker = false
    @State private var selectedAvatar: UIImage?
    @State private var imageSourceType: UIImagePickerController.SourceType = .photoLibrary
    @State private var isUploadingAvatar = false

    private let themeOrange = Color(hex: "#FF6B35")
    private let secondaryText = Color(hex: "#71767A") // 更克制的灰色

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            // 极弱的顶部光晕，增加质感
            RadialGradient(colors: [themeOrange.opacity(0.08), .clear], center: .topLeading, startRadius: 0, endRadius: 400)
                .ignoresSafeArea()
            
            if isLoading {
                ProgressView().tint(themeOrange)
            } else {
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 44) {
                        // 1. 个人头部：极致紧凑
                        headerSection(profile: userProfile)
                            .padding(.top, 32)
                        
                        // 2. 核心数据：单行贯通式设计
                        statsGrid(profile: userProfile)
                        
                        // 3. 菜单列表：通透式列表
                        actionGroup
                    }
                    .padding(.bottom, 120)
                }
                .refreshable { await loadUserProfile() }
            }
        }
        .task { await loadUserProfile() }
        .navigationDestination(item: $navigateToUserProfile) { userId in
            UserProfileView(userId: userId, userName: userProfile?.userName ?? "匿名用户")
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showPersonalizationSettings) { PersonalizationSettingsView() }
        .sheet(isPresented: $showInviteFriends) { InviteFriendsView() }
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
        .actionSheet(isPresented: $showAvatarActionSheet) {
            var buttons: [ActionSheet.Button] = [
                .default(Text("从相册选择")) {
                    imageSourceType = .photoLibrary
                    showImagePicker = true
                }
            ]
            
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                buttons.append(.default(Text("拍照")) {
                    imageSourceType = .camera
                    showImagePicker = true
                })
            }
            
            buttons.append(.cancel())
            
            return ActionSheet(title: Text("选择头像"), buttons: buttons)
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
                    Text(profile?.signature?.isEmpty == false ? profile!.signature! : "既难飞至，则必跋涉")
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
                    if let userId = profile?.id {
                        navigateToUserProfile = userId
                    }
                }
                statBox(title: "电量", value: "\(profile?.chargeNums ?? 0)") {
                    showChargeList = true
                }
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
                statBox(title: "邀请", value: "\(profile?.inviteCount ?? 0)") {
                    showInviteFriends = true
                }
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
            menuRow(icon: "circle.grid.cross", title: "个性化设置", subtitle: "定制你的冲浪偏好") { showPersonalizationSettings = true }
            menuRow(icon: "person.2", title: "邀请好友", subtitle: "我们推荐 多人") { showInviteFriends = true }
            menuRow(icon: "tent", title: "橘气大厅", subtitle: "自助冲浪入口") { showLobby = true }
            menuRow(icon: "info.circle", title: "关于橘气", subtitle: "橘气说明书") { showAbout = true }
        }
        .padding(.horizontal, 20)
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
            .overlay(
                Divider().background(Color.white.opacity(0.05)), alignment: .bottom
            )
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func loadUserProfile() async {
        isLoading = true
        do {
            userProfile = try await APIService.shared.getCurrentUserProfile()
        } catch {
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
            // 重新加载用户信息
            await loadUserProfile()
            selectedAvatar = nil // 清空临时选择
        } catch {
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
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                Text("关于橘气")
                    .foregroundColor(.white)
                    .font(.headline)
            }
            .navigationTitle("关于橘气")
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
