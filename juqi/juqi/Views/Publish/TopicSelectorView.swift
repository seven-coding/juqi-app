//
//  TopicSelectorView.swift
//  juqi
//

import SwiftUI

struct TopicSelectorView: View {
    @Binding var selectedTopics: [String]
    var onSelect: ((String) -> Void)? = nil
    @State private var searchText: String = ""
    @State private var topicList: [Topic] = []
    @State private var isLoading = false
    @State private var isSearching = false
    
    let recommendedTopics = ["我的年末存档", "你好2025", "日常", "橘友集结"]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // 搜索或创建话题输入
            HStack(spacing: 12) {
                Image(systemName: "number")
                    .foregroundColor(Color(hex: "#FF6B35"))
                    .font(.system(size: 16, weight: .bold))
                
                TextField("搜索或创建话题", text: $searchText)
                    .font(.system(size: 15))
                    .foregroundColor(.white)
                    .onSubmit {
                        if !searchText.isEmpty {
                            Task { await searchTopics() }
                        }
                    }
                
                if !searchText.isEmpty {
                    Button(action: { 
                        withAnimation {
                            searchText = ""
                            isSearching = false 
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white.opacity(0.3))
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.white.opacity(0.05))
            .cornerRadius(14)
            .padding(.horizontal, 20)
            
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if isSearching && !topicList.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(topicList) { topic in
                            topicChip(topic.name, isSelected: selectedTopics.contains(topic.name)) {
                                toggleTopic(topic.name)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                }
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    Text("推荐话题")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.4))
                        .padding(.horizontal, 24)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(recommendedTopics, id: \.self) { topic in
                                topicChip(topic, isSelected: selectedTopics.contains(topic)) {
                                    toggleTopic(topic)
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                }
            }
            
            // 已选话题列表 (如果需要在此展示)
            if !selectedTopics.isEmpty && !isSearching {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(selectedTopics, id: \.self) { topic in
                            HStack(spacing: 6) {
                                Text("#\(topic)#")
                                    .font(.system(size: 13, weight: .semibold))
                                Button(action: { withAnimation { removeTopic(topic) } }) {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 10, weight: .bold))
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(hex: "#FF6B35"))
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
        .onAppear {
            Task { await loadRecommendedTopics() }
        }
    }
    
    private func topicChip(_ name: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text("#\(name)#")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? .white : .white.opacity(0.7))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? Color(hex: "#FF6B35") : Color.white.opacity(0.08))
                .cornerRadius(12)
        }
    }
    
    private func toggleTopic(_ topic: String) {
        if let onSelect = onSelect {
            onSelect(topic)
            return
        }
        withAnimation(.spring(response: 0.3)) {
            if selectedTopics.contains(topic) {
                selectedTopics.removeAll { $0 == topic }
            } else {
                selectedTopics.append(topic)
            }
        }
    }
    
    private func loadRecommendedTopics() async {
        isLoading = true
        do {
            topicList = try await APIService.shared.getTopicList()
        } catch {
            print(error)
        }
        isLoading = false
    }
    
    private func searchTopics() async {
        isSearching = true
        isLoading = true
        do {
            topicList = try await APIService.shared.searchTopic(keyword: searchText)
        } catch {
            print(error)
        }
        isLoading = false
    }
    
    private func removeTopic(_ topic: String) {
        selectedTopics.removeAll { $0 == topic }
    }
}
