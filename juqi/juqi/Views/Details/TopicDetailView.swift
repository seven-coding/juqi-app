//
//  TopicDetailView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct TopicDetailView: View {
    let topicName: String
    @State private var topicDetail: TopicDetail?
    @State private var posts: [Post] = []
    @State private var isLoading = true
    @State private var isLoadingMore = false
    @State private var hasMore = true
    @State private var publicTime: Double? = nil
    @State private var errorMessage: String?
    @State private var showPublishSheet = false
    
    private let pageSize = 20
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if let msg = errorMessage, topicDetail == nil {
                topicFullScreenErrorView(message: msg)
            } else {
                topicScrollContent
            }
        }
        .navigationTitle("话题")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .task {
            await loadTopicDetail()
            await loadPosts()
        }
        .sheet(isPresented: $showPublishSheet) {
            PublishView(activeTab: .constant(.home), initialTopic: topicName)
        }
    }
    
    /// 主内容：客户端已有 topicName，先展示头部；服务端详情与列表异步加载后再补全
    private var topicScrollContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // 话题信息区：服务端有则完整展示，否则用入参 topicName 先展示
                if let detail = topicDetail {
                    topicInfoSection(detail: detail)
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                        .padding(.bottom, 12)
                } else {
                    topicHeaderPlaceholder(name: topicName)
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                        .padding(.bottom, 12)
                }
                
                Divider()
                    .background(Color(hex: "#2F3336"))
                
                // 动态列表：首屏加载时显示骨架屏，与首页一致
                if posts.isEmpty && isLoading {
                    topicListSkeleton
                } else if posts.isEmpty {
                    emptyStateView
                        .padding(.top, 40)
                } else {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(posts) { post in
                            NavigationLink(destination: PostDetailView(post: post)) {
                                PostCardView(post: post, currentTopicName: topicName)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Divider()
                                .background(Color(hex: "#2F3336"))
                        }
                        
                        if hasMore && !isLoadingMore {
                            loadMoreButton
                        } else if isLoadingMore {
                            loadingIndicator
                        }
                    }
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            if topicDetail != nil {
                topicBottomBar
            }
        }
    }
    
    /// 客户端已有话题名时先展示的简易头部，服务端详情加载后再替换为 topicInfoSection
    private func topicHeaderPlaceholder(name: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(Color(hex: "#2F3336"))
                .frame(width: 60, height: 60)
                .overlay(
                    Text("#")
                        .foregroundColor(.white)
                        .font(.system(size: 24, weight: .bold))
                )
            VStack(alignment: .leading, spacing: 8) {
                Text("#\(name)#")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                HStack(spacing: 8) {
                    ProgressView()
                        .tint(Color(hex: "#FF6B35"))
                        .scaleEffect(0.8)
                    Text("加载中…")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#71767A"))
                }
            }
            Spacer()
        }
    }
    
    private func topicFullScreenErrorView(message: String) -> some View {
        EmptyStateView(
            icon: "wifi.exclamationmark",
            title: "加载失败",
            message: message,
            actionTitle: "重新加载",
            iconColor: .red.opacity(0.8),
            action: {
                errorMessage = nil
                Task {
                    await loadTopicDetail()
                    await loadPosts()
                }
            }
        )
        .padding(.top, 40)
    }
    
    private func topicInfoSection(detail: TopicDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                // 话题图标
                if let icon = detail.icon, !icon.isEmpty {
                    AsyncImage(url: URL(string: icon)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Circle()
                            .fill(Color(hex: "#2F3336"))
                            .overlay(
                                Text("#")
                                    .foregroundColor(.white)
                                    .font(.system(size: 24, weight: .bold))
                            )
                    }
                    .frame(width: 60, height: 60)
                    .clipShape(Circle())
                } else {
                    Circle()
                        .fill(Color(hex: "#2F3336"))
                        .frame(width: 60, height: 60)
                        .overlay(
                            Text("#")
                                .foregroundColor(.white)
                                .font(.system(size: 24, weight: .bold))
                        )
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("#\(detail.name)#")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                    
                    // 简介（与小程序一致）
                    if let description = detail.description, !description.isEmpty {
                        Text(description)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                            .lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    
                    HStack(spacing: 16) {
                        Text("\(detail.joinCounts ?? 0)次参与")
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "#71767A"))
                        
                        if let creator = detail.creator {
                            HStack(spacing: 4) {
                                Text("创建者:")
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(hex: "#71767A"))
                                
                                NavigationLink(destination: UserProfileView(userId: creator.id, userName: creator.userName)) {
                                    Text(creator.userName)
                                        .font(.system(size: 13))
                                        .foregroundColor(Color(hex: "#FF6B35"))
                                }
                            }
                        }
                    }
                }
                
                Spacer()
            }
        }
    }
    
    /// 底部「参与话题」按钮，复用帖子详情页底部栏样式（液态玻璃 pill，宽度随文字适配）
    private var topicBottomBar: some View {
        HStack {
            Spacer()
            Button(action: { showPublishSheet = true }) {
                Text("参与话题")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 32)
                    .frame(height: 64)
                    .background {
                        Capsule()
                            .fill(.clear)
                            .glassEffect(.regular.interactive())
                    }
            }
            .buttonStyle(PlainButtonStyle())
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 0)
    }
    
    /// 帖子列表加载中骨架屏（与首页 SkeletonPostCardView 一致）
    private var topicListSkeleton: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(0..<3, id: \.self) { _ in
                SkeletonPostCardView()
                Divider()
                    .background(Color(hex: "#2F3336"))
            }
        }
        .padding(.top, 8)
        .transition(.opacity)
    }
    
    private var emptyStateView: some View {
        EmptyStateView(
            icon: "photo.on.rectangle",
            title: "暂无动态",
            message: "这个话题下还没有动态"
        )
    }
    
    private var loadMoreButton: some View {
        Button(action: {
            Task {
                await loadMorePosts()
            }
        }) {
            Text("加载更多")
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "#FF6B35"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
        }
    }
    
    private var loadingIndicator: some View {
        ProgressView()
            .tint(Color(hex: "#FF6B35"))
            .frame(maxWidth: .infinity)
            .padding()
    }
    
    private func loadTopicDetail() async {
        do {
            let detail: TopicDetail = try await APIService.shared.getTopicDetail(topicName: topicName)
            await MainActor.run {
                topicDetail = detail
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
            }
        }
    }
    
    private func loadPosts() async {
        isLoading = true
        do {
            let response = try await APIService.shared.getTopicDynList(
                topicName: topicName,
                limit: pageSize,
                publicTime: nil
            )
            await MainActor.run {
                posts = response.list
                publicTime = response.publicTime
                hasMore = response.hasMore
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
    
    private func loadMorePosts() async {
        guard !isLoadingMore && hasMore else { return }
        isLoadingMore = true
        let cursor = publicTime
        do {
            let response = try await APIService.shared.getTopicDynList(
                topicName: topicName,
                limit: pageSize,
                publicTime: cursor
            )
            await MainActor.run {
                let existingIds = Set(posts.map(\.id))
                posts.append(contentsOf: response.list.filter { !existingIds.contains($0.id) })
                publicTime = response.publicTime
                hasMore = response.hasMore
                isLoadingMore = false
            }
        } catch {
            await MainActor.run { isLoadingMore = false }
        }
    }
}

// MARK: - 话题详情模型
struct TopicDetail: Codable {
    let id: String
    let name: String
    let icon: String?
    let description: String?
    let createTime: Date?
    let creator: Creator?
    let dynCount: Int
    /// 参与次数（与小程序一致）
    let joinCounts: Int?
    
    struct Creator: Codable {
        let id: String
        let userName: String
        let avatar: String?
    }
}

