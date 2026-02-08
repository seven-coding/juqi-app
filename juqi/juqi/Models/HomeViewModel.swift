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
    
    /// 下拉刷新或首次加载：重新请求列表接口（首屏，不传游标）
    func refreshPosts() async -> Bool {
        hapticGenerator.prepare()
        isLoading = true
        lastError = nil
        let category = selectedCategory
        // 明确按「首屏」请求，服务端会跳过首屏缓存返回最新数据
        var state = categoryData[category] ?? CategoryState()
        state.publicTime = nil
        state.hasMore = true
        categoryData[category] = state

        print("🔄 [HomeViewModel] 开始加载动态列表 - 分类: \(category.apiType), 刷新")
        
        do {
            let response = try await APIService.shared.getDynList(type: category.apiType, publicTime: nil)
            
            print("✅ 动态列表加载成功 - 数量: \(response.list.count), 是否有更多: \(response.hasMore)")
            // 调试：确认每条帖子的 content 是否包含 # 和 @
            for (index, post) in response.list.enumerated() {
                let hasTopic = post.content.contains("#")
                let hasMention = post.content.contains("@")
                print("📋 [Content] [\(index)] id=\(post.id.prefix(8))… content长度=\(post.content.count) 含#=\(hasTopic) 含@=\(hasMention) | content=\(post.content.prefix(80))\(post.content.count > 80 ? "…" : "")")
            }
            
            let currentState = categoryData[category]
            let lastVisiblePostId = currentState?.lastVisiblePostId
            
            categoryData[category] = CategoryState(
                posts: response.list,
                hasMore: response.hasMore,
                publicTime: response.publicTime,
                lastVisiblePostId: lastVisiblePostId
            )
            
            // 刷新成功的轻微反馈
            hapticGenerator.impactOccurred()
            isLoading = false
            return true
        } catch {
            // Task 取消（如用户离开页面）时不展示错误
            if error is CancellationError {
                isLoading = false
                return false
            }
            print("❌ 加载动态列表失败: \(error)")
            if let apiError = error as? APIError {
                lastError = apiError
                print("   API错误: \(apiError.localizedDescription)")
            } else {
                lastError = .unknown
            }
            isLoading = false
            return false
        }
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
