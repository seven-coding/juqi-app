//
//  CircleDetailView.swift
//  juqi
//
//  电站主页：展示电站信息（说明、电量、守则、封面、话题、人数）与该站动态流。本期不做加入/退出。
//

import SwiftUI

struct CircleDetailView: View {
    let circleId: String
    var circleTitle: String? = nil

    @State private var displayTitle: String = ""
    @State private var circleDetail: CircleItem? = nil
    /// 用户在该电站的加入状态：0 未加入 1 申请中 2 已加入（用于发布权限校验）
    @State private var circleFollowStatus: Int? = nil
    @State private var posts: [Post] = []
    @State private var hasMore = true
    @State private var publicTime: Double? = nil
    @State private var isLoading = false
    @State private var isLoadingMore = false
    @State private var detailError: APIError?
    @State private var selectedPostForDetail: Post? = nil
    @State private var selectedUserId: String? = nil
    @State private var selectedTopicName: String? = nil
    @State private var showPublishSheet = false

    private let limit = 20

    /// 上一页已传入电站名称时可先展示，无需等接口
    private var hasKnownTitle: Bool {
        guard let t = circleTitle, !t.isEmpty else { return false }
        return true
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if isLoading && posts.isEmpty && circleDetail == nil && !hasKnownTitle {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                    .scaleEffect(1.2)
            } else if let error = detailError, posts.isEmpty && circleDetail == nil {
                fullScreenErrorView(error)
            } else {
                feedContent
            }
        }
        .navigationTitle("电站")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("发布") {
                    handlePublishTap()
                }
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(Color(hex: "#FF6B35"))
            }
        }
        .fullScreenCover(isPresented: $showPublishSheet) {
            PublishView(
                activeTab: .constant(.discover),
                initialCircleId: circleId,
                initialCircleTitle: circleDetail?.title ?? circleTitle ?? (displayTitle.isEmpty ? nil : displayTitle),
                initialCircleIsSecret: circleDetail?.isSecret == true
            )
        }
        .task {
            await loadDetailAndFeed()
        }
        .refreshable {
            await refreshFeed()
        }
        .navigationDestination(item: $selectedPostForDetail) { post in
            PostDetailView(post: post)
        }
        .navigationDestination(item: $selectedUserId) { userId in
            UserProfileView(userId: userId, userName: "")
        }
        .navigationDestination(item: $selectedTopicName) { topicName in
            TopicDetailView(topicName: topicName)
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("PostPublished"))) { _ in
            // 发布成功后若当前是电站页（从电站进发布会 dismiss 回到此页），刷新列表以显示新发布内容
            Task { await refreshFeed() }
        }
    }

    private var feedContent: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                if let circle = circleDetail {
                    circleHeaderSection(circle: circle)
                } else if hasKnownTitle, let title = circleTitle {
                    circleHeaderPlaceholder(title: title)
                }

                if posts.isEmpty && !isLoading {
                    EmptyStateView(
                        icon: "photo.on.rectangle",
                        title: "暂无动态",
                        message: nil,
                        actionTitle: nil,
                        iconSize: 36,
                        action: nil
                    )
                    .padding(.top, 40)
                    .frame(maxWidth: .infinity)
                } else if posts.isEmpty && isLoading {
                    circleListSkeleton
                } else {
                    ForEach(posts) { post in
                        PostCardView(
                            post: post,
                            onNavigateToDetail: { selectedPostForDetail = $0 },
                            onNavigateToUser: { selectedUserId = $0 },
                            onNavigateToTopic: { selectedTopicName = $0 }
                        )
                        .overlay(divider, alignment: .bottom)
                        .id(post.id)
                        .onAppear {
                            if post.id == posts.last?.id {
                                Task { await loadMore() }
                            }
                        }
                    }

                    if isLoadingMore {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                            .padding(.vertical, 16)
                            .frame(maxWidth: .infinity)
                    }
                }
            }
            .padding(.bottom, 100)
        }
    }

    // MARK: - 电站头部信息区（Apple 设计语言：层级清晰、留白舒适、圆角与语义分组）
    private func circleHeaderSection(circle: CircleItem) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // 标题区：大标题 + 副信息一行
            VStack(alignment: .leading, spacing: 16) {
                Text(circle.title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                // 电量：胶囊信息（Apple 式信息块）
                HStack(spacing: 12) {
                    statChip(icon: "bolt.fill", value: "\(circle.chargeNums ?? 0)", label: "电量")
                }
            }
            .padding(.bottom, 20)

            // 本站守则：轻量脚注式
            if circle.isJoinCheck == true || circle.isMemberPublic == true || circle.isPublickCheck == true {
                let rules = [
                    circle.isJoinCheck == true ? "加入需审核" : nil,
                    circle.isMemberPublic == true ? "仅限成员发帖" : nil,
                    circle.isPublickCheck == true ? "投稿需审核" : nil
                ].compactMap { $0 }
                if !rules.isEmpty {
                    Text("电站守则：「\(rules.joined(separator: " · "))」")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#8E8E93"))
                        .padding(.bottom, 20)
                }
            }

            // 电站简介：仅展示正文，不显示标题
            if let desc = circle.desc, !desc.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text(desc)
                        .font(.system(size: 15, weight: .regular))
                        .foregroundColor(Color(hex: "#D1D1D6"))
                        .lineSpacing(6)
                        .lineLimit(5)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.bottom, 20)
            }

            // 封面图：圆角与比例符合 iOS 规范
            if let banner = circle.banner, !banner.isEmpty, let url = URL(string: banner) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(hex: "#2C2C2E"))
                    @unknown default:
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(hex: "#2C2C2E"))
                    }
                }
                .frame(height: 180)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.bottom, 20)
            }

            // 话题：横向滚动胶囊，点击跳转话题详情
            if let topicList = circle.topic, !topicList.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(topicList, id: \.self) { topic in
                            Button(action: { selectedTopicName = topic }) {
                                Text("#\(topic)")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(Color(hex: "#D1D1D6"))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Color(hex: "#2C2C2E"))
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(.horizontal, 1)
                }
                .padding(.bottom, 20)
            }

            divider
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, 28)
    }

    /// 客户端已有名称时先展示的简易头部，服务端详情加载后再替换为 circleHeaderSection
    private func circleHeaderPlaceholder(title: String) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 8) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                    .scaleEffect(0.9)
                Text("加载中…")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#8E8E93"))
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, 28)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// 帖子列表加载中骨架屏（与首页 SkeletonPostCardView 一致）
    private var circleListSkeleton: some View {
        ForEach(0..<3, id: \.self) { _ in
            SkeletonPostCardView()
                .overlay(divider, alignment: .bottom)
        }
        .transition(.opacity)
    }

    /// 单个统计胶囊：图标 + 数值 + 标签（Apple 信息块风格）
    private func statChip(icon: String, value: String, label: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(hex: "#FF6B35"))
            Text(value)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "#8E8E93"))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(hex: "#1C1C1E"))
        .clipShape(Capsule())
    }

    private var divider: some View {
        Rectangle()
            .fill(Color(hex: "#2F3336"))
            .frame(height: 0.5)
    }

    /// 点击发布：校验电站发布权限（仅限成员发帖时需已加入），无权限 toast，有权限打开发布页并带入电站名
    /// 无权限规则：isMemberPublic==true 且 followStatus!=2 → 无权限；否则有权限
    private func handlePublishTap() {
        guard let circle = circleDetail else {
            ToastManager.shared.error("请稍候，加载完成后再发布")
            return
        }
        let needMember = circle.isMemberPublic == true
        let isMember = (circleFollowStatus ?? 0) == 2
        if needMember && !isMember {
            ToastManager.shared.error("本电站仅限成员才可发帖")
            return
        }
        showPublishSheet = true
    }

    private func fullScreenErrorView(_ error: APIError) -> some View {
        EmptyStateView(
            icon: error.iconName,
            title: "加载失败",
            message: error.userMessage,
            actionTitle: "重新加载",
            iconColor: .red.opacity(0.8),
            action: {
                Task { await loadDetailAndFeed() }
            }
        )
        .padding(.top, 40)
    }

    private func loadDetailAndFeed() async {
        if let t = circleTitle, !t.isEmpty {
            await MainActor.run { displayTitle = t }
        }
        isLoading = true
        detailError = nil
        defer { isLoading = false }

        do {
            let detail = try await APIService.shared.getCircleDetail(circleId: circleId)
            await MainActor.run {
                circleDetail = detail.circle
                displayTitle = detail.circle?.title ?? circleTitle ?? "电站"
                circleFollowStatus = detail.followStatus
            }
        } catch let err as APIError {
            await MainActor.run { detailError = err }
            return
        } catch {
            await MainActor.run { detailError = .unknown }
            return
        }

        await refreshFeed()
    }

    private func refreshFeed() async {
        publicTime = nil
        hasMore = true
        do {
            let response = try await APIService.shared.getDynList(
                type: "circle",
                limit: limit,
                publicTime: nil,
                circleId: circleId
            )
            await MainActor.run {
                posts = response.list
                hasMore = response.hasMore
                publicTime = response.publicTime
            }
        } catch let err as APIError {
            await MainActor.run {
                if posts.isEmpty { detailError = err }
            }
        } catch {
            await MainActor.run {
                if posts.isEmpty { detailError = .unknown }
            }
        }
    }

    private func loadMore() async {
        guard hasMore, !isLoadingMore, let cursor = publicTime else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        do {
            let response = try await APIService.shared.getDynList(
                type: "circle",
                limit: limit,
                publicTime: cursor,
                circleId: circleId
            )
            await MainActor.run {
                posts.append(contentsOf: response.list)
                hasMore = response.hasMore
                publicTime = response.publicTime
            }
        } catch {
            await MainActor.run { hasMore = false }
        }
    }
}
