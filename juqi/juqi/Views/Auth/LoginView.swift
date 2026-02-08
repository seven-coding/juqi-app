//
//  LoginView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct LoginView: View {
    @StateObject private var authService = AuthService.shared
    @State private var isAuthenticating = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var debugMessage: String?
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 40) {
                Spacer()
                
                // Logo和品牌标识
                VStack(spacing: 20) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 80))
                        .foregroundColor(Color(hex: "#FF6B35"))
                    
                    Text("橘气")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("拉拉专属领地")
                        .font(.system(size: 16))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                // 微信登录按钮
                Button(action: {
                    handleWechatLogin()
                }) {
                    HStack {
                        Image(systemName: "message.fill")
                            .font(.system(size: 20))
                        
                        Text("微信授权登录")
                            .font(.system(size: 18, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color(hex: "#07C160"))
                    .cornerRadius(25)
                }
                .disabled(isAuthenticating)
                .padding(.horizontal, 40)
                
                // MARK: - 测试登录按钮（仅DEBUG模式显示）
                #if DEBUG
                VStack(spacing: 12) {
                    Button(action: {
                        handleTestLogin()
                    }) {
                        HStack {
                            Image(systemName: "ladybug.fill")
                                .font(.system(size: 16))
                            
                            Text("测试登录（会员）")
                                .font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Color(hex: "#FF6B35"))
                        .cornerRadius(22)
                    }
                    .disabled(isAuthenticating)
                    
                    HStack(spacing: 12) {
                        Button(action: {
                            handleTestLoginAsTrial()
                        }) {
                            Text("试用期")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 36)
                                .background(Color.blue.opacity(0.7))
                                .cornerRadius(18)
                        }
                        .disabled(isAuthenticating)
                        
                        Button(action: {
                            handleTestLoginAsPending()
                        }) {
                            Text("待验证")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 36)
                                .background(Color.purple.opacity(0.7))
                                .cornerRadius(18)
                        }
                        .disabled(isAuthenticating)
                    }
                    
                    Text("⚠️ 仅开发调试使用")
                        .font(.system(size: 11))
                        .foregroundColor(.gray.opacity(0.6))

                    Text("接口地址: \(AppConfig.apiURL)")
                        .font(.system(size: 10))
                        .foregroundColor(.gray.opacity(0.7))
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 40)
                #endif

                // 常驻错误提示（不依赖 alert，确保失败时一定能看到）
                if let msg = errorMessage, !msg.isEmpty {
                    Text(msg)
                        .font(.system(size: 13))
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.15))
                        .cornerRadius(8)
                        .padding(.top, 8)
                }

                // 调试提示（用于确认按钮点击与流程触发）
                if let msg = debugMessage, !msg.isEmpty {
                    Text(msg)
                        .font(.system(size: 12))
                        .foregroundColor(.orange)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 6)
                        .background(Color.orange.opacity(0.15))
                        .cornerRadius(8)
                        .padding(.top, 6)
                }
                
                Spacer()
                    .frame(height: 60)
            }
            
            // 加载指示器
            if isAuthenticating {
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                
                VStack(spacing: 20) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                        .scaleEffect(1.5)
                    
                    Text("正在登录...")
                        .foregroundColor(.white)
                        .font(.system(size: 16))
                }
            }
        }
        .alert("登录失败", isPresented: $showError) {
            Button("确定", role: .cancel) { }
        } message: {
            Text(errorMessage ?? "未知错误")
        }
        .onAppear {
            setupWechatNotifications()
        }
        .onDisappear {
            removeWechatNotifications()
        }
        .onChange(of: authService.lastAuthError) { _, newValue in
            if let msg = newValue, !msg.isEmpty {
                errorMessage = msg
                showError = true
            }
        }
    }
    
    private func setupWechatNotifications() {
        // 监听微信授权成功通知
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("WechatAuthSuccess"),
            object: nil,
            queue: .main
        ) { notification in
            guard let code = notification.userInfo?["code"] as? String else {
                return
            }
            handleWechatCode(code)
        }
        
        // 监听微信授权失败通知
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("WechatAuthFailed"),
            object: nil,
            queue: .main
        ) { notification in
            isAuthenticating = false
            errorMessage = notification.userInfo?["message"] as? String ?? "微信授权失败"
            showError = true
        }
    }
    
    private func removeWechatNotifications() {
        NotificationCenter.default.removeObserver(self as Any, name: NSNotification.Name("WechatAuthSuccess"), object: nil)
        NotificationCenter.default.removeObserver(self as Any, name: NSNotification.Name("WechatAuthFailed"), object: nil)
    }
    
    private func handleWechatLogin() {
        // 检查微信是否已安装
        guard WXApi.isWXAppInstalled() else {
            errorMessage = "请先安装微信"
            showError = true
            return
        }
        
        // 检查微信API是否支持
        guard WXApi.isWXAppSupport() else {
            errorMessage = "当前微信版本不支持，请升级微信"
            showError = true
            return
        }
        
        isAuthenticating = true
        errorMessage = nil
        
        // 调用微信SDK进行授权
        let req = SendAuthReq()
        req.scope = "snsapi_userinfo"
        req.state = "juqi_login"
        
        WXApi.send(req) { success in
            if !success {
                DispatchQueue.main.async {
                    isAuthenticating = false
                    errorMessage = "无法打开微信，请检查微信是否已安装"
                    showError = true
                }
            }
        }
    }
    
    private func handleWechatCode(_ code: String) {
        Task {
            do {
                _ = try await authService.login(wechatCode: code)
                await MainActor.run {
                    isAuthenticating = false
                }
            } catch {
                await MainActor.run {
                    isAuthenticating = false
                    if let apiError = error as? APIError {
                        errorMessage = apiError.userMessage
                    } else {
                        errorMessage = error.localizedDescription
                    }
                    showError = true
                }
            }
        }
    }
    
    // MARK: - 测试登录处理方法（仅DEBUG模式，调用真实 appLogin 获取 token）
    #if DEBUG
    private func handleTestLogin() {
        isAuthenticating = true
        errorMessage = nil
        showError = false
        authService.lastAuthError = nil
        print("🧪 [测试登录] 点击测试登录，API: \(AppConfig.apiURL)")
        debugMessage = "已触发测试登录：\(Date())"
        Task {
            var loginError: String?
            do {
                try await authService.testLogin()
            } catch {
                if let apiError = error as? APIError {
                    loginError = apiError.userMessage
                } else {
                    loginError = error.localizedDescription
                }
                
                if loginError?.isEmpty ?? true {
                    loginError = (error as NSError).description
                }
            }
            await MainActor.run {
                isAuthenticating = false
                if let msg = loginError {
                    errorMessage = "测试登录失败: \(msg)"
                    showError = true
                    debugMessage = "测试登录失败：\(Date())"
                } else if authService.authState != .authenticated {
                    errorMessage = "登录未成功，请检查网络或确认 apiServer 已启动（如使用本地：npm run start:test）"
                    showError = true
                    debugMessage = "测试登录结束但未登录：\(Date())"
                } else {
                    debugMessage = "测试登录成功：\(Date())"
                }
            }
        }
    }

    private func handleTestLoginAsTrial() {
        handleTestLogin()
    }

    private func handleTestLoginAsPending() {
        handleTestLogin()
    }
    #endif
}

#Preview {
    LoginView()
}
