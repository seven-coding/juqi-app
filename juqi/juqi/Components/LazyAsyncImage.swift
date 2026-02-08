//
//  LazyAsyncImage.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

/// 优化的异步图片加载组件，支持缓存和懒加载
struct LazyAsyncImage<Content: View, Placeholder: View>: View {
    let url: String?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder
    
    @State private var loadedImage: UIImage?
    @State private var isLoading = true
    @State private var loadError = false
    
    init(
        url: String?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }
    
    var body: some View {
        Group {
            if let image = loadedImage {
                content(Image(uiImage: image))
            } else if isLoading {
                placeholder()
            } else if loadError {
                placeholder()
            } else {
                placeholder()
            }
        }
        .task {
            await loadImage()
        }
    }
    
    private func loadImage() async {
        guard let urlString = url, !urlString.isEmpty,
              let imageURL = URL(string: urlString) else {
            await MainActor.run {
                isLoading = false
                loadError = true
            }
            return
        }
        
        // 先尝试从缓存获取
        if let cachedImage = CacheService.shared.getCachedImage(for: urlString) {
            await MainActor.run {
                loadedImage = cachedImage
                isLoading = false
            }
            return
        }
        
        // 从网络加载
        do {
            let (data, _) = try await URLSession.shared.data(from: imageURL)
            guard let image = UIImage(data: data) else {
                await MainActor.run {
                    isLoading = false
                    loadError = true
                }
                return
            }
            
            // 缓存图片
            CacheService.shared.cacheImage(image, for: urlString)
            
            await MainActor.run {
                loadedImage = image
                isLoading = false
            }
        } catch {
            await MainActor.run {
                isLoading = false
                loadError = true
            }
        }
    }
}

// MARK: - 简化版本
extension LazyAsyncImage where Content == Image, Placeholder == ProgressView<EmptyView, EmptyView> {
    init(url: String?) {
        self.url = url
        self.content = { $0 }
        self.placeholder = { ProgressView() }
    }
}
