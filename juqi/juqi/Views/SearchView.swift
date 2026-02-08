//
//  SearchView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct SearchView: View {
    @State private var searchText: String = ""
    @State private var selectedCategory: SearchCategory = .users
    @State private var searchResults: SearchResults = SearchResults()
    @State private var isLoading = false
    @State private var hasSearched = false
    @FocusState private var isSearchFieldFocused: Bool
    
    enum SearchCategory: String, CaseIterable {
        case users = "用户"
        case content = "内容"
        case topics = "话题"
    }
    
    struct SearchResults {
        var users: [User] = []
        var posts: [Post] = []
        var topics: [Topic] = []
        var hasMore: Bool = false
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // 搜索栏
            searchBar
            
            // 分类选择器
            categoryPicker
            
            // 搜索结果
            searchContent
        }
        .background(Color.black)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("搜索")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
            }
        }
        .toolbar(.hidden, for: .tabBar)
        .task {
            // 延迟设置焦点，确保视图完全加载后获得焦点
            try? await Task.sleep(nanoseconds: 100_000_000) // 0.1秒延迟
            isSearchFieldFocused = true
        }
    }
    
    // MARK: - Search Bar
    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(Color(hex: "#71767A"))
                .font(.system(size: 16))
            
            TextField("搜索用户、内容、话题", text: $searchText)
                .font(.system(size: 16))
                .foregroundColor(.white)
                .focused($isSearchFieldFocused)
                .tint(Color(hex: "#FF6B35")) // 设置光标颜色为高亮色
                .onSubmit {
                    performSearch()
                }
                .onChange(of: searchText) { oldValue, newValue in
                    if newValue.isEmpty {
                        searchResults = SearchResults()
                        hasSearched = false
                    }
                }
            
            // 清除按钮或搜索按钮
            if !searchText.isEmpty {
                HStack(spacing: 8) {
                    Button(action: {
                        searchText = ""
                        searchResults = SearchResults()
                        hasSearched = false
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Color(hex: "#71767A"))
                            .font(.system(size: 16))
                    }
                    
                    Button(action: {
                        performSearch()
                    }) {
                        Text("搜索")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(Color(hex: "#FF6B35"))
                    }
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(hex: "#16181C"))
        .cornerRadius(10)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.black)
    }
    
    // MARK: - Category Picker (采用和首页一致的设计)
    private var categoryPicker: some View {
        HStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 0) {
                    ForEach(SearchCategory.allCases, id: \.self) { category in
                        SearchCategoryButton(
                            title: category.rawValue,
                            isSelected: selectedCategory == category
                        ) {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedCategory = category
                                // 切换分类时清空其他分类的搜索结果，避免显示混乱
                                if hasSearched {
                                    switch category {
                                    case .users:
                                        searchResults.posts = []
                                        searchResults.topics = []
                                    case .content:
                                        searchResults.users = []
                                        searchResults.topics = []
                                    case .topics:
                                        searchResults.users = []
                                        searchResults.posts = []
                                    }
                                }
                            }
                            if hasSearched && !searchText.isEmpty {
                                performSearch()
                            }
                        }
                    }
                }
            }
        }
        .frame(height: 53)
        .background(Color.black)
        .overlay(divider, alignment: .bottom)
    }
    
    // MARK: - Search Content
    @ViewBuilder
    private var searchContent: some View {
        if isLoading {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if !hasSearched {
            // 未搜索状态 - 显示占位内容
            VStack(spacing: 20) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundColor(Color(hex: "#71767A"))
                
                Text("搜索用户、内容或话题")
                    .font(.system(size: 16))
                    .foregroundColor(Color(hex: "#71767A"))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if searchText.isEmpty {
            // 搜索文本为空
            VStack(spacing: 20) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundColor(Color(hex: "#71767A"))
                
                Text("请输入搜索关键词")
                    .font(.system(size: 16))
                    .foregroundColor(Color(hex: "#71767A"))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            // 显示搜索结果
            ScrollView {
                LazyVStack(spacing: 0) {
                    Group {
                        switch selectedCategory {
                        case .users:
                            if !searchResults.users.isEmpty {
                                SectionHeader(title: "用户", count: searchResults.users.count)
                                ForEach(searchResults.users) { user in
                                    UserSearchResultRow(user: user)
                                        .overlay(divider, alignment: .bottom)
                                }
                            } else if hasSearched {
                                SearchEmptyStateView(message: "未找到相关用户")
                            }
                            
                        case .content:
                            if !searchResults.posts.isEmpty {
                                SectionHeader(title: "内容", count: searchResults.posts.count)
                                ForEach(searchResults.posts) { post in
                                    PostCardView(post: post)
                                        .overlay(divider, alignment: .bottom)
                                }
                            } else if hasSearched {
                                SearchEmptyStateView(message: "未找到相关内容")
                            }
                            
                        case .topics:
                            if !searchResults.topics.isEmpty {
                                SectionHeader(title: "话题", count: searchResults.topics.count)
                                ForEach(searchResults.topics) { topic in
                                    TopicSearchResultRow(topic: topic)
                                        .overlay(divider, alignment: .bottom)
                                }
                            } else if hasSearched {
                                SearchEmptyStateView(message: "未找到相关话题")
                            }
                        }
                    }
                }
            }
        }
    }
    
    private var divider: some View {
        Rectangle()
            .frame(height: 0.5)
            .foregroundColor(Color(hex: "#2F3336"))
    }
    
    // MARK: - Search Function
    private func performSearch() {
        guard !searchText.trimmingCharacters(in: .whitespaces).isEmpty else {
            return
        }
        
        hasSearched = true
        isLoading = true
        
        // 只清空当前分类的搜索结果，保留其他分类（虽然不会显示）
        switch selectedCategory {
        case .users:
            searchResults.users = []
            searchResults.posts = []
            searchResults.topics = []
        case .content:
            searchResults.posts = []
            searchResults.users = []
            searchResults.topics = []
        case .topics:
            searchResults.topics = []
            searchResults.users = []
            searchResults.posts = []
        }
        
        Task {
            do {
                switch selectedCategory {
                case .users:
                    let users = try await searchUsers()
                    await MainActor.run {
                        searchResults.users = users
                        searchResults.posts = []
                        searchResults.topics = []
                        isLoading = false
                    }
                    
                case .content:
                    let posts = try await searchContent()
                    await MainActor.run {
                        searchResults.posts = posts.list
                        searchResults.hasMore = posts.hasMore
                        searchResults.users = []
                        searchResults.topics = []
                        isLoading = false
                    }
                    
                case .topics:
                    let topics = try await searchTopics()
                    await MainActor.run {
                        searchResults.topics = topics
                        searchResults.users = []
                        searchResults.posts = []
                        isLoading = false
                    }
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    print("Search error: \(error)")
                }
            }
        }
    }
    
    private func searchUsers() async throws -> [User] {
        return try await APIService.shared.searchUser(keyword: searchText)
    }
    
    private func searchContent() async throws -> DynListResponse {
        return try await APIService.shared.searchContent(keyword: searchText)
    }
    
    private func searchTopics() async throws -> [Topic] {
        return try await APIService.shared.searchTopic(keyword: searchText)
    }
}

// MARK: - Search Category Button (采用和首页一致的设计)
struct SearchCategoryButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 0) {
                Text(title)
                    .font(.system(size: 15, weight: isSelected ? .bold : .medium))
                    .foregroundColor(.white) // 保持白色
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                
                if isSelected {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color(hex: "#FF6B35"))
                        .frame(height: 4)
                        .padding(.horizontal, 16)
                }
            }
        }
    }
}

// MARK: - Section Header
struct SectionHeader: View {
    let title: String
    let count: Int
    
    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(.white)
            
            Text("\(count)")
                .font(.system(size: 15))
                .foregroundColor(Color(hex: "#71767A"))
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.black)
    }
}

// MARK: - User Search Result Row
struct UserSearchResultRow: View {
    let user: User
    
    var body: some View {
        NavigationLink(destination: UserProfileView(userId: user.id, userName: user.userName)) {
            HStack(spacing: 12) {
                // 头像
                AsyncImage(url: URL(string: user.avatar ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(hex: "#2F3336"))
                        .overlay(
                            Text(user.userName.isEmpty ? "匿" : String(user.userName.prefix(1)))
                                .foregroundColor(.white)
                                .font(.system(size: 18, weight: .medium))
                        )
                }
                .frame(width: 48, height: 48)
                .clipShape(Circle())
                
                // 用户信息
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(user.userName.isEmpty ? "匿名用户" : user.userName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                        
                        if user.isVip {
                            Image(systemName: "crown.fill")
                                .foregroundColor(Color(hex: "#FFD700"))
                                .font(.system(size: 12))
                        }
                    }
                    
                    if let signature = user.signature, !signature.isEmpty {
                        Text(signature)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                            .lineLimit(1)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(Color(hex: "#71767A"))
                    .font(.system(size: 14))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Topic Search Result Row
struct TopicSearchResultRow: View {
    let topic: Topic
    
    var body: some View {
        NavigationLink(destination: TopicDetailView(topicName: topic.name)) {
            HStack(spacing: 12) {
                // 话题图标
                Image(systemName: "number")
                    .foregroundColor(Color(hex: "#FF6B35"))
                    .font(.system(size: 20, weight: .bold))
                    .frame(width: 48, height: 48)
                    .background(Color(hex: "#FF6B35").opacity(0.15))
                    .clipShape(Circle())
                
                // 话题信息
                VStack(alignment: .leading, spacing: 4) {
                    Text("#\(topic.name)#")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(Color(hex: "#71767A"))
                    .font(.system(size: 14))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Search Empty State View
struct SearchEmptyStateView: View {
    let message: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(Color(hex: "#71767A"))
            
            Text(message)
                .font(.system(size: 16))
                .foregroundColor(Color(hex: "#71767A"))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}
