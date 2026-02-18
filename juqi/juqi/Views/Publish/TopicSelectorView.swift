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
    @State private var isCreatingTopic = false
    @State private var createTopicError: String?
    
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
            } else if isSearching && topicList.isEmpty && !searchText.trimmingCharacters(in: .whitespaces).isEmpty {
                // 搜索无结果：提供创建话题
                VStack(alignment: .leading, spacing: 12) {
                    if let err = createTopicError {
                        Text(err)
                            .font(.system(size: 12))
                            .foregroundColor(.red.opacity(0.9))
                            .padding(.horizontal, 24)
                    }
                    Button(action: { Task { await createTopicAndSelect() } }) {
                        HStack(spacing: 8) {
                            if isCreatingTopic {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundColor(Color(hex: "#FF6B35"))
                            }
                            Text("创建话题「#\(searchText.trimmingCharacters(in: .whitespaces))#」")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(12)
                    }
                    .disabled(isCreatingTopic)
                    .padding(.horizontal, 20)
                }
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    Text("推荐话题")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.4))
                        .padding(.horizontal, 24)
                    
                    if topicList.isEmpty && !isLoading {
                        Text("暂无推荐话题，可搜索或直接输入创建")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.35))
                            .padding(.horizontal, 24)
                            .padding(.vertical, 8)
                    } else {
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
        createTopicError = nil
        do {
            topicList = try await APIService.shared.searchTopic(keyword: searchText)
        } catch {
            print(error)
        }
        isLoading = false
    }

    /// 创建当前搜索词为话题并选中
    private func createTopicAndSelect() async {
        let name = searchText.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        isCreatingTopic = true
        createTopicError = nil
        defer { isCreatingTopic = false }
        do {
            let created = try await APIService.shared.createTopic(name: name)
            await MainActor.run {
                toggleTopic(created.name)
                topicList = [created]
                searchText = ""
                isSearching = false
            }
        } catch {
            await MainActor.run {
                createTopicError = (error as? APIError)?.localizedDescription ?? "创建失败，请重试"
            }
        }
    }
    
    private func removeTopic(_ topic: String) {
        selectedTopics.removeAll { $0 == topic }
    }
}
