//
//  PersonalizationSettingsView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct PersonalizationSettingsView: View {
    @State private var userProfile: UserProfile?
    @State private var isLoading = true
    @State private var isSaving = false
    
    // VIP隐私设置
    @State private var showVisit: Bool = true
    @State private var showFollow: Bool = true
    @State private var showFollower: Bool = true
    @State private var showCharge: Bool = true
    @State private var restStatus: Bool = false
    @State private var cancelFollow: Bool = true  // 接受取消关注提醒
    
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
                    Form {
                        Section(header: Text("隐私设置").foregroundColor(secondaryText)) {
                            Toggle("显示访客", isOn: $showVisit)
                                .foregroundColor(.white)
                            
                            Toggle("显示关注", isOn: $showFollow)
                                .foregroundColor(.white)
                            
                            Toggle("显示粉丝", isOn: $showFollower)
                                .foregroundColor(.white)
                            
                            Toggle("显示充电", isOn: $showCharge)
                                .foregroundColor(.white)
                        }
                        
                        Section(header: Text("状态设置").foregroundColor(secondaryText)) {
                            Toggle("闭门休息", isOn: $restStatus)
                                .foregroundColor(.white)
                        }
                        
                        Section(header: Text("消息提醒").foregroundColor(secondaryText)) {
                            Toggle("接受取消关注提醒", isOn: $cancelFollow)
                                .foregroundColor(.white)
                        }
                        
                        Section(header: Text("访问与隐身").foregroundColor(secondaryText)) {
                            NavigationLink(destination: NoVisitListView()) {
                                Text("隐身访问列表").foregroundColor(.white)
                            }
                        }
                        
                        Section(header: Text("屏蔽设置").foregroundColor(secondaryText)) {
                            if let userId = userProfile?.id {
                                NavigationLink(destination: BlackListView(userId: userId)) {
                                    Text("黑名单").foregroundColor(.white)
                                }
                            }
                            NavigationLink(destination: NoSeeListView()) {
                                Text("不看对方动态").foregroundColor(.white)
                            }
                            NavigationLink(destination: NoSeeMeListView()) {
                                Text("不让对方看我动态").foregroundColor(.white)
                            }
                        }
                        
                        Section(footer: Text("开启闭门休息后，其他用户将无法查看你的主页内容").foregroundColor(secondaryText).font(.system(size: 12))) {
                            EmptyView()
                        }
                    }
                    .scrollContentBackground(.hidden)
                    .background(Color.black)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button(action: { dismiss() }) {
                                Image(systemName: "chevron.left")
                                    .foregroundColor(.white)
                                    .font(.system(size: 16, weight: .medium))
                            }
                        }
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("保存") {
                                Task {
                                    await saveSettings()
                                }
                            }
                            .foregroundColor(themeOrange)
                            .disabled(isSaving)
                        }
                    }
                }
            }
            .navigationTitle("个性化设置")
            .navigationBarTitleDisplayMode(.inline)
        }
        .task {
            await loadUserProfile()
        }
        .toolbar(.hidden, for: .tabBar)
    }
    
    private func loadUserProfile() async {
        isLoading = true
        do {
            userProfile = try await APIService.shared.getCurrentUserProfile()
            if let config = userProfile?.vipConfig {
                showVisit = config.showVisit ?? true
                showFollow = config.showFollow ?? true
                showFollower = config.showFollower ?? true
                showCharge = config.showCharge ?? true
                restStatus = config.restStatus ?? false
                cancelFollow = config.cancelFollow ?? true
            }
            if let rest = userProfile?.restStatus {
                restStatus = rest
            }
        } catch {
            print("Failed to load user profile: \(error)")
        }
        isLoading = false
    }
    
    private func saveSettings() async {
        isSaving = true
        do {
            let config = VipConfig(
                showVisit: showVisit,
                showFollow: showFollow,
                showFollower: showFollower,
                showCharge: showCharge,
                restStatus: restStatus,
                cancelFollow: cancelFollow
            )
            _ = try await APIService.shared.updateVipConfig(config: config)
            dismiss()
        } catch {
            print("Failed to save settings: \(error)")
        }
        isSaving = false
    }
}
