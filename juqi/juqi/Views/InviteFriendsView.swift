//
//  InviteFriendsView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import UIKit
import CoreImage

struct InviteFriendsView: View {
    @State private var inviteCode: String = ""
    @State private var inviteCount: Int = 0
    @State private var isLoading = true
    @State private var currentUserId: String?
    @Environment(\.dismiss) private var dismiss
    
    private let themeOrange = Color(hex: "#FF6B35")
    private let secondaryText = Color(hex: "#71767A")
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                
                if isLoading {
                    ProgressView().tint(themeOrange)
                } else {
                    ScrollView {
                        VStack(spacing: 32) {
                            // 邀请码卡片
                            inviteCodeCard
                            
                            // 邀请统计
                            inviteStatsCard
                            
                            // 二维码
                            qrCodeCard
                            
                            // 分享按钮
                            shareButton
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 32)
                    }
                }
            }
            .navigationTitle("邀请好友")
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
            await loadData()
        }
        .toolbar(.hidden, for: .tabBar)
    }
    
    private var inviteCodeCard: some View {
        VStack(spacing: 16) {
            Text("我的邀请码")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(secondaryText)
            
            Text(inviteCode)
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
                .background(Color(hex: "#16181C"))
                .cornerRadius(12)
            
            Button(action: {
                UIPasteboard.general.string = inviteCode
                let generator = UINotificationFeedbackGenerator()
                generator.notificationOccurred(.success)
            }) {
                HStack {
                    Image(systemName: "doc.on.doc")
                    Text("复制邀请码")
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(themeOrange)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(themeOrange.opacity(0.2))
                .cornerRadius(20)
            }
        }
        .padding(24)
        .background(Color(hex: "#16181C"))
        .cornerRadius(16)
    }
    
    private var inviteStatsCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("已邀请")
                    .font(.system(size: 14))
                    .foregroundColor(secondaryText)
                Spacer()
                Text("\(inviteCount) 人")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
            }
        }
        .padding(20)
        .background(Color(hex: "#16181C"))
        .cornerRadius(16)
    }
    
    private var qrCodeCard: some View {
        VStack(spacing: 16) {
            Text("邀请二维码")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white)
            
            if !inviteCode.isEmpty {
                InviteQRCodeView(inviteCode: inviteCode)
                    .frame(width: 200, height: 200)
                    .padding(20)
                    .background(Color.white)
                    .cornerRadius(12)
            }
            
            Text("扫描二维码加入橘气")
                .font(.system(size: 12))
                .foregroundColor(secondaryText)
        }
        .padding(24)
        .background(Color(hex: "#16181C"))
        .cornerRadius(16)
    }
    
    private var shareButton: some View {
        Button(action: {
            shareInvite()
        }) {
            HStack {
                Image(systemName: "square.and.arrow.up")
                Text("分享邀请")
            }
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(themeOrange)
            .cornerRadius(12)
        }
    }
    
    private func loadData() async {
        isLoading = true
        // 获取当前用户ID
        do {
            let profile = try await APIService.shared.getCurrentUserProfile()
            currentUserId = profile.id
            
            // 并行加载邀请码和邀请数量
            async let code: Void = loadInviteCode()
            async let count: Void = loadInviteCount()
            _ = await (code, count)
        } catch {
            print("Failed to load invite data: \(error)")
        }
        isLoading = false
    }
    
    private func loadInviteCode() async {
        guard let userId = currentUserId else { return }
        do {
            inviteCode = try await APIService.shared.getInviteCode(userId: userId)
        } catch {
            print("Failed to load invite code: \(error)")
            inviteCode = "加载失败"
        }
    }
    
    private func loadInviteCount() async {
        guard let userId = currentUserId else { return }
        do {
            inviteCount = try await APIService.shared.getInviteCount(userId: userId)
        } catch {
            print("Failed to load invite count: \(error)")
        }
    }
    
    private func shareInvite() {
        let text = "邀请你加入橘气！我的邀请码：\(inviteCode)"
        let activityVC = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootViewController = windowScene.windows.first?.rootViewController {
            rootViewController.present(activityVC, animated: true)
        }
    }
}

// MARK: - 简单的二维码生成视图
struct InviteQRCodeView: View {
    let inviteCode: String
    
    var body: some View {
        // 这里使用 CoreImage 生成二维码
        // 实际实现中可以使用第三方库或系统API
        if let qrImage = generateQRCode(from: inviteCode) {
            Image(uiImage: qrImage)
                .resizable()
                .interpolation(.none)
                .scaledToFit()
        } else {
            Text("生成失败")
                .foregroundColor(.black)
        }
    }
    
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
}
