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
}
