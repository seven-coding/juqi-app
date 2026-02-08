//
//  HomeView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var scrollProxy: ScrollViewProxy? = nil
    @State private var categoryScrollProxy: ScrollViewProxy? = nil
    @State private var showRefreshSuccess = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showScrollToTopButton = false
    @State private var scrollOffset: CGFloat = 0
    @State private var isScrollingToTop = false
    @State private var showScrollingIndicator = false
    @State private var showHotListExplanation = false
    
    var body: some View {
        mainContent
            .background(Color.black)
            .overlay(scrollingToTopIndicator, alignment: .top)
            .overlay(refreshSuccessOverlay, alignment: .top)
            .overlay(errorOverlay, alignment: .top)
            .overlay(scrollToTopButton, alignment: .bottomTrailing)
            .task(loadInitialData)
            .onAppear {
                // 同步打印，确保进入首页时控制台必有输出（便于排查无日志问题）
                print("🏠 [HomeView] onAppear - 当前动态数量: \(viewModel.currentPosts.count), 是否加载中: \(viewModel.isLoading)")
            }
            .onChange(of: viewModel.lastError) { _, newValue in
                handleErrorChange(newValue)
            }
            .onChange(of: viewModel.selectedCategory) { _, _ in
                // 切换分类时重置按钮显示状态
                showScrollToTopButton = false
            }
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("HomeTabDoubleTapped"))) { _ in
                handleHomeTabDoubleTap()
            }
            .sheet(isPresented: $showHotListExplanation) {
                HotListExplanationView(isPresented: $showHotListExplanation)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                    .presentationBackground(.clear) // 让自定义玻璃背景生效
            }
    }
    
    // MARK: - Main Content
    private var mainContent: some View {
        VStack(spacing: 0) {
            categoryNavigationBar
            scrollViewContent
        }
    }
    
    // MARK: - Scroll View Content
    private var scrollViewContent: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 0) {
                    // 顶部检测视图 - 用于检测滚动位置
                    Color.clear
                        .frame(height: 1)
                        .id("top")
                        .background(
                            GeometryReader { geometry in
                                Color.clear
                                    .preference(
                                        key: FirstPostVisibilityPreferenceKey.self,
                                        value: geometry.frame(in: .named("scrollView")).minY
                                    )
                            }
                        )
                    
                    if viewModel.isLoading && viewModel.currentPosts.isEmpty {
                        skeletonContent
                    } else {
                        postsContent
                    }
                }
            }
            .coordinateSpace(name: "scrollView")
            .onPreferenceChange(FirstPostVisibilityPreferenceKey.self) { value in
                updateScrollToTopButtonVisibility(offset: value)
            }
            .refreshable {
                // 下拉刷新：重新请求列表接口（首屏，publicTime: nil）
                await handleRefresh()
            }
            .onAppear {
                scrollProxy = proxy
            }
            .onChange(of: viewModel.selectedCategory) { oldValue, newValue in
                handleCategoryChange(proxy: proxy, newValue: newValue)
            }
        }
    }
    
    // MARK: - Skeleton Content
    private var skeletonContent: some View {
        ForEach(0..<5) { _ in
            SkeletonPostCardView()
                .overlay(divider, alignment: .bottom)
        }
        .transition(.opacity)
    }
    
    // MARK: - Posts Content
    private var postsContent: some View {
        Group {
            if viewModel.currentPosts.isEmpty && !viewModel.isLoading {
                if let error = viewModel.lastError {
                    fullScreenErrorView(error)
                } else {
                    emptyStateView
                }
            } else {
                if viewModel.selectedCategory == .hot {
                    hotListHeader
                }
                
                ForEach(viewModel.currentPosts) { post in
                    PostCardView(post: post)
                        .overlay(divider, alignment: .bottom)
                        .id(post.id)
                        .onAppear {
                            if post.id == viewModel.currentPosts.last?.id {
                                viewModel.saveScrollPosition(category: viewModel.selectedCategory, postId: post.id)
                            }
                        }
                }
                .transition(.opacity)
                
                if viewModel.currentHasMore {
                    loadingMoreIndicator
                        .transition(.opacity)
                }
            }
        }
    }
    
    // MARK: - Empty State View（暂无动态时不显示发布按钮）
    private var emptyStateView: some View {
        EmptyStateView(
            icon: "photo.on.rectangle",
            title: "暂无动态",
            message: nil,
            actionTitle: nil,
            iconSize: 36,
            action: nil
        )
        .padding(.top, 40)
        .transition(.opacity.combined(with: .scale))
    }
    
    // MARK: - Full Screen Error View
    private func fullScreenErrorView(_ error: APIError) -> some View {
        EmptyStateView(
            icon: error.iconName,
            title: "加载失败",
            message: error.userMessage,
            actionTitle: "重新加载",
            iconColor: .red.opacity(0.8),
            action: {
                Task { await handleRefresh() }
            }
        )
        .padding(.top, 40)
        .transition(.opacity.combined(with: .scale))
    }
    
    // MARK: - Refresh Success Overlay
    private var refreshSuccessOverlay: some View {
        Group {
            if showRefreshSuccess {
                RefreshSuccessToast()
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: showRefreshSuccess)
    }
    
    // MARK: - Error Overlay
    private var errorOverlay: some View {
        Group {
            if showError {
                ErrorToast(
                    message: errorMessage,
                    icon: viewModel.lastError?.iconName ?? "exclamationmark.triangle.fill"
                ) {
                    showError = false
                }
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: showError)
    }
    
    // MARK: - Scrolling To Top Indicator
    private var scrollingToTopIndicator: some View {
        Group {
            if showScrollingIndicator {
                VStack(spacing: 8) {
                    HStack(spacing: 10) {
                        // 自定义加载动画
                        LoadingDotsView()
                        Text("正在刷新...")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.9))
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(
                        Capsule()
                            .fill(Color(hex: "#1C1C1E"))
                            .overlay(
                                Capsule()
                                    .stroke(Color(hex: "#FF6B35").opacity(0.3), lineWidth: 1)
                            )
                    )
                    .shadow(color: .black.opacity(0.4), radius: 12, x: 0, y: 6)
                }
                .padding(.top, 70)
                .transition(.asymmetric(
                    insertion: .scale(scale: 0.9).combined(with: .opacity).combined(with: .offset(y: -10)),
                    removal: .scale(scale: 0.95).combined(with: .opacity)
                ))
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: showScrollingIndicator)
    }
    
    // MARK: - Scroll To Top Button
    private var scrollToTopButton: some View {
        Group {
            if showScrollToTopButton {
                Button(action: {
                    scrollToTop()
                }) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(
                            ZStack {
                                Circle()
                                    .fill(Color(hex: "#FF6B35"))
                                
                                // 毛玻璃效果
                                Circle()
                                    .fill(.ultraThinMaterial)
                                    .opacity(0.3)
                            }
                        )
                        .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .buttonStyle(ScrollToTopButtonStyle())
                .padding(.trailing, 20)
                .padding(.bottom, 100) // 避免遮挡 TabBar
                .transition(.asymmetric(
                    insertion: .scale(scale: 0.8).combined(with: .opacity).combined(with: .offset(y: 10)),
                    removal: .scale(scale: 0.8).combined(with: .opacity).combined(with: .offset(y: 10))
                ))
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: showScrollToTopButton)
    }
    
    // MARK: - Actions
    private func loadInitialData() {
        // 立即打印，便于确认 .task 已触发（解决控制台无日志的排查）
        print("🏠 [HomeView] loadInitialData 被调用")
        Task {
            print("🏠 [HomeView] 检查是否需要加载 - 当前数量: \(viewModel.currentPosts.count)")
            if viewModel.currentPosts.isEmpty {
                print("📥 [HomeView] 数据为空，开始请求动态列表...")
                _ = await viewModel.refreshPosts()
            } else {
                print("✅ [HomeView] 已有数据，数量: \(viewModel.currentPosts.count)")
            }
        }
    }
    
    private func handleRefresh() async {
        viewModel.triggerHaptic(.soft)
        let success = await viewModel.refreshPosts()
        if success {
            showRefreshSuccess = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                showRefreshSuccess = false
            }
            viewModel.triggerHaptic(.light)
        }
    }
    
    private func handleCategoryChange(proxy: ScrollViewProxy, newValue: HomeCategory) {
        if let lastPostId = viewModel.getLastVisiblePostId(for: newValue),
           !lastPostId.isEmpty {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                withAnimation(.easeInOut(duration: 0.3)) {
                    proxy.scrollTo(lastPostId, anchor: .top)
                }
            }
        } else {
            withAnimation(.easeInOut(duration: 0.3)) {
                proxy.scrollTo("top", anchor: .top)
            }
        }
    }
    
    private func handleErrorChange(_ newValue: APIError?) {
        if let error = newValue {
            // 只有在已有数据的情况下才显示 Toast 错误，否则显示全屏错误状态
            if !viewModel.currentPosts.isEmpty {
                errorMessage = error.userMessage
                showError = true
                viewModel.triggerHaptic(.error)
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    showError = false
                }
            }
        }
    }
    
    private func handleHomeTabDoubleTap() {
        // 防止重复触发
        guard !isScrollingToTop else { return }
        
        Task {
            // 阶段1: 点击确认 - 轻触觉反馈
            viewModel.triggerHaptic(.light)
            isScrollingToTop = true
            
            // 根据滚动距离计算动画时长（距离越远，时间越长，但有上限）
            let distance = abs(scrollOffset)
            let baseDuration: Double = 0.35
            let maxDuration: Double = 0.6
            let scrollDuration = min(baseDuration + (distance / 3000), maxDuration)
            
            // 隐藏返回顶部按钮（带动画）
            withAnimation(.easeOut(duration: 0.2)) {
                showScrollToTopButton = false
            }
            
            // 阶段2: 开始滚动 - 使用更平滑的动画曲线
            withAnimation(.spring(response: scrollDuration, dampingFraction: 0.85, blendDuration: 0.1)) {
                scrollProxy?.scrollTo("top", anchor: .top)
            }
            
            // 等待滚动动画完成
            let scrollWaitTime = UInt64(scrollDuration * 1_000_000_000)
            try? await Task.sleep(nanoseconds: scrollWaitTime)
            
            // 阶段3: 到达顶部 - 中等触觉反馈，表示"到达"
            viewModel.triggerHaptic(.medium)
            
            // 显示刷新指示器
            withAnimation(.easeInOut(duration: 0.25)) {
                showScrollingIndicator = true
            }
            
            // 短暂停顿，让用户感知"已到达顶部"
            try? await Task.sleep(nanoseconds: 400_000_000)
            
            // 阶段4: 开始刷新
            let success = await viewModel.refreshPosts()
            
            // 隐藏刷新指示器
            withAnimation(.easeInOut(duration: 0.2)) {
                showScrollingIndicator = false
            }
            
            if success {
                // 阶段5: 刷新成功 - 成功触觉反馈
                viewModel.triggerHaptic(.success)
                
                // 显示成功提示（延迟一点，让过渡更自然）
                try? await Task.sleep(nanoseconds: 150_000_000)
                
                withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                    showRefreshSuccess = true
                }
                
                // 自动隐藏成功提示
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                    withAnimation(.easeOut(duration: 0.3)) {
                        showRefreshSuccess = false
                    }
                }
            }
            
            isScrollingToTop = false
        }
    }
    
    // MARK: - Scroll To Top Functions
    private func updateScrollToTopButtonVisibility(offset: CGFloat) {
        // offset 是顶部检测视图在 ScrollView 坐标系中的 minY
        // 初始时 offset 应该接近分类栏高度（约 53px）
        // 当向下滚动时，offset 会变成负值
        // 当 offset < -200 时（考虑分类栏高度），说明已经向下滚动，显示按钮
        
        // 更新滚动偏移量（用于计算动画时长）
        scrollOffset = offset
        
        guard !viewModel.currentPosts.isEmpty && !viewModel.isLoading else {
            // 如果没有数据或正在加载，隐藏按钮
            if showScrollToTopButton {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    showScrollToTopButton = false
                }
            }
            return
        }
        
        let scrollThreshold: CGFloat = -200 // 降低阈值，更容易触发
        let shouldShow = offset < scrollThreshold
        
        if shouldShow != showScrollToTopButton {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                showScrollToTopButton = shouldShow
            }
        }
    }
    
    private func scrollToTop() {
        // 防止重复触发
        guard !isScrollingToTop else { return }
        
        // 点击确认 - 轻触觉反馈
        viewModel.triggerHaptic(.light)
        
        // 立即隐藏按钮（带缩放动画）
        withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
            showScrollToTopButton = false
        }
        
        // 根据滚动距离计算动画时长
        let distance = abs(scrollOffset)
        let baseDuration: Double = 0.35
        let maxDuration: Double = 0.55
        let scrollDuration = min(baseDuration + (distance / 4000), maxDuration)
        
        // 滚动到顶部（使用更平滑的弹簧动画）
        withAnimation(.spring(response: scrollDuration, dampingFraction: 0.88, blendDuration: 0.1)) {
            scrollProxy?.scrollTo("top", anchor: .top)
        }
        
        // 延迟触发到达反馈
        DispatchQueue.main.asyncAfter(deadline: .now() + scrollDuration * 0.9) {
            viewModel.triggerHaptic(.soft)
        }
    }
    
    private var divider: some View {
        Rectangle()
            .frame(height: 0.5)
            .foregroundColor(Color(hex: "#2F3336"))
    }
    
    private var loadingMoreIndicator: some View {
        VStack(spacing: 12) {
            HStack {
                Spacer()
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                    .scaleEffect(1.2)
                Spacer()
            }
            Text("正在加载...")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "#71767A"))
        }
        .padding(.vertical, 20)
        .onAppear {
            Task {
                await viewModel.loadMorePosts()
            }
        }
    }
    
    // MARK: - Category Navigation Bar
    private var categoryNavigationBar: some View {
        HStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 0) {
                        ForEach(HomeCategory.defaultVisible, id: \.self) { category in
                            CategoryButton(
                                title: category.title,
                                isSelected: viewModel.selectedCategory == category
                            ) {
                                if viewModel.selectedCategory == category {
                                    // 再次点击当前分类，回到顶部
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        scrollProxy?.scrollTo("top", anchor: .top)
                                    }
                                    viewModel.triggerHaptic(.light)
                                } else {
                                    viewModel.triggerHaptic(.soft)
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        viewModel.selectedCategory = category
                                    }
                                }
                            }
                            .id("category_\(category.rawValue)")
                        }
                    }
                }
                .onAppear {
                    categoryScrollProxy = proxy
                }
                .onChange(of: viewModel.selectedCategory) { _, newValue in
                    // 选中分类时自动居中滚动
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        proxy.scrollTo("category_\(newValue.rawValue)", anchor: .center)
                    }
                }
            }
            
            searchButton
        }
        .frame(height: 53)
        .background(Color.black)
        .overlay(divider, alignment: .bottom)
    }
    
    private var hotListHeader: some View {
        Button {
            viewModel.triggerHaptic(.light)
            showHotListExplanation = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "#FF6B35"))
                
                Text("8 小时互动热度实时更新")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color(hex: "#71767A"))
                
                Spacer()
                
                HStack(spacing: 4) {
                    Text("规则说明")
                        .font(.system(size: 12))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10))
                }
                .foregroundColor(Color(hex: "#71767A").opacity(0.8))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.05))
            )
            .padding(.horizontal, 12)
            .padding(.top, 12)
            .padding(.bottom, 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var searchButton: some View {
        NavigationLink(destination: SearchView()) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.white)
                .font(.system(size: 20, weight: .medium))
                .frame(width: 44, height: 44)
        }
        .padding(.trailing, 8)
        .simultaneousGesture(
            TapGesture().onEnded {
                viewModel.triggerHaptic(.light)
            }
        )
    }
}

enum HomeCategory: String, CaseIterable {
    case bulletin = "公告板"
    case latest = "最新"
    case follow = "关注"
    case hot = "热榜"
    case talent = "姬圈才艺大赛"
    case verify = "新手区"
    
    var title: String {
        return rawValue
    }
    
    var apiType: String {
        switch self {
        case .bulletin: return "announcement"
        case .latest: return "all"
        case .follow: return "follow"
        case .hot: return "hot"
        case .talent: return "talent"
        case .verify: return "verify"
        }
    }
    
    /// 暂时隐藏的分类
    var isHidden: Bool {
        switch self {
        case .bulletin, .verify, .talent: return true
        default: return false
        }
    }
    
    /// 当前可见的分类
    static var defaultVisible: [HomeCategory] {
        allCases.filter { !$0.isHidden }
    }
}

struct CategoryButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 0) {
                Text(title)
                    .font(.system(size: 15, weight: isSelected ? .bold : .medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                    .scaleEffect(isSelected ? 1.0 : 0.95)
                    .animation(.spring(response: 0.2, dampingFraction: 0.7), value: isSelected)
                
                if isSelected {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color(hex: "#FF6B35"))
                        .frame(height: 4)
                        .padding(.horizontal, 16)
                        .transition(.asymmetric(
                            insertion: .scale.combined(with: .opacity),
                            removal: .scale.combined(with: .opacity)
                        ))
                } else {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.clear)
                        .frame(height: 4)
                        .padding(.horizontal, 16)
                }
            }
        }
        .buttonStyle(CategoryButtonStyle(isSelected: isSelected))
    }
}

struct CategoryButtonStyle: ButtonStyle {
    let isSelected: Bool
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(
                configuration.isPressed ? Color(hex: "#16181C") : Color.clear
            )
            .contentShape(Rectangle())
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Toast Views
struct RefreshSuccessToast: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(Color(hex: "#FF6B35"))
            Text("刷新成功")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(hex: "#16181C"))
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
        .padding(.top, 60)
    }
}

struct ErrorToast: View {
    let message: String
    var icon: String = "exclamationmark.triangle.fill"
    let onDismiss: () -> Void
    
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .foregroundColor(.red)
                .font(.system(size: 16))
            
            Text(message)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
            
            Spacer()
            
            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white.opacity(0.6))
                    .padding(4)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(hex: "#1C1C1E"))
                .shadow(color: .black.opacity(0.4), radius: 12, x: 0, y: 6)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.red.opacity(0.2), lineWidth: 1)
        )
        .padding(.top, 60)
        .padding(.horizontal, 16)
    }
}

// MARK: - 橘气热榜说明弹窗
struct HotListExplanationView: View {
    @Binding var isPresented: Bool
    
    var body: some View {
        ZStack {
            // 背景层：液态模糊
            Rectangle()
                .fill(.ultraThinMaterial)
                .overlay(
                    LinearGradient(
                        colors: [
                            Color(hex: "#FF6B35").opacity(0.1),
                            Color.black.opacity(0.2),
                            Color.purple.opacity(0.05)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .glassEffect(.interactive)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // 标题栏
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("橘气热榜说明")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                        Text("Hot List Algorithm & Rules")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                            .kerning(1)
                    }
                    Spacer()
                    Button {
                        isPresented = false
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(.white.opacity(0.1))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
                .padding(.bottom, 20)
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 28) {
                        // 核心介绍卡片 - 液态玻璃质感
                        VStack(alignment: .leading, spacing: 16) {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle()
                                        .fill(Color(hex: "#FF6B35").opacity(0.2))
                                        .frame(width: 32, height: 32)
                                    Image(systemName: "flame.fill")
                                        .foregroundColor(Color(hex: "#FF6B35"))
                                        .font(.system(size: 16))
                                }
                                Text("关于热榜")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            
                            Text("欢迎了解橘气热榜：我们将正在发生的、被大家喜爱的内容呈现在此，让优质作品在时间流外获得长久驻留。")
                                .font(.system(size: 15))
                                .lineSpacing(6)
                                .foregroundColor(.white.opacity(0.85))
                            
                            Text("让我们在对日常的分享、生活的思考和对不同议题的讨论中沉淀出独属于橘气的社区文化。")
                                .font(.system(size: 14))
                                .lineSpacing(6)
                                .foregroundColor(.white.opacity(0.7))
                                .padding(.top, -4)
                            
                            HStack {
                                Image(systemName: "hand.thumbsup.fill")
                                    .font(.system(size: 12))
                                Text("通过充电、互动给予支持，助力作品上榜")
                                    .font(.system(size: 13, weight: .medium))
                            }
                            .foregroundColor(Color(hex: "#FF6B35"))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(hex: "#FF6B35").opacity(0.1))
                            .cornerRadius(10)
                        }
                        .padding(24)
                        .background(
                            RoundedRectangle(cornerRadius: 24)
                                .fill(.white.opacity(0.05))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 24)
                                        .strokeBorder(.white.opacity(0.1), lineWidth: 1)
                                )
                        )
                        
                        // 算法说明组
                        VStack(alignment: .leading, spacing: 20) {
                            sectionHeader(title: "更新机制", icon: "cpu.fill")
                            
                            VStack(alignment: .leading, spacing: 16) {
                                explanationRow(icon: "bolt.shield.fill", text: "实时计算", subtext: "榜单每分钟自动重算，确保内容最新")
                                explanationRow(icon: "clock.badge.checkmark.fill", text: "热度加权", subtext: "根据最近 8 小时内的互动热度加权排名")
                                explanationRow(icon: "person.2.badge.key.fill", text: "作者去重", subtext: "同一作者仅保留一个最高热度帖子在榜")
                                explanationRow(icon: "doc.text.fill", text: "原创识别", subtext: "仅计入原创动态，转发动态不参与热榜")
                            }
                        }
                        .padding(.horizontal, 4)
                        
                        // 撤榜规则组
                        VStack(alignment: .leading, spacing: 20) {
                            sectionHeader(title: "管理规范", icon: "leaf.fill", color: .green)
                            
                            Text("为维护良好的社区氛围，以下内容可能会被撤榜：")
                                .font(.system(size: 14))
                                .foregroundColor(.white.opacity(0.5))
                                .padding(.leading, 2)
                            
                            VStack(alignment: .leading, spacing: 14) {
                                ruleRow(text: "违反社区公约或国家法律法规的内容")
                                ruleRow(text: "存在恶意刷票、作弊等违规行为的帖子")
                                ruleRow(text: "引发严重割裂或群体对立的争议讨论")
                                ruleRow(text: "低俗擦边或过度私密的个人生活分享")
                            }
                        }
                        .padding(.horizontal, 4)
                        
                        // 底部占位
                        Color.clear.frame(height: 20)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }
        }
    }
    
    private func sectionHeader(title: String, icon: String, color: Color = Color(hex: "#FF6B35")) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(color)
            Text(title)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
            Spacer()
        }
    }
    
    private func explanationRow(icon: String, text: String, subtext: String) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.white.opacity(0.6))
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(text)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                Text(subtext)
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
        .padding(.vertical, 4)
    }
    
    private func ruleRow(text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "minus.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.3))
                .padding(.top, 2)
            
            Text(text)
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.7))
        }
    }
}

// MARK: - First Post Visibility Preference Key
struct FirstPostVisibilityPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

// MARK: - Scroll To Top Button Style
struct ScrollToTopButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Loading Dots Animation View
struct LoadingDotsView: View {
    @State private var isAnimating = false
    
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Color(hex: "#FF6B35"))
                    .frame(width: 6, height: 6)
                    .scaleEffect(isAnimating ? 1.0 : 0.5)
                    .opacity(isAnimating ? 1.0 : 0.4)
                    .animation(
                        .easeInOut(duration: 0.5)
                        .repeatForever(autoreverses: true)
                        .delay(Double(index) * 0.15),
                        value: isAnimating
                    )
            }
        }
        .onAppear {
            isAnimating = true
        }
    }
}
