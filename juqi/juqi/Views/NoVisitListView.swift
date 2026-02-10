//
//  NoVisitListView.swift
//  juqi
//
//  隐身访问列表：对哪些用户设置了「不留下访客痕迹」
//

import SwiftUI

struct NoVisitListView: View {
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
                    Text("暂无隐身访问用户")
                        .font(.system(size: 16))
                        .foregroundColor(Color(hex: "#71767A"))
                    Text("在他人主页「更多」中可设置隐身访问")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#71767A").opacity(0.8))
                        .padding(.top, 4)
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(users) { user in
                            NoVisitRowView(user: user) {
                                Task { await removeFromNoVisit(user: user) }
                            }
                            .overlay(
                                Rectangle()
                                    .frame(height: 0.5)
                                    .foregroundColor(Color(hex: "#2F3336")),
                                alignment: .bottom
                            )
                        }
                        if hasMore && !users.isEmpty {
                            ProgressView()
                                .padding()
                                .onAppear {
                                    if !isLoading { Task { await loadMore() } }
                                }
                        }
                    }
                }
                .refreshable { await refresh() }
            }
        }
        .navigationTitle("隐身访问列表")
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
            let list = try await APIService.shared.getNoVisitList(page: page, limit: 20)
            await MainActor.run {
                if page == 1 { users = list.list }
                else { users.append(contentsOf: list.list) }
                hasMore = list.list.count >= 20
                page += 1
            }
        } catch {
            print("getNoVisitList error: \(error)")
        }
    }

    private func removeFromNoVisit(user: UserListItem) async {
        do {
            try await APIService.shared.setVisitStatus(userId: user.id, leaveTrace: true)
            await MainActor.run {
                users.removeAll { $0.id == user.id }
            }
        } catch {
            print("取消隐身失败: \(error)")
        }
    }
}

private struct NoVisitRowView: View {
    let user: UserListItem
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: user.avatar ?? "")) { phase in
                switch phase {
                case .success(let image): image.resizable().scaledToFill()
                default: Color(hex: "#2F3336")
                }
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(user.userName.isEmpty ? "用户" : user.userName)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
            }
            Spacer()
            Button("取消隐身") {
                onRemove()
            }
            .font(.system(size: 14))
            .foregroundColor(Color(hex: "#FF6B35"))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

// 列表项模型（与 getUserList noVisit 返回一致：openId, nickName, avatarUrl, avatarVisitUrl）
struct UserListItem: Identifiable, Codable {
    var id: String { openId }
    let openId: String
    let userName: String
    let avatar: String?
    let nickName: String?
    enum CodingKeys: String, CodingKey {
        case openId
        case userName
        case avatar
        case nickName
        case avatarUrl
        case avatarVisitUrl
    }
    init(openId: String, userName: String, avatar: String?, nickName: String?) {
        self.openId = openId
        self.userName = userName
        self.avatar = avatar
        self.nickName = nickName
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        openId = try c.decode(String.self, forKey: .openId)
        nickName = try c.decodeIfPresent(String.self, forKey: .nickName)
        userName = nickName ?? (try? c.decodeIfPresent(String.self, forKey: .userName)) ?? ""
        let avatarVisitUrl = try? c.decodeIfPresent(String.self, forKey: .avatarVisitUrl)
        let avatarUrl = try? c.decodeIfPresent(String.self, forKey: .avatarUrl)
        avatar = avatarVisitUrl ?? avatarUrl ?? (try? c.decodeIfPresent(String.self, forKey: .avatar))
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(openId, forKey: .openId)
        try c.encode(userName, forKey: .userName)
        try c.encodeIfPresent(nickName, forKey: .nickName)
        try c.encodeIfPresent(avatar, forKey: .avatar)
    }
}
