//
//  RootView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct RootView: View {
    @EnvironmentObject var authService: AuthService
    @State private var currentFlow: AuthFlow?
    
    var body: some View {
        Group {
            switch authService.authState {
            case .notAuthenticated:
                LoginView()
                
            case .authenticating:
                // 登录中，显示加载界面
                ZStack {
                    Color.black.ignoresSafeArea()
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                        .scaleEffect(1.5)
                }
                
            case .authenticated:
                // 已登录，根据用户状态决定显示内容
                authenticatedView
            }
        }
        .onChange(of: authService.authState) { oldState, newState in
            if newState == .authenticated {
                updateFlow()
            }
        }
        .onChange(of: authService.currentUserStatus) { oldValue, newValue in
            updateFlow()
        }
        .onAppear {
            if authService.authState == .authenticated {
                updateFlow()
            }
        }
    }
    
    @ViewBuilder
    private var authenticatedView: some View {
        switch currentFlow {
        case .languageVerify:
            // 需要语言验证
            NavigationStack {
                LanguageVerifyView()
            }
            
        case .trialPeriod:
            // 试用期内，允许使用
            TabBarView()
            
        case .nonMember:
            // 非会员，试用期已过
            TrialPeriodView()
            
        case .member:
            // 会员，正常使用
            TabBarView()
            
        case .accountError:
            // 账号异常
            accountErrorView
            
        case .none:
            // 加载中
            loadingView
        }
    }
    
    private var accountErrorView: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 30) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.red)
                
                Text("账号异常")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                
                Text(getAccountErrorMessage())
                    .font(.system(size: 16))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                
                Button(action: {
                    authService.logout()
                }) {
                    Text("返回登录")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color(hex: "#FF6B35"))
                        .cornerRadius(25)
                }
                .padding(.horizontal, 40)
            }
        }
    }
    
    private var loadingView: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                .scaleEffect(1.5)
        }
    }
    
    private func updateFlow() {
        currentFlow = authService.determineUserFlow()
    }
    
    private func getAccountErrorMessage() -> String {
        guard let userStatus = authService.currentUserStatus else {
            return "账号状态异常，请联系客服"
        }
        
        switch userStatus.joinStatus {
        case .deleted:
            return "您的账号已被注销"
        case .banned:
            return "您的账号已被封禁"
        default:
            return "账号状态异常，请联系客服"
        }
    }
}

#Preview {
    RootView()
}
