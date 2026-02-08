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
    
    private let pageSize = 20
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if isLoading {
                ProgressView()
                    .tint(Color(hex: "#FF6B35"))
            } else if let detail = topicDetail {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        // 话题信息区
                        topicInfoSection(detail: detail)
                            .padding(.horizontal, 16)
                            .padding(.top, 16)
                            .padding(.bottom, 12)
                        
                        Divider()
                            .background(Color(hex: "#2F3336"))
                        
                        // 动态列表
                        if posts.isEmpty {
                            emptyStateView
                                .padding(.top, 40)
                        } else {
                            LazyVStack(alignment: .leading, spacing: 0) {
                                ForEach(posts) { post in
                                    NavigationLink(destination: PostDetailView(post: post)) {
                                        PostCardView(post: post)
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
            }
        }
        .navigationTitle("#\(topicName)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .task {
            await loadTopicDetail()
            await loadPosts()
        }
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
                    
                    if let description = detail.description, !description.isEmpty {
                        Text(description)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                            .lineLimit(2)
                    }
                    
                    HStack(spacing: 16) {
                        Label("\(detail.dynCount) 条动态", systemImage: "bubble.right")
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
    
    struct Creator: Codable {
        let id: String
        let userName: String
        let avatar: String?
    }
}

