//
//  ChargeTipsView.swift
//  juqi
//
//  电量说明弹窗（与热榜说明 HotListExplanationView 同款样式）
//

import SwiftUI

/// 电量说明：展示「电量」含义，与橘气热榜说明弹窗同款样式（液态玻璃背景、标题栏、卡片内容）。
struct ChargeTipsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // 背景层：与热榜说明一致
            Rectangle()
                .fill(.ultraThinMaterial)
                .overlay(
                    LinearGradient(
                        colors: [
                            Color(hex: "#FF6B35").opacity(0.1),
                            Color.black.opacity(0.2),
                            Color.purple.opacity(0.05)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .glassEffect(.interactive)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // 标题栏：与热榜说明一致
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("电量说明")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                        Text("Charge & Recommendation")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                            .kerning(1)
                    }
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(.white.opacity(0.1))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
                .padding(.bottom, 20)

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 28) {
                        // 核心介绍卡片 - 与热榜说明「关于热榜」卡片同款
                        VStack(alignment: .leading, spacing: 16) {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle()
                                        .fill(Color(hex: "#FF6B35").opacity(0.2))
                                        .frame(width: 32, height: 32)
                                    Image(systemName: "bolt.fill")
                                        .foregroundColor(Color(hex: "#FF6B35"))
                                        .font(.system(size: 16))
                                }
                                Text("关于电量")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                            }

                            Text("这是你获得的电量之和，代表你受喜欢的程度，也将获得我们更多的推荐。")
                                .font(.system(size: 15))
                                .lineSpacing(6)
                                .foregroundColor(.white.opacity(0.85))

                            HStack {
                                Image(systemName: "heart.fill")
                                    .font(.system(size: 12))
                                Text("通过充电与互动获得电量，助力你的内容被更多人看到")
                                    .font(.system(size: 13, weight: .medium))
                            }
                            .foregroundColor(Color(hex: "#FF6B35"))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(hex: "#FF6B35").opacity(0.1))
                            .cornerRadius(10)
                        }
                        .padding(24)
                        .background(
                            RoundedRectangle(cornerRadius: 24)
                                .fill(.white.opacity(0.05))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 24)
                                        .strokeBorder(.white.opacity(0.1), lineWidth: 1)
                                )
                        )

                        Color.clear.frame(height: 20)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }
        }
    }
}

#Preview {
    ChargeTipsView()
}
