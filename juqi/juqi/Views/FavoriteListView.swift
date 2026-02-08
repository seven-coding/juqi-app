//
//  FavoriteListView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct FavoriteListView: View {
    let userId: String
    
    @State private var posts: [Post] = []
    @State private var isLoading = false
    @State private var publicTime: Double? = nil
    @State private var hasMore = true
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "#000000")
                    .ignoresSafeArea()
                
                if posts.isEmpty && !isLoading {
                    VStack {
                        Spacer()
                        Text("暂无收藏")
                            .font(.system(size: 16))
                            .foregroundColor(Color(hex: "#71767A"))
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(posts) { post in
                                PostCardView(post: post)
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
            .navigationTitle("收藏")
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
            await loadFavorites()
        }
        .toolbar(.hidden, for: .tabBar)
    }
    
    private func loadFavorites() async {
        isLoading = true
        do {
            let response = try await APIService.shared.getFavoriteList(userId: userId, publicTime: nil)
            posts = response.list
            publicTime = response.publicTime
            hasMore = response.hasMore
        } catch {
            print("Failed to load favorites: \(error)")
        }
        applyMockFavoritesIfNeeded()
        isLoading = false
    }
    
    private func refresh() async {
        await loadFavorites()
    }
    
    private func loadMore() async {
        guard !isLoading && hasMore else { return }
        isLoading = true
        let cursor = publicTime
        do {
            let response = try await APIService.shared.getFavoriteList(userId: userId, publicTime: cursor)
            let existingIds = Set(posts.map(\.id))
            posts.append(contentsOf: response.list.filter { !existingIds.contains($0.id) })
            publicTime = response.publicTime
            hasMore = response.hasMore
        } catch {
            print("Failed to load more favorites: \(error)")
        }
        isLoading = false
    }
    
    private func applyMockFavoritesIfNeeded() {
#if DEBUG
        guard posts.isEmpty else { return }
        posts = [
            Post(
                id: "mock_post_001",
                userId: "mock_user_201",
                userName: "薄荷海",
                userAvatar: nil,
                userSignature: "收藏里的第一条",
                isVip: true,
                content: "今天看到一段很治愈的话：慢慢来也是一种勇敢。",
                images: [],
                tag: .daily,
                publishTime: Date().addingTimeInterval(-600),
                commentCount: 4,
                likeCount: 21,
                shareCount: 2,
                chargeCount: 3,
                isLiked: false,
                isCollected: true,
                isCharged: false,
                repostPost: nil,
                likeUsers: nil,
                joinCount: nil,
                circleId: nil,
                circleTitle: nil,
                circleJoinCount: nil,
                voiceUrl: nil,
                voiceDuration: nil,
                videoUrl: nil,
                musicInfo: nil
            ),
            Post(
                id: "mock_post_002",
                userId: "mock_user_202",
                userName: "星河入梦",
                userAvatar: nil,
                userSignature: "一起收藏好风景",
                isVip: false,
                content: "这周最大的收获：把自己放在第一位。",
                images: [
                    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
                    "https://images.unsplash.com/photo-1469474968028-56623f02e42e"
                ],
                tag: .daily,
                publishTime: Date().addingTimeInterval(-3600 * 6),
                commentCount: 8,
                likeCount: 52,
                shareCount: 6,
                chargeCount: 5,
                isLiked: true,
                isCollected: true,
                isCharged: true,
                repostPost: nil,
                likeUsers: nil,
                joinCount: nil,
                circleId: nil,
                circleTitle: nil,
                circleJoinCount: nil,
                voiceUrl: nil,
                voiceDuration: nil,
                videoUrl: nil,
                musicInfo: nil
            ),
            Post(
                id: "mock_post_003",
                userId: "mock_user_203",
                userName: "深海蓝",
                userAvatar: nil,
                userSignature: "愿你被温柔以待",
                isVip: false,
                content: "把喜欢的歌单分享给你：夜晚、海风、路灯。",
                images: [],
                tag: .talent,
                publishTime: Date().addingTimeInterval(-3600 * 20),
                commentCount: 1,
                likeCount: 9,
                shareCount: 1,
                chargeCount: 0,
                isLiked: false,
                isCollected: true,
                isCharged: false,
                repostPost: Post.RepostPost(
                    id: "mock_repost_001",
                    userId: "mock_user_204",
                    userName: "栀子白",
                    userAvatar: nil,
                    content: "感谢你们的喜欢，这首歌真的很适合雨天。",
                    images: nil
                ),
                likeUsers: nil,
                joinCount: nil,
                circleId: nil,
                circleTitle: nil,
                circleJoinCount: nil,
                voiceUrl: nil,
                voiceDuration: nil,
                videoUrl: nil,
                musicInfo: nil
            )
        ]
        hasMore = false
#endif
    }
}
