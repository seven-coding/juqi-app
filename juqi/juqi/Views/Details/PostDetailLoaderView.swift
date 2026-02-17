//
//  PostDetailLoaderView.swift
//  juqi
//
//  Loads post by id and presents PostDetailView (for message tap-to-dyn).
//

import SwiftUI

struct PostDetailLoaderView: View {
    let dynId: String
    @State private var post: Post?
    @State private var isLoading = true
    @State private var loadFailed: String?
    
    var body: some View {
        Group {
            if isLoading {
                ZStack {
                    Color(hex: "#000000").ignoresSafeArea()
                    VStack(spacing: 12) {
                        ProgressView()
                            .tint(Color(hex: "#FF6B35"))
                        Text("加载中...")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#605D5D"))
                    }
                }
            } else if let loadFailed = loadFailed {
                ZStack {
                    Color(hex: "#000000").ignoresSafeArea()
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.icloud")
                            .font(.system(size: 48))
                            .foregroundColor(Color(hex: "#605D5D"))
                        Text(loadFailed)
                            .font(.system(size: 16))
                            .foregroundColor(Color(hex: "#D6D0D0"))
                            .multilineTextAlignment(.center)
                    }
                }
            } else if let post = post {
                PostDetailView(post: post)
            }
        }
        .task {
            await loadPost()
        }
    }
    
    private func loadPost() async {
        isLoading = true
        loadFailed = nil
        do {
            let p = try await APIService.shared.getDynDetail(id: dynId)
            await MainActor.run {
                post = p
                isLoading = false
            }
        } catch {
            await MainActor.run {
                loadFailed = (error as? APIError)?.userMessage ?? "加载失败"
                isLoading = false
            }
        }
    }
}
