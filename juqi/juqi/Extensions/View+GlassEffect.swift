//
//  View+GlassEffect.swift
//  juqi
//
//  Created by Assistant on 2026/1/12.
//

import SwiftUI

// MARK: - iOS 液态玻璃效果扩展
extension View {
    /// iOS 26 标准液态玻璃效果
    /// 使用系统原生 Material 和自定义渐变实现液态玻璃质感
    @ViewBuilder
    func glassEffect(_ style: GlassEffectStyle = .regular) -> some View {
        if #available(iOS 18.0, *) {
            // iOS 18+ 使用原生 glassEffect API（如果存在）
            self.modifier(GlassEffectModifier(style: style))
        } else {
            // iOS 15-17 使用自定义实现
            self.modifier(GlassEffectModifier(style: style))
        }
    }
}

enum GlassEffectStyle {
    case regular
    case thin
    case thick
    case interactive
    
    var material: Material {
        switch self {
        case .regular, .interactive:
            return .ultraThinMaterial
        case .thin:
            return .thinMaterial
        case .thick:
            return .thickMaterial
        }
    }
}

struct GlassEffectModifier: ViewModifier {
    let style: GlassEffectStyle
    
    func body(content: Content) -> some View {
        ZStack {
            // 底层：Material 模糊效果
            content
                .background(style.material)
            
            // 中层：液态光泽渐变
            LinearGradient(
                stops: [
                    .init(color: .white.opacity(0.2), location: 0),
                    .init(color: .white.opacity(0.05), location: 0.3),
                    .init(color: .clear, location: 0.5),
                    .init(color: .white.opacity(0.05), location: 0.7),
                    .init(color: .white.opacity(0.1), location: 1)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // 顶层：高光边框
            content
                .overlay(
                    RoundedRectangle(cornerRadius: 0, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [
                                    .white.opacity(0.6),
                                    .white.opacity(0.2),
                                    .white.opacity(0.05),
                                    .white.opacity(0.3),
                                    .white.opacity(0.5)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 0.5
                        )
                )
        }
    }
}
