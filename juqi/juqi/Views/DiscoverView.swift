//
//  DiscoverView.swift
//  juqi
//
//  发现页：橘气电站列表，点击进入电站主页。
//

import SwiftUI

struct DiscoverView: View {
    @State private var items: [CircleItem] = []
    @State private var isLoading = false
    @State private var lastError: APIError?

    var body: some View {
        ZStack {
            Color(hex: "#000000")
                .ignoresSafeArea()

            if isLoading && items.isEmpty {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                    .scaleEffect(1.2)
            } else if let error = lastError, items.isEmpty {
                fullScreenErrorView(error)
            } else if items.isEmpty {
                emptyStateView
            } else {
                listContent
            }
        }
        .navigationTitle("发现")
        .navigationBarTitleDisplayMode(.inline)
        .task(loadCircles)
    }

    /// 列表：左侧正方形封面 + 名称（白）+ 介绍（灰，最多3行），右侧箭头
    private var listContent: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(items) { item in
                    NavigationLink(destination: CircleDetailView(circleId: item.id, circleTitle: item.title)) {
                        HStack(alignment: .center, spacing: 12) {
                            circleThumbnail(url: item.imageSmall, title: item.title)
                            VStack(alignment: .leading, spacing: 6) {
                                Text(item.title)
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                                if let desc = item.desc, !desc.isEmpty {
                                    Text(desc)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(Color(hex: "#A49F9A"))
                                        .lineLimit(3)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(Color(hex: "#605D5D"))
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }
                    .buttonStyle(.plain)

                    if item.id != items.last?.id {
                        Divider()
                            .background(Color(hex: "#2F3336"))
                            .padding(.leading, 16)
                    }
                }
            }
            .padding(.bottom, 100)
        }
    }

    /// 电站封面：正方形，有图用图，无图用占位
    private func circleThumbnail(url: String?, title: String) -> some View {
        let size: CGFloat = 64
        return Group {
            if let urlString = url, !urlString.isEmpty, let u = URL(string: urlString) {
                AsyncImage(url: u) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        placeholderSquare(size: size, title: title)
                    @unknown default:
                        placeholderSquare(size: size, title: title)
                    }
                }
                .frame(width: size, height: size)
                .clipShape(RoundedRectangle(cornerRadius: 4))
            } else {
                placeholderSquare(size: size, title: title)
            }
        }
        .frame(width: size, height: size)
    }

    private func placeholderSquare(size: CGFloat, title: String) -> some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(Color(hex: "#2F3336"))
            .frame(width: size, height: size)
            .overlay(
                Text(title.prefix(1))
                    .font(.system(size: size * 0.4, weight: .medium))
                    .foregroundColor(Color(hex: "#71767A"))
            )
    }

    private var emptyStateView: some View {
        EmptyStateView(
            icon: "circle.grid.2x2",
            title: "暂无电站",
            message: nil,
            actionTitle: nil,
            iconSize: 36,
            action: nil
        )
        .padding(.top, 40)
    }

    private func fullScreenErrorView(_ error: APIError) -> some View {
        EmptyStateView(
            icon: error.iconName,
            title: "加载失败",
            message: error.userMessage,
            actionTitle: "重新加载",
            iconColor: .red.opacity(0.8),
            action: {
                Task { await loadCircles() }
            }
        )
        .padding(.top, 40)
    }

    @Sendable
    private func loadCircles() async {
        isLoading = true
        lastError = nil
        defer { isLoading = false }
        do {
            let list = try await APIService.shared.getCircleList()
            await MainActor.run {
                items = list
            }
        } catch let error as APIError {
            await MainActor.run {
                lastError = error
            }
        } catch {
            await MainActor.run {
                lastError = .unknown
            }
        }
    }
}
