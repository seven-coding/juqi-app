//
//  GlassBackButton.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/15.
//

import SwiftUI

struct GlassBackButton: View {
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Image(systemName: "chevron.left")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 32, height: 32)
                .background(.ultraThinMaterial, in: Circle())
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.18), lineWidth: 0.6)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("返回")
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        GlassBackButton(action: {})
    }
}
