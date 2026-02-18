//
//  PostCardView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct CardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(configuration.isPressed ? Color(hex: "#16181C") : Color.black)
            .contentShape(Rectangle())
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct PostCardView: View {
    let post: Post
    /// 由父视图在懒容器外处理导航时传入，避免 navigationDestination 放在 List/LazyVStack 内的警告
    var onNavigateToDetail: ((Post) -> Void)? = nil
    var onNavigateToUser: ((String) -> Void)? = nil
    var onNavigateToTopic: ((String) -> Void)? = nil
    /// 当前所在话题名（如话题详情页）。点击同一话题时不导航，避免重复打开同一页（业内通用：同上下文不二次导航）
    var currentTopicName: String? = nil

    @State private var isLiked = false
    @State private var isCollected = false
    @State private var isReposted = false
    @State private var isCharged = false
    @State private var isExpanded = false
    @State private var selectedImageIndex: Int = 0
    @State private var showImagePreview = false
    @State private var isNavigatingToDetail = false
    @State private var navigationTopic: String? = nil
    @State private var navigationUser: String? = nil

    /// 是否由本视图自己处理导航（未传回调时），用于条件性添加 navigationDestination
    private var useLocalNavigation: Bool {
        onNavigateToDetail == nil && onNavigateToUser == nil && onNavigateToTopic == nil
    }

    private let maxCollapsedLines = 5
    
    // MARK: - 转发内容区域 (匹配截图样式)
    private func repostSection(_ repost: Post.RepostPost) -> some View {
        Button(action: {
            if let onNavigateToDetail { onNavigateToDetail(post) } else { isNavigatingToDetail = true }
        }) {
            HStack(spacing: 12) {
                // 被转发人头像（可点击跳转）
                Button(action: {
                    let uid = repost.userId ?? ""
                    if let onNavigateToUser { onNavigateToUser(uid) } else { navigationUser = uid }
                }) {
                    AsyncImage(url: URL(string: repost.userAvatar ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color(hex: "#2F3336"))
                    }
                    .frame(width: 44, height: 44)
                    .cornerRadius(4)
                    .clipped()
                }
                .buttonStyle(PlainButtonStyle())
                
                VStack(alignment: .leading, spacing: 4) {
                    // 被转发人名称 (白色加粗，可点击跳转)
                    Button(action: {
                        let uid = repost.userId ?? ""
                        if let onNavigateToUser { onNavigateToUser(uid) } else { navigationUser = uid }
                    }) {
                        Text(repost.userName)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // 被转发内容预览 (灰色，点击进入详情)
                    Text(repost.content)
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#71767A"))
                        .lineLimit(1)
                }
                
                Spacer()
            }
            .padding(12)
            .background(Color(hex: "#16181C"))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color(hex: "#2F3336"), lineWidth: 0.5)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top, spacing: 12) {
                    // 左侧头像（独立点击事件）
                    VStack {
                        Button(action: {
                            if let onNavigateToUser { onNavigateToUser(post.userId) } else { navigationUser = post.userId }
                        }) {
                            AsyncImage(url: URL(string: post.userAvatar ?? "")) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Circle()
                                    .fill(Color(hex: "#2F3336"))
                                    .overlay(
                                        Text(post.userName.isEmpty ? "匿" : String(post.userName.prefix(1)))
                                            .foregroundColor(.white)
                                            .font(.system(size: 18, weight: .medium))
                                    )
                            }
                        }
                        .frame(width: 48, height: 48)
                        .clipShape(Circle())
                        .buttonStyle(PlainButtonStyle())
                        
                        Spacer()
                    }
                    
                    // 右侧内容区域（整块可点击进详情，图片/头像/按钮等子视图优先响应）
                    VStack(alignment: .leading, spacing: 8) {
                        // 用户名（加粗高亮，带VIP标识）
                        HStack(alignment: .center, spacing: 6) {
                            Button(action: {
                                if let onNavigateToUser { onNavigateToUser(post.userId) } else { navigationUser = post.userId }
                            }) {
                                Text(post.userName.isEmpty ? "匿名用户" : post.userName)
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(Color(hex: "#FF6B35"))
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            // VIP标识
                            if post.isVip {
                                Image(systemName: "crown.fill")
                                    .foregroundColor(Color(hex: "#FFD700") )
                                    .font(.system(size: 12))
                            }
                            
                            Spacer()
                        }
                    
                        // 个人简介（单独一行）
                        if let signature = post.userSignature, !signature.isEmpty {
                            Text(signature)
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "#71767A"))
                                .lineLimit(1)
                        }
                        
                        // 内容
                        VStack(alignment: .leading, spacing: 4) {
                            if isExpanded {
                                // 展开状态：显示全部内容
                                RichTextView(text: post.content, mentionedUsers: post.mentionedUsers, currentTopicName: currentTopicName)
                            } else {
                                // 折叠状态：最多显示5行
                                RichTextView(text: post.content, mentionedUsers: post.mentionedUsers, currentTopicName: currentTopicName)
                                    .lineLimit(maxCollapsedLines)
                            }
                            
                            // 判断是否需要显示【全文】按钮
                            if post.content.count > 200 {
                                Button(action: {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        isExpanded.toggle()
                                    }
                                }) {
                                    Text(isExpanded ? "收起" : "全文")
                                        .font(.system(size: 15))
                                        .foregroundColor(Color(hex: "#FF6B35"))
                                        .padding(.top, 2)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.top, 2)
                        
                        // 图片网格
                        if let images = post.images, !images.isEmpty {
                            ImageGridView(images: images) { index in
                                selectedImageIndex = index
                                showImagePreview = true
                            }
                            .padding(.top, 4)
                        }
                        
                        // 转发内容
                        if let repost = post.repostPost {
                            repostSection(repost)
                                .padding(.top, 8)
                        }
                        
                        // 底部信息栏：时间和互动按钮 (匹配首页样式)
                        HStack(spacing: 0) {
                            // 发帖时间
                            Text(post.timeAgo)
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "#71767A"))
                                .frame(width: 80, alignment: .leading)
                            
                            Spacer()
                            
                            // 互动按钮组
                            HStack(spacing: 20) {
                                // 转发
                                InteractionButton(
                                    icon: "arrow.2.squarepath",
                                    count: post.shareCount,
                                    color: isReposted ? .green : Color(hex: "#71767A"),
                                    action: {
                                        let generator = UIImpactFeedbackGenerator(style: .light)
                                        generator.impactOccurred()
                                        Task {
                                            do {
                                                _ = try await APIService.shared.repostDyn(id: post.id)
                                                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                                    isReposted.toggle()
                                                }
                                            } catch {
                                                print("Failed to repost: \(error)")
                                            }
                                        }
                                    }
                                )
                                
                                // 评论
                                InteractionButton(
                                    icon: "bubble.right",
                                    count: post.commentCount,
                                    color: Color(hex: "#71767A"),
                                    action: {
                                        if let onNavigateToDetail { onNavigateToDetail(post) } else { isNavigatingToDetail = true }
                                    }
                                )
                                
                                // 充电
                                ChargeButton(
                                    isCharged: isCharged,
                                    count: post.chargeCount,
                                    onCharge: {
                                        let generator = UIImpactFeedbackGenerator(style: .medium)
                                        generator.impactOccurred()
                                    },
                                    action: {
                                        let generator = UIImpactFeedbackGenerator(style: .medium)
                                        generator.impactOccurred()
                                        Task {
                                            do {
                                                _ = try await APIService.shared.chargeDyn(id: post.id)
                                                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                                    isCharged.toggle()
                                                }
                                            } catch {
                                                print("Failed to charge: \(error)")
                                            }
                                        }
                                    }
                                )
                            }
                        }
                        .padding(.top, 8)
                    }
                    .padding(.trailing, 4)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .contentShape(Rectangle())
                .onTapGesture {
                    if let onNavigateToDetail { onNavigateToDetail(post) } else { isNavigatingToDetail = true }
                }
            }
            .background(Color.black)
            
            // 底部分割线
            Rectangle()
                .frame(height: 0.5)
                .foregroundColor(Color(hex: "#2F3336"))
        }
        .onAppear {
            isLiked = post.isLiked
            isCollected = post.isCollected
            isCharged = post.isCharged
        }
        .fullScreenCover(isPresented: $showImagePreview) {
            if let images = post.images {
                ImagePreviewView(images: images, currentIndex: selectedImageIndex)
            }
        }
        .environment(\.openURL, OpenURLAction { url in
            if url.scheme == "juqi" {
                let host = url.host ?? ""
                let path = url.path.replacingOccurrences(of: "/", with: "").removingPercentEncoding ?? ""
                if host == "user" {
                    if let onNavigateToUser { onNavigateToUser(path); return .handled }
                    navigationUser = path
                    return .handled
                } else if host == "topic" {
                    let pathTopic = path.trimmingCharacters(in: .whitespaces)
                    if let cur = currentTopicName?.trimmingCharacters(in: .whitespaces), !cur.isEmpty, pathTopic == cur {
                        return .handled
                    }
                    if let onNavigateToTopic { onNavigateToTopic(path); return .handled }
                    navigationTopic = path
                    return .handled
                }
                return .handled
            }
            return .systemAction
        })
        .modifier(PostCardNavigationDestinations(
            useLocal: useLocalNavigation,
            post: post,
            isNavigatingToDetail: $isNavigatingToDetail,
            navigationUser: $navigationUser,
            navigationTopic: $navigationTopic
        ))
    }
}

// MARK: - 仅在不使用父级导航回调时添加 navigationDestination，避免放在 LazyVStack 内触发警告
private struct PostCardNavigationDestinations: ViewModifier {
    let useLocal: Bool
    let post: Post
    @Binding var isNavigatingToDetail: Bool
    @Binding var navigationUser: String?
    @Binding var navigationTopic: String?

    func body(content: Content) -> some View {
        if useLocal {
            content
                .navigationDestination(isPresented: $isNavigatingToDetail) {
                    PostDetailView(post: post)
                }
                .navigationDestination(isPresented: Binding(get: { navigationUser != nil }, set: { if !$0 { navigationUser = nil } })) {
                    if let userId = navigationUser {
                        UserProfileView(userId: userId, userName: "")
                    }
                }
                .navigationDestination(isPresented: Binding(get: { navigationTopic != nil }, set: { if !$0 { navigationTopic = nil } })) {
                    if let topicName = navigationTopic {
                        TopicDetailView(topicName: topicName)
                    }
                }
        } else {
            content
        }
    }
}

// MARK: - Interaction Button Component
struct InteractionButton: View {
    let icon: String
    let count: Int?
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.system(size: 16))
                
                if let count = count, count > 0 {
                    Text("\(count)")
                        .font(.system(size: 13))
                        .foregroundColor(color)
                }
            }
            .frame(minWidth: 44)
        }
    }
}

// MARK: - Charge Button Component (Battery Icon)
struct ChargeButton: View {
    let isCharged: Bool
    let count: Int
    var onCharge: (() -> Void)? = nil
    let action: () -> Void
    
    // 计算显示的充电人数：如果用户已充电，至少显示1；否则显示实际人数
    private var displayCount: Int {
        if isCharged {
            return max(count, 1) // 已充电时至少显示1
        }
        return count
    }
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                // 电池图标（已充电时显示满电，未充电时显示空电）
                Image(systemName: isCharged ? "battery.100" : "battery.0")
                    .foregroundColor(isCharged ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                    .font(.system(size: 16))
                
                // 显示充电人数（如果有充电人数或已充电）
                if displayCount > 0 {
                    Text("\(displayCount)")
                        .font(.system(size: 13))
                        .foregroundColor(isCharged ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                }
            }
            .frame(minWidth: 44)
        }
    }
}

// MARK: - Image Grid View（按 1/2/3/4/多图 分别优化布局与位置）
struct ImageGridView: View {
    let images: [String]
    var onImageClick: ((Int) -> Void)? = nil
    
    private let spacing: CGFloat = 4
    /// 列表内卡片内容区最大宽度（与 PostCard 左侧头像+间距后的可用宽度一致，避免使用已废弃的 UIScreen.main）
    private let gridMaxWidth: CGFloat = 280
    
    /// 根据张数计算网格总高度，避免 GeometryReader 导致占位异常
    private var gridHeight: CGFloat {
        switch images.count {
        case 1: return 220
        case 2: return 160
        case 3: return 110
        case 4: return 2 * 120 + spacing
        case 5, 6: return 2 * 100 + spacing
        default: return 3 * 100 + 2 * spacing
        }
    }
    
    private var twoColumns: [GridItem] {
        [GridItem(.flexible(), spacing: spacing), GridItem(.flexible(), spacing: spacing)]
    }
    
    private var threeColumns: [GridItem] {
        [GridItem(.flexible(), spacing: spacing), GridItem(.flexible(), spacing: spacing), GridItem(.flexible(), spacing: spacing)]
    }
    
    var body: some View {
        Group {
            switch images.count {
            case 1:
                singleImageView
            case 2:
                twoImagesView
            case 3:
                threeImagesView
            case 4:
                fourImagesView
            default:
                multiImagesView
            }
        }
        .frame(maxWidth: gridMaxWidth, alignment: .leading)
        .frame(height: gridHeight)
        .clipped()
    }
    
    // 单图：限制最大宽高，保持比例不裁切，靠左对齐
    private var singleImageView: some View {
        imageView(url: images[0], index: 0, aspectMode: .fit, maxWidth: gridMaxWidth, maxHeight: 220, alignment: .leading)
            .frame(maxWidth: gridMaxWidth, maxHeight: 220, alignment: .leading)
    }
    
    // 两图：左右等分，固定高度
    private var twoImagesView: some View {
        HStack(spacing: spacing) {
            ForEach(Array(0..<2), id: \.self) { index in
                imageView(url: images[index], index: index, aspectMode: .fill, fixedWidth: (gridMaxWidth - spacing) / 2, fixedHeight: 160)
            }
        }
        .frame(width: gridMaxWidth, height: 160, alignment: .leading)
    }
    
    // 三图：一行三等分
    private var threeImagesView: some View {
        HStack(spacing: spacing) {
            ForEach(Array(0..<3), id: \.self) { index in
                imageView(url: images[index], index: index, aspectMode: .fill, fixedWidth: (gridMaxWidth - 2 * spacing) / 3, fixedHeight: 110)
            }
        }
        .frame(width: gridMaxWidth, height: 110, alignment: .leading)
    }
    
    // 四图：2x2
    private var fourImagesView: some View {
        let side = (gridMaxWidth - spacing) / 2
        return LazyVGrid(columns: twoColumns, spacing: spacing) {
            ForEach(Array(0..<4), id: \.self) { index in
                imageView(url: images[index], index: index, aspectMode: .fill, fixedWidth: side, fixedHeight: 120)
            }
        }
        .frame(width: gridMaxWidth, height: 2 * 120 + spacing, alignment: .leading)
    }
    
    // 5～9 图：3 列网格
    private var multiImagesView: some View {
        let count = min(images.count, 9)
        let rows = (count + 2) / 3
        let cellW = (gridMaxWidth - 2 * spacing) / 3
        let cellH: CGFloat = 100
        let totalH = CGFloat(rows) * cellH + CGFloat(rows - 1) * spacing
        return LazyVGrid(columns: threeColumns, spacing: spacing) {
            ForEach(Array(0..<count), id: \.self) { index in
                imageView(url: images[index], index: index, aspectMode: .fill, fixedWidth: cellW, fixedHeight: cellH)
            }
        }
        .frame(width: gridMaxWidth, height: totalH, alignment: .leading)
    }
    
    enum AspectMode {
        case fill, fit
    }
    
    private func imageView(
        url: String,
        index: Int,
        aspectMode: AspectMode,
        maxWidth: CGFloat? = nil,
        maxHeight: CGFloat? = nil,
        fixedWidth: CGFloat? = nil,
        fixedHeight: CGFloat? = nil,
        alignment: Alignment = .center
    ) -> some View {
        let content = LazyAsyncImage(url: url) { image in
            image
                .resizable()
                .aspectRatio(contentMode: aspectMode == .fill ? .fill : .fit)
        } placeholder: {
            Rectangle()
                .fill(Color(hex: "#2F3336"))
                .overlay(
                    ProgressView()
                        .tint(Color(hex: "#FF6B35"))
                        .scaleEffect(0.8)
                )
        }
        return content
            .frame(width: fixedWidth, height: fixedHeight, alignment: .center)
            .frame(maxWidth: maxWidth, maxHeight: maxHeight, alignment: alignment)
            .cornerRadius(5)
            .clipped()
            .contentShape(Rectangle())
            .onTapGesture { onImageClick?(index) }
    }
}

extension View {
    @ViewBuilder
    func ifLet<V, T>(_ value: T?, transform: (Self, T) -> V) -> some View where V: View {
        if let value = value {
            transform(self, value)
        } else {
            self
        }
    }
}

