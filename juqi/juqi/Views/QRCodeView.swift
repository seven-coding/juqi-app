//
//  QRCodeView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import UIKit
import CoreImage
import Photos

struct QRCodeView: View {
    let userId: String
    
    @State private var userProfile: UserProfile?
    @State private var isLoading = true
    @State private var qrCodeImage: UIImage?
    @Environment(\.dismiss) private var dismiss
    
    private let themeOrange = Color(hex: "#FF6B35")
    private let secondaryText = Color(hex: "#71767A")
    
    var body: some View {
        NavigationView {
            ZStack {
                // 纯黑背景
                Color.black.ignoresSafeArea()
                
                if isLoading {
                    ProgressView().tint(themeOrange)
                } else if let profile = userProfile {
                    ScrollView {
                        VStack(spacing: 0) {
                            // 名片卡片
                            businessCardView(profile: profile)
                                .padding(.horizontal, 20)
                                .padding(.top, 40)
                            
                            // 保存按钮（使用与底部工具栏一致的样式）
                            saveButtonView
                                .padding(.horizontal, 20)
                                .padding(.top, 32)
                                .padding(.bottom, 40)
                        }
                    }
                }
            }
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
            await loadUserProfile()
        }
        .toolbar(.hidden, for: .tabBar)
    }
    
    // MARK: - 保存按钮视图（与底部工具栏样式一致）
    private var saveButtonView: some View {
        Button(action: {
            if let profile = userProfile {
                saveCardToAlbum(profile: profile)
            }
        }) {
            HStack {
                Image(systemName: "square.and.arrow.down")
                Text("保存到相册")
            }
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background {
                transparentLiquidGlassEffect(cornerRadius: 25)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - iOS 26 官方液态玻璃效果（与底部工具栏一致）
    private func transparentLiquidGlassEffect(cornerRadius: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(.clear)
            .glassEffect(.regular.interactive())
    }
    
    // MARK: - 名片卡片视图
    private func businessCardView(profile: UserProfile) -> some View {
        VStack(spacing: 0) {
            // 头像（略微超出卡片上边缘）
            AsyncImage(url: URL(string: profile.avatar ?? "")) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle().fill(Color(hex: "#2F3336"))
                    .overlay(
                        Text(profile.userName.prefix(1))
                            .font(.system(size: 50, weight: .bold))
                            .foregroundColor(.white)
                    )
            }
            .frame(width: 100, height: 100)
            .clipShape(Circle())
            .overlay(
                Circle()
                    .stroke(Color(hex: "#1A1A1A"), lineWidth: 4)
            )
            .offset(y: -50)
            .zIndex(1)
            
            // 卡片内容
            VStack(spacing: 16) {
                // 顶部间距（头像向上偏移50，高度100，下边缘在卡片顶部，只需少量间距）
                Spacer()
                    .frame(height: 10)
                
                // 用户名
                Text(profile.userName)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                
                // 标签（深灰色背景，白色文字）
                HStack(spacing: 10) {
                    if let age = profile.age {
                        BusinessCardTagView(text: "\(age)")
                    }
                    if let constellation = profile.constellation {
                        BusinessCardTagView(text: constellation)
                    }
                    if let city = profile.city {
                        BusinessCardTagView(text: city)
                    }
                }
                .padding(.top, 4)
                
                // 个性签名
                if let signature = profile.signature, !signature.isEmpty {
                    Text(signature)
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.top, 8)
                }
                
                // 虚线分隔
                Rectangle()
                    .frame(height: 1)
                    .dashedLine(color: Color.white.opacity(0.3), lineWidth: 1)
                    .padding(.horizontal, 24)
                    .padding(.top, 16)
                
                // 二维码区域
                qrCodeSection(profile: profile)
                    .padding(.top, 20)
            }
            .padding(.bottom, 24)
        }
        .background(
            // 半透明深色背景
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.black.opacity(0.6))
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(.ultraThinMaterial)
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
    
    // MARK: - 二维码区域
    private func qrCodeSection(profile: UserProfile) -> some View {
        VStack(spacing: 12) {
            if let qrImage = qrCodeImage {
                ZStack {
                    // 二维码背景
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white)
                        .frame(width: 200, height: 200)
                    
                    // 二维码图片
                    Image(uiImage: qrImage)
                        .resizable()
                        .interpolation(.none)
                        .scaledToFit()
                        .frame(width: 180, height: 180)
                    
                    // 中心Logo（如果有）
                    // 这里可以添加JUQI品牌Logo
                }
            } else {
                ProgressView()
                    .frame(width: 200, height: 200)
            }
            
            // 提示文字
            Text("微信扫一扫，来橘气加我")
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.7))
                .padding(.top, 4)
        }
    }
    
    // MARK: - 加载用户资料
    private func loadUserProfile() async {
        isLoading = true
        do {
            userProfile = try await APIService.shared.getUserProfile(userId: userId)
            if let profile = userProfile {
                // 生成二维码
                let qrString = "juqi://user/\(profile.id)"
                qrCodeImage = generateQRCode(from: qrString)
            }
        } catch {
            print("Failed to load user profile: \(error)")
        }
        isLoading = false
    }
    
    
    // MARK: - 生成二维码
    private func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: .utf8)
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        guard let ciImage = filter.outputImage else { return nil }
        
        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaledImage = ciImage.transformed(by: transform)
        
        let context = CIContext()
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
    
    // MARK: - 保存名片到相册
    private func saveCardToAlbum(profile: UserProfile) {
        // 请求相册权限
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            if status == .authorized || status == .limited {
                DispatchQueue.main.async {
                    // 生成名片图片
                    if let cardImage = generateCardImage(profile: profile) {
                        saveImageToAlbum(cardImage)
                    }
                }
            } else {
                DispatchQueue.main.async {
                    // 显示权限提示
                    let alert = UIAlertController(
                        title: "需要相册权限",
                        message: "请在设置中允许访问相册以保存名片",
                        preferredStyle: .alert
                    )
                    alert.addAction(UIAlertAction(title: "确定", style: .default))
                    
                    if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                       let rootViewController = windowScene.windows.first?.rootViewController {
                        rootViewController.present(alert, animated: true)
                    }
                }
            }
        }
    }
    
    // MARK: - 生成名片图片
    private func generateCardImage(profile: UserProfile) -> UIImage? {
        // 创建名片视图用于截图
        let cardView = BusinessCardSnapshotView(
            profile: profile,
            qrCodeImage: qrCodeImage
        )
        return cardView.snapshot(size: CGSize(width: 375, height: 600))
    }
    
    // MARK: - 保存图片到相册
    private func saveImageToAlbum(_ image: UIImage) {
        PHPhotoLibrary.shared().performChanges({
            PHAssetChangeRequest.creationRequestForAsset(from: image)
        }) { success, error in
            DispatchQueue.main.async {
                if success {
                    let generator = UINotificationFeedbackGenerator()
                    generator.notificationOccurred(.success)
                } else if let error = error {
                    print("Failed to save image: \(error)")
                }
            }
        }
    }
}

// MARK: - 名片标签视图（深灰色背景，白色文字）
struct BusinessCardTagView: View {
    let text: String
    
    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Color(hex: "#2F3336"))
            )
    }
}

// MARK: - 虚线视图
struct DashedLine: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.width, y: rect.midY))
        return path
    }
}

extension View {
    func dashedLine(color: Color, lineWidth: CGFloat) -> some View {
        self.overlay(
            DashedLine()
                .stroke(style: StrokeStyle(lineWidth: lineWidth, dash: [5, 5]))
                .foregroundColor(color)
        )
    }
}


// MARK: - UIColor扩展（用于背景填充）
extension UIColor {
    convenience init?(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            return nil
        }
        self.init(
            red: CGFloat(r) / 255,
            green: CGFloat(g) / 255,
            blue: CGFloat(b) / 255,
            alpha: CGFloat(a) / 255
        )
    }
}

// MARK: - 名片快照视图（用于生成图片）
struct BusinessCardSnapshotView: View {
    let profile: UserProfile
    let qrCodeImage: UIImage?
    
    private let themeOrange = Color(hex: "#FF6B35")
    
    var body: some View {
        ZStack {
            // 纯黑背景
            Color.black
            
            // 名片卡片
            VStack(spacing: 0) {
                // 头像
                AsyncImage(url: URL(string: profile.avatar ?? "")) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle().fill(Color(hex: "#2F3336"))
                        .overlay(
                            Text(profile.userName.prefix(1))
                                .font(.system(size: 50, weight: .bold))
                                .foregroundColor(.white)
                        )
                }
                .frame(width: 100, height: 100)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color(hex: "#1A1A1A"), lineWidth: 4))
                .offset(y: -50)
                .zIndex(1)
                
                VStack(spacing: 16) {
                    Spacer().frame(height: 60)
                    
                    Text(profile.userName)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                    
                    HStack(spacing: 10) {
                        if let age = profile.age {
                            BusinessCardTagView(text: "\(age)")
                        }
                        if let constellation = profile.constellation {
                            BusinessCardTagView(text: constellation)
                        }
                        if let city = profile.city {
                            BusinessCardTagView(text: city)
                        }
                    }
                    .padding(.top, 4)
                    
                    if let signature = profile.signature, !signature.isEmpty {
                        Text(signature)
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.8))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                            .padding(.top, 8)
                    }
                    
                    Rectangle()
                        .frame(height: 1)
                        .dashedLine(color: Color.white.opacity(0.3), lineWidth: 1)
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                    
                    if let qrImage = qrCodeImage {
                        ZStack {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white)
                                .frame(width: 200, height: 200)
                            
                            Image(uiImage: qrImage)
                                .resizable()
                                .interpolation(.none)
                                .scaledToFit()
                                .frame(width: 180, height: 180)
                        }
                        .padding(.top, 20)
                        
                        Text("微信扫一扫，来橘气加我")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.7))
                            .padding(.top, 4)
                    }
                }
                .padding(.bottom, 24)
            }
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.black.opacity(0.6))
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(.ultraThinMaterial)
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
            .padding(20)
        }
        .frame(width: 375, height: 600)
    }
    
    func snapshot(size: CGSize) -> UIImage? {
        let controller = UIHostingController(rootView: self)
        controller.view.backgroundColor = .clear
        controller.view.frame = CGRect(origin: .zero, size: size)
        
        // 确保视图已布局
        controller.view.setNeedsLayout()
        controller.view.layoutIfNeeded()
        
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { context in
            controller.view.layer.render(in: context.cgContext)
        }
    }
}

// MARK: - Tag View Component (保留原有组件以兼容其他视图)
struct TagView: View {
    let text: String
    var color: Color = Color(hex: "#FF6B35")
    
    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.2))
            .cornerRadius(8)
    }
}
