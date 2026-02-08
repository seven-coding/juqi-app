//
//  VerifyProgressView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct VerifyProgressView: View {
    @StateObject private var authService = AuthService.shared
    @State private var verifyStatus: VerifyStatus?
    @State private var isLoading = true
    @State private var timer: Timer?
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 30) {
                // 标题
                Text("审核进度")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.top, 60)
                
                Spacer()
                
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                        .scaleEffect(1.5)
                } else if let status = verifyStatus {
                    VStack(spacing: 30) {
                        // 状态图标
                        Image(systemName: statusIcon(status.status))
                            .font(.system(size: 80))
                            .foregroundColor(statusColor(status.status))
                        
                        // 状态文本
                        Text(statusText(status.status))
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.white)
                        
                        // 状态描述
                        Text(statusDescription(status.status))
                            .font(.system(size: 14))
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                        
                        // 进度信息
                        if status.status == .pending {
                            VStack(spacing: 10) {
                                Text("已有 \(status.likeCount) 位用户为您充电")
                                    .font(.system(size: 16))
                                    .foregroundColor(.white)
                                
                                Text("需要 3 位用户充电即可通过验证")
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                }
                
                Spacer()
                
                // 刷新按钮
                Button(action: {
                    checkVerifyStatus()
                }) {
                    Text("刷新状态")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Color(hex: "#FF6B35"))
                        .cornerRadius(22)
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 60)
            }
        }
        .onAppear {
            checkVerifyStatus()
            startPolling()
        }
        .onDisappear {
            stopPolling()
        }
    }
    
    private func checkVerifyStatus() {
        isLoading = true
        
        Task {
            do {
                let response: VerifyStatusResponse = try await NetworkService.shared.request(
                    operation: "appGetVerifyStatus",
                    needsToken: true
                )
                
                await MainActor.run {
                    verifyStatus = response.data
                    isLoading = false
                    
                    // 如果审核通过，更新用户状态并跳转
                    if response.data.status == .approved {
                        stopPolling()
                        // 刷新用户状态
                        Task {
                            await authService.validateToken()
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                }
            }
        }
    }
    
    private func startPolling() {
        // 每10秒轮询一次审核状态
        timer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { _ in
            checkVerifyStatus()
        }
    }
    
    private func stopPolling() {
        timer?.invalidate()
        timer = nil
    }
    
    private func statusIcon(_ status: VerifyStatusType) -> String {
        switch status {
        case .pending:
            return "clock.fill"
        case .approved:
            return "checkmark.circle.fill"
        case .rejected:
            return "xmark.circle.fill"
        }
    }
    
    private func statusColor(_ status: VerifyStatusType) -> Color {
        switch status {
        case .pending:
            return Color(hex: "#FF6B35")
        case .approved:
            return Color.green
        case .rejected:
            return Color.red
        }
    }
    
    private func statusText(_ status: VerifyStatusType) -> String {
        switch status {
        case .pending:
            return "审核中"
        case .approved:
            return "审核通过"
        case .rejected:
            return "审核未通过"
        }
    }
    
    private func statusDescription(_ status: VerifyStatusType) -> String {
        switch status {
        case .pending:
            return "您的语音验证正在审核中，请耐心等待。审核通过后即可使用所有功能。"
        case .approved:
            return "恭喜！您已通过验证，现在可以使用所有功能了。"
        case .rejected:
            return "很抱歉，您的验证未通过。请重新提交语音验证。"
        }
    }
}

enum VerifyStatusType: Int, Codable {
    case pending = 0
    case approved = 1
    case rejected = 2
}

struct VerifyStatus: Codable {
    let status: VerifyStatusType
    let joinStatus: Int
    let likeCount: Int
    let message: String?
}

struct VerifyStatusResponse: Codable {
    let code: Int
    let data: VerifyStatus
    let message: String
}

#Preview {
    VerifyProgressView()
}
