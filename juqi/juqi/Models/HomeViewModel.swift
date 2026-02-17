//
//  HomeViewModel.swift
//  juqi
//
//  Created by Assistant on 2026/1/12.
//

import SwiftUI
import Combine

@MainActor
class HomeViewModel: ObservableObject {
    @Published var selectedCategory: HomeCategory = .latest {
        didSet {
            // 保存旧分类的滚动位置
            if oldValue != selectedCategory {
                // 滚动位置会在 HomeView 中通过 PreferenceKey 保存
            }
            
            if categoryData[selectedCategory] == nil {
                Task { await refreshPosts() }
            }
        }
    }
    
    // 为每个分类存储独立的数据状态，实现 Tab 切换瞬间回显
    @Published var categoryData: [HomeCategory: CategoryState] = [:]
    @Published var isLoading = false
    @Published var lastError: APIError? = nil
    
    /// 上次成功加载列表时的 dataEnv，用于进入首页时检测环境是否切换并强制刷新
    @Published var lastLoadedDataEnv: String? = nil
    
    // 滚动位置存储（使用 Post ID 作为锚点）
    private var scrollPositions: [HomeCategory: String] = [:]
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // 监听发布成功通知，自动刷新列表
        NotificationCenter.default.publisher(for: NSNotification.Name("PostPublished"))
            .sink { [weak self] _ in
                Task {
                    guard let self = self else { return }
                    // 切换到“最新”分类以看到新发布的帖子
                    self.selectedCategory = .latest
                    _ = await self.refreshPosts()
                }
            }
            .store(in: &cancellables)
        
        // 监听数据环境切换：清空内存列表，使返回首页时 loadInitialData 会重新请求
        NotificationCenter.default.publisher(for: NSNotification.Name("DataEnvDidChange"))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self = self else { return }
                self.categoryData = [:]
                self.lastLoadedDataEnv = nil
                print("🔄 [HomeViewModel] 数据环境已切换，已清空列表与 lastLoadedDataEnv")
            }
            .store(in: &cancellables)
    }
    
    struct CategoryState {
        var posts: [Post] = []
        var hasMore: Bool = true
        /// 游标，加载下一页时传给服务端（服务端为游标分页）
        var publicTime: Double? = nil
        var scrollOffset: CGFloat = 0
        var lastVisiblePostId: String? = nil
    }
    
    // 当前选中的分类数据
    var currentPosts: [Post] {
        categoryData[selectedCategory]?.posts ?? []
    }
    
    var currentHasMore: Bool {
        categoryData[selectedCategory]?.hasMore ?? true
    }
    
    private let hapticGenerator = UIImpactFeedbackGenerator(style: .medium)
    /// 最近一次刷新是否有新内容（首条 ID 变化或从空变为有数据视为有新内容）
    private var lastRefreshHadNewContent = true

    /// 下拉刷新或首次加载：重新请求列表接口（首屏，不传游标）
    /// - Returns: (success, hasNewContent)：成功时 hasNewContent 表示是否有新内容；失败或取消时为 (false, nil)
    func refreshPosts() async -> (success: Bool, hasNewContent: Bool?) {
        hapticGenerator.prepare()
        lastRefreshHadNewContent = true
        isLoading = true
        lastError = nil
        let category = selectedCategory
        // 明确按「首屏」请求，服务端会跳过首屏缓存返回最新数据
        var state = categoryData[category] ?? CategoryState()
        state.publicTime = nil
        state.hasMore = true
        categoryData[category] = state

        print("🔄 [HomeViewModel] 开始加载动态列表 - 分类: \(category.apiType), 刷新")
        
        // 在独立 Task 中完成「请求 + 写回数据」，这样即使用户松手导致 .refreshable 的 Task 被取消，新内容仍会展示
        let requestTask = Task.detached(priority: .userInitiated) { [weak self] in
            guard let self = self else { return }
            do {
                let response = try await APIService.shared.getDynList(type: category.apiType, publicTime: nil)
                await self.applyRefreshResult(category: category, response: response)
            } catch {
                await self.applyRefreshError(category: category, error: error)
            }
        }
        await requestTask.value
        if Task.isCancelled {
            return (false, nil)
        }
        return (true, lastRefreshHadNewContent)
    }

    /// 在 MainActor 上写回刷新结果（由独立 Task 调用，保证即使用户松手取消 .refreshable 也能更新列表）
    private func applyRefreshResult(category: HomeCategory, response: DynListResponse) {
        print("✅ 动态列表加载成功 - 数量: \(response.list.count), 是否有更多: \(response.hasMore)")
        let currentState = categoryData[category]
        let lastVisiblePostId = currentState?.lastVisiblePostId
        let oldFirstId = currentState?.posts.first?.id
        let newFirstId = response.list.first?.id
        let wasEmpty = currentState?.posts.isEmpty ?? true
        lastRefreshHadNewContent = (oldFirstId != newFirstId) || (wasEmpty && !response.list.isEmpty)
        categoryData[category] = CategoryState(
            posts: response.list,
            hasMore: response.hasMore,
            publicTime: response.publicTime,
            lastVisiblePostId: lastVisiblePostId
        )
        lastLoadedDataEnv = AppConfig.dataEnv
        hapticGenerator.impactOccurred()
        isLoading = false
    }

    /// 在 MainActor 上写回刷新错误
    private func applyRefreshError(category: HomeCategory, error: Error) {
        if error is CancellationError {
            isLoading = false
            return
        }
        print("❌ 加载动态列表失败: \(error)")
        if let apiError = error as? APIError {
            lastError = apiError
            print("   API错误: \(apiError.localizedDescription)")
        } else {
            lastError = .unknown
        }
        isLoading = false
    }
    
    func loadMorePosts() async {
        guard !isLoading else { return }
        let category = selectedCategory
        guard let state = categoryData[category], state.hasMore else { return }
        
        isLoading = true
        lastError = nil
        
        do {
            let response = try await APIService.shared.getDynList(
                type: category.apiType,
                publicTime: state.publicTime
            )
            
            var newState = state
            let existingIds = Set(newState.posts.map(\.id))
            let newPosts = response.list.filter { !existingIds.contains($0.id) }
            newState.posts.append(contentsOf: newPosts)
            newState.publicTime = response.publicTime
            newState.hasMore = response.hasMore
            categoryData[category] = newState
            
        } catch {
            print("Failed to load more posts: \(error)")
            if let apiError = error as? APIError {
                // 加载更多失败时，只设置 lastError 以触发 Toast，不清除已有数据
                lastError = apiError
            }
        }
        isLoading = false
    }
    
    // 保存滚动位置（通过 Post ID）
    func saveScrollPosition(category: HomeCategory, postId: String?) {
        if var state = categoryData[category] {
            state.lastVisiblePostId = postId
            categoryData[category] = state
        }
    }
    
    // 获取滚动位置
    func getScrollOffset(for category: HomeCategory) -> CGFloat? {
        return categoryData[category]?.scrollOffset
    }
    
    // 获取最后可见的 Post ID（用于恢复滚动位置）
    func getLastVisiblePostId(for category: HomeCategory) -> String? {
        return categoryData[category]?.lastVisiblePostId
    }
    
    /// 数据环境切换后由 HomeView 调用：清空列表与 lastLoadedDataEnv，使下次 loadInitialData 会重新请求
    func clearListForDataEnvChange() {
        categoryData = [:]
        lastLoadedDataEnv = nil
        print("🔄 [HomeViewModel] clearListForDataEnvChange - 已清空列表")
    }
    
    // 触觉反馈辅助方法
    func triggerHaptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }
    
    // 通知类型触觉反馈（成功、警告、错误）
    func triggerHaptic(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(type)
    }
}
