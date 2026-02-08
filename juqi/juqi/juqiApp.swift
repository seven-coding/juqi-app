//
//  juqiApp.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

@main
struct juqiApp: App {
    @StateObject private var authService = AuthService.shared
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var isInitialized = false
    @State private var initializationError: Error?
    
    init() {
        // 系统级初始化在AppInitializer中统一管理
        // 这里不进行任何初始化，避免初始化顺序问题
    }
    
    var body: some Scene {
        WindowGroup {
            Group {
                if isInitialized {
                    RootView()
                        .environmentObject(authService)
                        .preferredColorScheme(.dark) // 强制深色模式
                        .task {
                            // 初始化完成后，异步执行后台任务
                            AppInitializer.shared.recoverFailedTasks()
                            AppInitializer.shared.uploadCrashLogs()
                        }
                        .handlesExternalEvents(preferring: Set(arrayLiteral: "*"), allowing: Set(arrayLiteral: "*"))
                } else {
                    // 初始化中，显示启动画面
                    LaunchScreenView()
                }
            }
            .onAppear {
                // 应用启动时执行初始化
                if !isInitialized {
                    initializeApp()
                }
            }
        }
        .handlesExternalEvents(matching: Set(arrayLiteral: "*"))
    }
    
    /// 初始化应用
    private func initializeApp() {
        AppInitializer.shared.initialize { result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    isInitialized = true
                case .failure(let error):
                    initializationError = error
                    // 即使初始化失败，也显示界面，让用户知道发生了什么
                    isInitialized = true
                    print("⚠️ 应用初始化失败: \(error.localizedDescription)")
                }
            }
        }
    }
}

/// 启动画面视图
struct LaunchScreenView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 30) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 80))
                    .foregroundColor(Color(hex: "#FF6B35"))
                
                Text("橘气")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
                
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                    .scaleEffect(1.2)
                    .padding(.top, 20)
            }
        }
    }
}
