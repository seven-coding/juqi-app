//
//  TabBarView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI
import UIKit

struct TabBarView: View {
    @State private var selectedTab: TabItem = .home
    @State private var lastNonPublishTab: TabItem = .home
    @State private var showPublishView = false
    @State private var homeNavigationPath = NavigationPath()
    @State private var profileNavigationPath = NavigationPath()
    @State private var discoverNavigationPath = NavigationPath()
    @State private var messageNavigationPath = NavigationPath()
    @State private var isTabBarHidden = false
    @StateObject private var messageViewModel = MessageViewModel()
    @State private var unreadCount: Int = 0
    
    init() {
        Self.configureSystemTabBarAppearance()
    }
    
    var body: some View {
        GeometryReader { geo in
            ZStack {
                TabView(selection: $selectedTab) {
                    // 首页
                    NavigationStack(path: $homeNavigationPath) {
                        HomeView()
                    }
                    .background(TabBarVisibilityReader(isHidden: $isTabBarHidden)
                        .frame(width: 0, height: 0))
                    .background(TabBarTapDetector(
                        selectedTab: $selectedTab,
                        showPublishView: $showPublishView,
                        lastNonPublishTab: $lastNonPublishTab
                    ).frame(width: 0, height: 0))
                    .tag(TabItem.home)
                    .tabItem { Label(TabItem.home.title, systemImage: "house") }
                    
                    // 发现
                    NavigationStack(path: $discoverNavigationPath) {
                        DiscoverView()
                    }
                    .background(TabBarVisibilityReader(isHidden: $isTabBarHidden)
                        .frame(width: 0, height: 0))
                    .tag(TabItem.discover)
                    .tabItem { Label(TabItem.discover.title, systemImage: "safari") }
                    
                    // 发布（保留 Tab 位：点击后弹出发布页）
                    Color.clear
                        .tag(TabItem.publish)
                        .background(TabBarIconCustomizer())
                        .tabItem {
                            Label(TabItem.publish.title, systemImage: "plus.circle.fill")
                        }
                        .accessibilityLabel(Text(TabItem.publish.title))
                    
                    // 消息
                    NavigationStack(path: $messageNavigationPath) {
                        MessageView()
                    }
                    .background(TabBarVisibilityReader(isHidden: $isTabBarHidden)
                        .frame(width: 0, height: 0))
                    .background(TabBarBadgeUpdater(unreadCount: unreadCount)
                        .frame(width: 0, height: 0))
                    .tag(TabItem.message)
                    .tabItem { Label(TabItem.message.title, systemImage: "text.bubble") }
                    
                    // 个人
                    NavigationStack(path: $profileNavigationPath) {
                        ProfileView()
                    }
                    .background(TabBarVisibilityReader(isHidden: $isTabBarHidden)
                        .frame(width: 0, height: 0))
                    .tag(TabItem.profile)
                    .tabItem { Label(TabItem.profile.title, systemImage: "person") }
                }
                .tint(Color(hex: "#FF6B35"))
                .onChange(of: selectedTab) { oldValue, newValue in
                    // 记录最后一个“非发布”的 Tab，用于发布 Tab 自动回弹
                    if newValue != .publish {
                        lastNonPublishTab = newValue
                        return
                    }
                    
                    // 点击“发布”Tab：弹出发布页，并回到上一个 Tab（符合官方 TabView 行为预期）
                    showPublishView = true
                    selectedTab = lastNonPublishTab
                }
                .onChange(of: messageViewModel.navItems) { _, _ in
                    // 当未读消息数变化时，更新 badge
                    unreadCount = calculateUnreadCount()
                }
                .onAppear {
                    // 初始化时计算未读消息数
                    unreadCount = calculateUnreadCount()
                }
                
                
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .sheet(isPresented: $showPublishView, onDismiss: {
            // 关闭发布页后不强制改 Tab；发布成功会由 PublishView 内部切到 .home
        }) {
            PublishView(activeTab: $selectedTab)
        }
    }
    
    // MARK: - 系统 TabBar 液态玻璃（官方控件 + 外观配置）
    private static var didConfigureAppearance = false
    private static func configureSystemTabBarAppearance() {
        guard !didConfigureAppearance else { return }
        didConfigureAppearance = true
        
        let accent = UIColor(Color(hex: "#FF6B35"))
        let normal = UIColor.white.withAlphaComponent(0.65)
        
        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterialDark)
        appearance.backgroundColor = .clear
        appearance.shadowColor = UIColor.white.withAlphaComponent(0.12)
        
        // iOS 的 TabBar 默认是 stacked layout（下方有标题）
        let stacked = appearance.stackedLayoutAppearance
        stacked.normal.iconColor = normal
        stacked.normal.titleTextAttributes = [.foregroundColor: normal]
        stacked.selected.iconColor = accent
        stacked.selected.titleTextAttributes = [.foregroundColor: accent]
        
        UITabBar.appearance().standardAppearance = appearance
        if #available(iOS 15.0, *) {
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
        UITabBar.appearance().isTranslucent = true
    }
    
    // MARK: - 计算未读消息总数
    
    /// 计算总未读消息数
    private func calculateUnreadCount() -> Int {
        return messageViewModel.navItems.reduce(0) { $0 + $1.count }
    }
}

enum TabItem: Hashable {
    case home
    case discover
    case publish
    case message
    case profile
    
    var title: String {
        switch self {
        case .home: return "首页"
        case .discover: return "发现"
        case .publish: return "发布"
        case .message: return "消息"
        case .profile: return "个人"
        }
    }
}

// MARK: - Corner Radius Extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners
    
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

private struct TabBarVisibilityReader: UIViewControllerRepresentable {
    @Binding var isHidden: Bool
    
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = TabBarObserverController()
        controller.view.isHidden = true
        controller.onVisibilityChange = { hidden in
            if hidden != isHidden {
                isHidden = hidden
            }
        }
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if let controller = uiViewController as? TabBarObserverController {
            controller.onVisibilityChange = { hidden in
                if hidden != isHidden {
                    isHidden = hidden
                }
            }
            controller.refreshVisibility()
        }
    }
}

private final class TabBarObserverController: UIViewController {
    var onVisibilityChange: ((Bool) -> Void)?
    private var observations: [NSKeyValueObservation] = []
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startObserving()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopObserving()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        refreshVisibility()
    }
    
    func refreshVisibility() {
        guard let tabBar = tabBarController?.tabBar else { return }
        let containerHeight = tabBar.superview?.bounds.height
            ?? view.window?.windowScene?.screen.bounds.height
            ?? view.window?.bounds.height
            ?? 0
        let offscreen = tabBar.frame.minY >= containerHeight - 1
        let hidden = tabBar.isHidden || tabBar.alpha < 0.01 || tabBar.frame.height < 1 || offscreen
        onVisibilityChange?(hidden)
    }
    
    private func startObserving() {
        guard let tabBar = tabBarController?.tabBar else { return }
        observations = [
            tabBar.observe(\.isHidden, options: [.new]) { [weak self] _, _ in
                self?.refreshVisibility()
            },
            tabBar.observe(\.alpha, options: [.new]) { [weak self] _, _ in
                self?.refreshVisibility()
            },
            tabBar.observe(\.frame, options: [.new]) { [weak self] _, _ in
                self?.refreshVisibility()
            }
        ]
        refreshVisibility()
    }
    
    private func stopObserving() {
        observations.removeAll()
    }
}

// MARK: - TabBar Icon Customizer
private struct TabBarIconCustomizer: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = TabBarIconCustomizerController()
        controller.view.isHidden = true
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if let controller = uiViewController as? TabBarIconCustomizerController {
            controller.customizePublishIcon()
        }
    }
}

private final class TabBarIconCustomizerController: UIViewController {
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        customizePublishIcon()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        customizePublishIcon()
    }
    
    func customizePublishIcon() {
        guard let tabBar = tabBarController?.tabBar,
              let items = tabBar.items,
              items.count > 2 else { return }
        
        // 发布按钮是第三个（索引为 2）
        let publishItem = items[2]
        
        // 创建自定义图标（更大的尺寸和高亮色）
        let highlightColor = UIColor(Color(hex: "#FF6B35"))
        
        // 使用 SymbolConfiguration 设置大小和颜色
        var config = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium, scale: .large)
        if #available(iOS 15.0, *) {
            config = config.applying(UIImage.SymbolConfiguration(paletteColors: [highlightColor]))
        }
        
        if let originalImage = UIImage(systemName: "plus.circle.fill", withConfiguration: config) {
            // 对于 iOS 14 及以下，使用 withTintColor
            let tintedImage: UIImage
            if #available(iOS 15.0, *) {
                tintedImage = originalImage
            } else {
                tintedImage = originalImage.withTintColor(highlightColor, renderingMode: .alwaysOriginal)
            }
            
            publishItem.image = tintedImage
            publishItem.selectedImage = tintedImage
        }
    }
}

// MARK: - TabBar Tap Detector
// 用于检测点击已选中的 Tab（SwiftUI 的 onChange 在值不变时不会触发）
private struct TabBarTapDetector: UIViewControllerRepresentable {
    @Binding var selectedTab: TabItem
    @Binding var showPublishView: Bool
    @Binding var lastNonPublishTab: TabItem
    
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = TabBarTapDetectorController()
        controller.view.isHidden = true
        controller.onHomeTapped = {
            // 发送通知，让 HomeView 执行返回顶部和刷新
            NotificationCenter.default.post(name: NSNotification.Name("HomeTabDoubleTapped"), object: nil)
        }
        controller.onPublishTapped = {
            DispatchQueue.main.async {
                showPublishView = true
            }
        }
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if let controller = uiViewController as? TabBarTapDetectorController {
            controller.currentSelectedIndex = tabItemToIndex(selectedTab)
            controller.onHomeTapped = {
                NotificationCenter.default.post(name: NSNotification.Name("HomeTabDoubleTapped"), object: nil)
            }
            controller.onPublishTapped = {
                DispatchQueue.main.async {
                    showPublishView = true
                }
            }
        }
    }
    
    private func tabItemToIndex(_ item: TabItem) -> Int {
        switch item {
        case .home: return 0
        case .discover: return 1
        case .publish: return 2
        case .message: return 3
        case .profile: return 4
        }
    }
}

private final class TabBarTapDetectorController: UIViewController, UITabBarControllerDelegate {
    var onHomeTapped: (() -> Void)?
    var onPublishTapped: (() -> Void)?
    var currentSelectedIndex: Int = 0
    private weak var previousDelegate: UITabBarControllerDelegate?
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        setupDelegate()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        restoreDelegate()
    }
    
    private func setupDelegate() {
        guard let tabBarController = tabBarController else { return }
        previousDelegate = tabBarController.delegate
        tabBarController.delegate = self
    }
    
    private func restoreDelegate() {
        tabBarController?.delegate = previousDelegate
    }
    
    // MARK: - UITabBarControllerDelegate
    func tabBarController(_ tabBarController: UITabBarController, shouldSelect viewController: UIViewController) -> Bool {
        guard let viewControllers = tabBarController.viewControllers,
              let index = viewControllers.firstIndex(of: viewController) else {
            return true
        }
        
        // 如果点击的是发布按钮（索引 2）
        if index == 2 {
            onPublishTapped?()
            return false // 阻止切换到发布 tab
        }
        
        // 如果点击的是已选中的首页 tab（索引 0）
        if index == 0 && tabBarController.selectedIndex == 0 {
            onHomeTapped?()
            return true
        }
        
        return true
    }
}

// MARK: - TabBar Badge Updater
// 用于更新消息 tab 的未读消息数 badge
private struct TabBarBadgeUpdater: UIViewControllerRepresentable {
    let unreadCount: Int
    
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = TabBarBadgeUpdaterController()
        controller.view.isHidden = true
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if let controller = uiViewController as? TabBarBadgeUpdaterController {
            controller.updateBadge(unreadCount: unreadCount)
        }
    }
}

private final class TabBarBadgeUpdaterController: UIViewController {
    private var currentUnreadCount: Int = 0
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        updateBadge(unreadCount: currentUnreadCount)
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateBadge(unreadCount: currentUnreadCount)
    }
    
    func updateBadge(unreadCount: Int) {
        currentUnreadCount = unreadCount
        guard let tabBar = tabBarController?.tabBar,
              let items = tabBar.items,
              items.count > 3 else { return }
        
        // 消息按钮是第四个（索引为 3）
        let messageItem = items[3]
        
        // 根据未读消息数设置 badge
        if unreadCount <= 0 {
            // 无未读不显示
            messageItem.badgeValue = nil
        } else if unreadCount <= 99 {
            // 有未读且小于等于99，显示红点数字
            messageItem.badgeValue = "\(unreadCount)"
        } else {
            // 大于99显示99+
            messageItem.badgeValue = "99+"
        }
    }
}
