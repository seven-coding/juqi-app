//
//  ChargeTipsView.swift
//  juqi
//
//  电量说明浮层（与小程序文案一致）
//

import SwiftUI

/// 电量说明：展示「电量」含义，底部「我知道了」关闭。用于 ProfileView / UserProfileView。
struct ChargeTipsView: View {
    @Environment(\.dismiss) private var dismiss
    private let secondaryText = Color(hex: "#71767A")
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#000000").ignoresSafeArea()
                VStack(spacing: 24) {
                    Text("这是你获得的电量之和，代表你受喜欢的程度，也将获得我们更多的推荐")
                        .font(.system(size: 16))
                        .foregroundColor(secondaryText)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.top, 32)
                    Spacer()
                    Button(action: { dismiss() }) {
                        Text("我知道了")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color(hex: "#FF6B35"))
                            .cornerRadius(12)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("电量说明")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 22))
                            .foregroundColor(secondaryText)
                    }
                }
            }
        }
    }
}

#Preview {
    ChargeTipsView()
}
