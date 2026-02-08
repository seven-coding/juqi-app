//
//  SkeletonView.swift
//  juqi
//
//  Created by Assistant on 2026/1/12.
//

import SwiftUI

struct ShimmerEffect: ViewModifier {
    @State private var phase: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        gradient: Gradient(stops: [
                            .init(color: .clear, location: 0),
                            .init(color: .white.opacity(0.15), location: 0.4),
                            .init(color: .white.opacity(0.25), location: 0.5),
                            .init(color: .white.opacity(0.15), location: 0.6),
                            .init(color: .clear, location: 1)
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 2)
                    .offset(x: -geometry.size.width + (geometry.size.width * 2 * phase))
                }
            )
            .mask(content)
            .onAppear {
                withAnimation(Animation.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmering() -> some View {
        self.modifier(ShimmerEffect())
    }
}

struct SkeletonPostCardView: View {
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Avatar Skeleton
            Circle()
                .fill(Color(hex: "#2F3336"))
                .frame(width: 48, height: 48)
                .shimmering()
            
            VStack(alignment: .leading, spacing: 8) {
                // Name Skeleton
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(hex: "#2F3336"))
                    .frame(width: 100, height: 16)
                    .shimmering()
                
                // Signature Skeleton
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(hex: "#2F3336"))
                    .frame(width: 180, height: 12)
                    .shimmering()
                
                // Content Skeleton
                VStack(alignment: .leading, spacing: 6) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(hex: "#2F3336"))
                        .frame(height: 14)
                        .shimmering()
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(hex: "#2F3336"))
                        .frame(height: 14)
                        .shimmering()
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(hex: "#2F3336"))
                        .frame(width: "80%".toCGFloat() ?? 200, height: 14)
                        .shimmering()
                }
                .padding(.top, 4)
                
                // Image Grid Skeleton (Optional, maybe just a block)
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(hex: "#2F3336"))
                    .frame(height: 180)
                    .shimmering()
                    .padding(.top, 8)
                
                // Bottom Bar Skeleton
                HStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(hex: "#2F3336"))
                        .frame(width: 60, height: 12)
                        .shimmering()
                    Spacer()
                    HStack(spacing: 24) {
                        ForEach(0..<4) { _ in
                            Circle()
                                .fill(Color(hex: "#2F3336"))
                                .frame(width: 20, height: 20)
                                .shimmering()
                        }
                    }
                }
                .padding(.top, 8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.black)
    }
}

extension String {
    func toCGFloat() -> CGFloat? {
        if self.hasSuffix("%") {
            let value = self.replacingOccurrences(of: "%", with: "")
            if let doubleValue = Double(value) {
                return CGFloat(doubleValue / 100.0 * 300) // Dummy screen width for skeleton
            }
        }
        return nil
    }
}
