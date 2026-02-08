//
//  TrialPeriodView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct TrialPeriodView: View {
    @StateObject private var authService = AuthService.shared
    @StateObject private var userStatusService = UserStatusService.shared
    @State private var trialPeriod: TrialPeriod?
    @State private var timer: Timer?
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 30) {
                Spacer()
                
                // 图标
                Image(systemName: "crown.fill")
                    .font(.system(size: 80))
                    .foregroundColor(Color(hex: "#FF6B35"))
                
                // 标题
                Text("仅会员可用")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)
                
                // 描述
                VStack(spacing: 15) {
                    Text("橘气为会员专属社区")
                        .font(.system(size: 16))
                        .foregroundColor(.gray)
                    
                    if let trial = trialPeriod, !trial.isExpired {
                        VStack(spacing: 10) {
                            Text("免费试用期")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(Color(hex: "#FF6B35"))
                            
                            Text(trial.remainingTimeDescription)
                                .font(.system(size: 32, weight: .bold, design: .monospaced))
                                .foregroundColor(.white)
                            
                            Text("试用期内可正常使用所有功能")
                                .font(.system(size: 14))
                                .foregroundColor(.gray)
                        }
                        .padding(.top, 20)
                    } else {
                        Text("开通会员即可享受完整功能")
                            .font(.system(size: 14))
                            .foregroundColor(.gray)
                    }
                }
                .padding(.horizontal, 40)
                
                Spacer()
                
                // 按钮组
                VStack(spacing: 15) {
                    // 立即开通会员按钮
                    Button(action: {
                        // TODO: 跳转到会员开通页面
                    }) {
                        Text("立即开通会员")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color(hex: "#FF6B35"))
                            .cornerRadius(25)
                    }
                    
                    // 继续试用按钮（试用期内显示）
                    if let trial = trialPeriod, !trial.isExpired {
                        Button(action: {
                            // 允许进入首页
                            // 这里应该导航到首页
                        }) {
                            Text("继续试用")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(Color(hex: "#FF6B35"))
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.clear)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 25)
                                        .stroke(Color(hex: "#FF6B35"), lineWidth: 1.5)
                                )
                        }
                    }
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 60)
            }
        }
        .onAppear {
            loadTrialPeriod()
            startTimer()
        }
        .onDisappear {
            stopTimer()
        }
    }
    
    private func loadTrialPeriod() {
        trialPeriod = userStatusService.getTrialPeriod()
    }
    
    private func startTimer() {
        // 每秒更新一次倒计时
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            loadTrialPeriod()
            
            // 如果试用期过期，刷新状态
            if let trial = trialPeriod, trial.isExpired {
                Task {
                    await authService.validateToken()
                }
            }
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
}

#Preview {
    TrialPeriodView()
}
