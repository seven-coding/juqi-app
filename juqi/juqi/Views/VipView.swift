//
//  VipView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct VipView: View {
    @State private var userProfile: UserProfile?
    @State private var isLoading = true
    @Environment(\.dismiss) private var dismiss
    
    private let themeOrange = Color(hex: "#FF6B35")
    private let secondaryText = Color(hex: "#71767A")
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                
                if isLoading {
                    ProgressView().tint(themeOrange)
                } else if let profile = userProfile {
                    ScrollView {
                        VStack(spacing: 32) {
                            // VIP状态卡片
                            vipStatusCard(profile: profile)
                            
                            // 投喂入口
                            if profile.vipStatus != true {
                                chargeButton
                            }
                            
                            // VIP权益说明
                            vipBenefitsCard
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 32)
                    }
                }
            }
            .navigationTitle("VIP会员")
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
    
    private func vipStatusCard(profile: UserProfile) -> some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: profile.vipStatus == true ? "crown.fill" : "crown")
                    .foregroundColor(Color(hex: "#FFD700"))
                    .font(.system(size: 24))
                
                Text(profile.vipStatus == true ? "投喂中" : "等待投喂")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
            }
            
            if profile.vipStatus == true {
                Text("感谢你的支持！")
                    .font(.system(size: 14))
                    .foregroundColor(secondaryText)
            } else {
                Text("成为VIP会员，享受更多权益")
                    .font(.system(size: 14))
                    .foregroundColor(secondaryText)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(Color(hex: "#16181C"))
        .cornerRadius(16)
    }
    
    private var chargeButton: some View {
        Button(action: {
            // TODO: 跳转到投喂/充值页面
        }) {
            HStack {
                Image(systemName: "battery.100")
                Text("立即投喂")
            }
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(themeOrange)
            .cornerRadius(12)
        }
    }
    
    private var vipBenefitsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("VIP权益")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
            
            VStack(alignment: .leading, spacing: 12) {
                benefitRow(icon: "eye", text: "显示访客记录")
                benefitRow(icon: "person.2", text: "显示关注/粉丝列表")
                benefitRow(icon: "battery.100", text: "显示充电记录")
                benefitRow(icon: "moon", text: "闭门休息功能")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(24)
        .background(Color(hex: "#16181C"))
        .cornerRadius(16)
    }
    
    private func benefitRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(themeOrange)
                .font(.system(size: 16))
                .frame(width: 24)
            
            Text(text)
                .font(.system(size: 14))
                .foregroundColor(.white)
            
            Spacer()
        }
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
}
