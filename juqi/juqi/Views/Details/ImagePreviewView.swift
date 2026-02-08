//
//  ImagePreviewView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct ImagePreviewView: View {
    let images: [String]
    @State var currentIndex: Int
    @Environment(\.dismiss) var dismiss
    
    @State private var dragOffset: CGSize = .zero
    @State private var opacity: Double = 1.0
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    
    var body: some View {
        ZStack {
            Color.black
                .opacity(opacity)
                .ignoresSafeArea()
            
            TabView(selection: $currentIndex) {
                ForEach(Array(images.enumerated()), id: \.offset) { index, url in
                    ZoomableImageView(url: url)
                        .tag(index)
                }
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .always))
            .offset(y: dragOffset.height)
            .disabled(scale > 1.0) // 缩放时禁用翻页
            .gesture(
                DragGesture()
                    .onChanged { gesture in
                        guard scale == 1.0 else { return }
                        dragOffset = gesture.translation
                        let threshold: CGFloat = 200
                        let currentDrag = abs(dragOffset.height)
                        opacity = max(0.5, 1.0 - (currentDrag / threshold) * 0.5)
                    }
                    .onEnded { gesture in
                        guard scale == 1.0 else { return }
                        if abs(gesture.translation.height) > 100 {
                            withAnimation(.spring()) {
                                dismiss()
                            }
                        } else {
                            withAnimation(.spring()) {
                                dragOffset = .zero
                                opacity = 1.0
                            }
                        }
                    }
            )
            
            // 遵循 iOS 最新设计规范的关闭按钮 (位于右上角，更现代的磨砂感)
            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        withAnimation { dismiss() }
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white.opacity(0.9))
                            .frame(width: 30, height: 30)
                            .background(.ultraThinMaterial)
                            .clipShape(Circle())
                            .overlay(
                                Circle()
                                    .stroke(.white.opacity(0.1), lineWidth: 0.5)
                            )
                    }
                    .padding(.top, 60)
                    .padding(.trailing, 20)
                }
                Spacer()
            }
        }
        .statusBarHidden(true)
    }
}

// MARK: - 支持缩放的图片组件
struct ZoomableImageView: View {
    let url: String
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    
    var body: some View {
        AsyncImage(url: URL(string: url)) { image in
            image
                .resizable()
                .aspectRatio(contentMode: .fit)
                .scaleEffect(scale)
                .offset(offset)
                .gesture(
                    MagnificationGesture()
                        .onChanged { value in
                            let delta = value / lastScale
                            lastScale = value
                            scale *= delta
                        }
                        .onEnded { _ in
                            lastScale = 1.0
                            if scale < 1.0 {
                                withAnimation(.spring()) {
                                    scale = 1.0
                                    offset = .zero
                                }
                            } else if scale > 4.0 {
                                withAnimation(.spring()) {
                                    scale = 4.0
                                }
                            }
                        }
                )
                .simultaneousGesture(panGesture)
                .onTapGesture(count: 2) {
                    withAnimation(.spring()) {
                        if scale > 1.0 {
                            scale = 1.0
                            offset = .zero
                            lastOffset = .zero
                        } else {
                            scale = 2.5
                        }
                    }
                }
        } placeholder: {
            ProgressView()
                .tint(.white)
        }
    }
    
    /// scale == 1.0 时使用极大 minimumDistance 使手势不激活，水平滑动交给 TabView 切换图片；scale > 1.0 时正常响应拖拽平移
    private var panGesture: some Gesture {
        DragGesture(minimumDistance: scale > 1.0 ? 0 : 10000)
            .onChanged { value in
                if scale > 1.0 {
                    offset = CGSize(
                        width: lastOffset.width + value.translation.width,
                        height: lastOffset.height + value.translation.height
                    )
                }
            }
            .onEnded { _ in
                if scale > 1.0 {
                    lastOffset = offset
                } else {
                    offset = .zero
                    lastOffset = .zero
                }
            }
    }
}
