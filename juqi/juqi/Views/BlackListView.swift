//
//  BlackListView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct BlackListView: View {
    let userId: String
    
    @State private var users: [User] = []
    @State private var isLoading = false
    @State private var page = 1
    @State private var hasMore = true
    @State private var showConfirmDialog = false
    @State private var selectedUser: User?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "#000000")
                    .ignoresSafeArea()
                
                if users.isEmpty && !isLoading {
                    VStack {
                        Spacer()
                        Text("暂无拉黑用户")
                            .font(.system(size: 16))
                            .foregroundColor(Color(hex: "#71767A"))
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(users) { user in
                                BlackUserRowView(user: user) {
                                    selectedUser = user
                                    showConfirmDialog = true
                                }
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
            .navigationTitle("拉黑列表")
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
            .confirmationDialog("移除拉黑", isPresented: $showConfirmDialog, titleVisibility: .visible) {
                Button("确定", role: .destructive) {
                    if let user = selectedUser {
                        Task {
                            await removeBlack(user: user)
                        }
                    }
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text("确定要移除对 \(selectedUser?.userName ?? "") 的拉黑吗？")
            }
        }
        .task {
            await loadBlackList()
        }
        .toolbar(.hidden, for: .tabBar)
    }
    
    private func loadBlackList() async {
        isLoading = true
        page = 1
        do {
            let response = try await APIService.shared.getBlackList(userId: userId, page: page)
            users = response.list
            hasMore = response.hasMore
        } catch {
            print("Failed to load black list: \(error)")
        }
        applyMockBlackListIfNeeded()
        isLoading = false
    }
    
    private func refresh() async {
        await loadBlackList()
    }
    
    private func loadMore() async {
        guard !isLoading && hasMore else { return }
        isLoading = true
        page += 1
        do {
            let response = try await APIService.shared.getBlackList(userId: userId, page: page)
            users.append(contentsOf: response.list)
            hasMore = response.hasMore
        } catch {
            print("Failed to load more black list: \(error)")
            page -= 1
        }
        isLoading = false
    }
    
    private func removeBlack(user: User) async {
        do {
            _ = try await APIService.shared.removeBlackUser(userId: userId, blackUserId: user.id)
            // 从列表中移除
            users.removeAll { $0.id == user.id }
        } catch {
            print("Failed to remove black: \(error)")
        }
    }
    
    private func applyMockBlackListIfNeeded() {
#if DEBUG
        guard users.isEmpty else { return }
        users = [
            User(id: "mock_black_001", userName: "夜色温柔", avatar: nil, signature: "已拉黑 · 请勿打扰", isVip: false),
            User(id: "mock_black_002", userName: "长岛冰茶", avatar: nil, signature: "已拉黑 · 屏蔽动态", isVip: false),
            User(id: "mock_black_003", userName: "雨声纸上", avatar: nil, signature: "已拉黑 · 不再推荐", isVip: true)
        ]
        hasMore = false
#endif
    }
}

struct BlackUserRowView: View {
    let user: User
    let onRemove: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            NavigationLink(destination: UserProfileView(userId: user.id, userName: user.userName)) {
                HStack(spacing: 12) {
                    // 头像
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
                                    .font(.system(size: 18, weight: .medium))
                            )
                    }
                    .frame(width: 48, height: 48)
                    .clipShape(Circle())
                    
                    // 用户名
                    Text(user.userName.isEmpty ? "匿名用户" : user.userName)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                    
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .buttonStyle(PlainButtonStyle())
            
            // 移除按钮
            Button(action: onRemove) {
                Text("移除")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(hex: "#FF6B35"))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .background(Color(hex: "#FF6B35").opacity(0.2))
                    .cornerRadius(16)
            }
            .padding(.trailing, 16)
        }
    }
}
