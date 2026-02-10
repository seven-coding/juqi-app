//
//  UserListView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

enum ListType {
    case follow
    case follower
    case charge
}

struct UserListView: View {
    let type: ListType
    let userId: String
    
    @State private var users: [User] = []
    @State private var isLoading = false
    @State private var page = 1
    @State private var hasMore = true
    @State private var searchText = ""
    @State private var isSearching = false
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "#000000")
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // 搜索栏
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Color(hex: "#71767A"))
                            .padding(.leading, 12)
                        
                        TextField("搜索", text: $searchText)
                            .foregroundColor(.white)
                            .onChange(of: searchText) { oldValue, newValue in
                                Task {
                                    await performSearch()
                                }
                            }
                    }
                    .padding(.vertical, 10)
                    .background(Color(hex: "#16181C"))
                    .cornerRadius(8)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    
                    if users.isEmpty && !isLoading {
                        VStack {
                            Spacer()
                            Text("暂无数据")
                                .font(.system(size: 16))
                                .foregroundColor(Color(hex: "#71767A"))
                            Spacer()
                        }
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 0) {
                                ForEach(filteredUsers) { user in
                                    UserRowView(user: user, type: type)
                                        .overlay(
                                            Rectangle()
                                                .frame(height: 0.5)
                                                .foregroundColor(Color(hex: "#2F3336"))
                                            , alignment: .bottom
                                        )
                                }
                                
                                if hasMore && searchText.isEmpty {
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
            }
            .navigationTitle(type == .follow ? "关注" : type == .follower ? "粉丝" : "用户列表")
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
            await loadUsers()
        }
        .toolbar(.hidden, for: .tabBar)
    }
    
    private var filteredUsers: [User] {
        if searchText.isEmpty {
            return users
        }
        return users.filter { user in
            user.userName.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    private func loadUsers() async {
        isLoading = true
        page = 1
        do {
            let response = try await APIService.shared.getUserList(type: type, userId: userId, page: page)
            users = response.list
            hasMore = response.hasMore
        } catch {
            print("Failed to load users: \(error)")
        }
        applyMockUsersIfNeeded()
        isLoading = false
    }
    
    private func refresh() async {
        await loadUsers()
    }
    
    private func loadMore() async {
        guard !isLoading && hasMore else { return }
        isLoading = true
        page += 1
        do {
            let response = try await APIService.shared.getUserList(type: type, userId: userId, page: page)
            users.append(contentsOf: response.list)
            hasMore = response.hasMore
        } catch {
            print("Failed to load more users: \(error)")
            page -= 1
        }
        isLoading = false
    }
    
    private func performSearch() async {
        guard !searchText.isEmpty else {
            return
        }
        isSearching = true
        // 搜索功能：在本地已加载的用户中过滤
        // 如果需要服务端搜索，可以调用 searchUser API
        isSearching = false
    }
    
    private func applyMockUsersIfNeeded() {
#if DEBUG
        guard users.isEmpty else { return }
        users = Self.mockUsers(for: type)
        hasMore = false
#endif
    }
    
    private static func mockUsers(for type: ListType) -> [User] {
        let suffix = type == .follow ? "关注" : type == .follower ? "粉丝" : "用户"
        return [
            User(id: "mock_user_001", userName: "橘子汽水", avatar: nil, signature: "今天也要努力发光", isVip: true),
            User(id: "mock_user_002", userName: "夜航星", avatar: nil, signature: "在微光里慢慢靠近", isVip: false),
            User(id: "mock_user_003", userName: "海盐拿铁", avatar: nil, signature: "日常分享 · \(suffix)", isVip: false),
            User(id: "mock_user_004", userName: "清风牧场", avatar: nil, signature: "记录生活碎片", isVip: true),
            User(id: "mock_user_005", userName: "松露曲奇", avatar: nil, signature: "你好呀，\(suffix) 列表", isVip: false)
        ]
    }
}

struct UserRowView: View {
    let user: User
    let type: ListType
    
    @State private var isFollowing: Bool = false
    
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
                    
                    // 用户名（含会员标识）和个人简介
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Text(user.userName.isEmpty ? "匿名用户" : user.userName)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                            if user.isVip {
                                Image(systemName: "crown.fill")
                                    .foregroundColor(Color(hex: "#FFD700"))
                                    .font(.system(size: 12))
                            }
                        }
                        if let signature = user.signature, !signature.isEmpty {
                            Text(signature)
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#71767A"))
                                .lineLimit(1)
                        }
                    }
                    
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .buttonStyle(PlainButtonStyle())
            
            // 关注按钮（仅在粉丝列表显示）
            if type == .follower {
                Button(action: {
                    Task {
                        await toggleFollow()
                    }
                }) {
                    Text(isFollowing ? "已关注" : "关注")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(isFollowing ? Color(hex: "#71767A") : Color(hex: "#FF6B35"))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                        .background(isFollowing ? Color(hex: "#2F3336") : Color(hex: "#FF6B35").opacity(0.2))
                        .cornerRadius(16)
                }
                .padding(.trailing, 16)
            }
        }
        .onAppear {
            // 初始化关注状态（这里需要根据实际情况获取）
            isFollowing = false
        }
    }
    
    private func toggleFollow() async {
        do {
            if isFollowing {
                _ = try await APIService.shared.unfollowUser(userId: user.id)
            } else {
                _ = try await APIService.shared.followUser(userId: user.id)
            }
            isFollowing.toggle()
        } catch {
            print("Failed to toggle follow: \(error)")
        }
    }
}
