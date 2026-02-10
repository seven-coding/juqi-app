//
//  NoSeeMeListView.swift
//  juqi
//
//  不让对方看我动态列表
//

import SwiftUI

struct NoSeeMeListView: View {
    @State private var users: [UserListItem] = []
    @State private var isLoading = false
    @State private var page = 1
    @State private var hasMore = true
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if users.isEmpty && !isLoading {
                VStack {
                    Spacer()
                    Text("暂无")
                        .font(.system(size: 16))
                        .foregroundColor(Color(hex: "#71767A"))
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(users) { user in
                            HStack(spacing: 12) {
                                AsyncImage(url: URL(string: user.avatar ?? "")) { phase in
                                    switch phase {
                                    case .success(let image): image.resizable().scaledToFill()
                                    default: Color(hex: "#2F3336")
                                    }
                                }
                                .frame(width: 44, height: 44)
                                .clipShape(Circle())
                                Text(user.userName.isEmpty ? "用户" : user.userName)
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.white)
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .overlay(
                                Rectangle().frame(height: 0.5).foregroundColor(Color(hex: "#2F3336")),
                                alignment: .bottom
                            )
                        }
                        if hasMore && !users.isEmpty {
                            ProgressView().padding()
                                .onAppear { if !isLoading { Task { await loadMore() } } }
                        }
                    }
                }
                .refreshable { await refresh() }
            }
        }
        .navigationTitle("不让对方看我动态")
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
        .task { await refresh() }
        .toolbar(.hidden, for: .tabBar)
    }

    private func refresh() async {
        page = 1
        hasMore = true
        users = []
        await loadMore()
    }

    private func loadMore() async {
        guard !isLoading, hasMore else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let list = try await APIService.shared.getNoSeeMeList(page: page, limit: 20)
            await MainActor.run {
                if page == 1 { users = list.list }
                else { users.append(contentsOf: list.list) }
                hasMore = list.list.count >= 20
                page += 1
            }
        } catch {
            print("getNoSeeMeList error: \(error)")
        }
    }
}
