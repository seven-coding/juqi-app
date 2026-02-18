//
//  AuthService.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation
import Combine

/// appRefreshToken 接口返回的 data 结构
struct RefreshTokenData: Codable {
    let token: String
    let refreshed: Bool
}

/// 认证服务，管理登录状态和Token
class AuthService: ObservableObject {
    static let shared = AuthService()
    
    @Published var authState: AuthState = .notAuthenticated
    @Published var currentUserStatus: UserStatus?
    /// 当前用户 openId（登录时持久化到 Keychain，用于关注列表等接口；UserStatus 不含 openId）
    var currentUserOpenId: String? { KeychainHelper.getOpenId() }
    @Published var lastAuthError: String?
    
    private var token: String? {
        didSet {
            if token != nil {
                authState = .authenticated
            } else {
                authState = .notAuthenticated
            }
        }
    }
    
    private init() {
        // 不在init中自动检查，由AppInitializer统一管理
        // 避免初始化顺序问题
    }
    
    /// 检查认证状态（由AppInitializer调用）
    @MainActor
    func checkAuthState() async {
        #if DEBUG
        // 测试环境：如果设置了强制登录，直接返回未认证状态
        if UserDefaults.standard.bool(forKey: "forceLoginOnLaunch") {
            authState = .notAuthenticated
            return
        }
        #endif
        
        if let savedToken = KeychainHelper.getToken() {
            // 先设置token，触发authState更新
            token = savedToken
            NetworkService.shared.setToken(savedToken)
            
            // 验证Token有效性
            await validateToken()
        } else {
            authState = .notAuthenticated
        }
    }
    
    /// 验证Token有效性
    @MainActor
    func validateToken() async {
        // 如果token为空，直接返回
        guard token != nil else {
            authState = .notAuthenticated
            return
        }
        
        do {
            // 调用获取用户信息接口验证Token
            let response: UserInfoResponse = try await NetworkService.shared.request(
                operation: "appGetUserInfo",
                needsToken: true
            )
            if response.code == 200, let data = response.data {
                currentUserStatus = data.userStatus
                // 确保状态为已认证
                authState = .authenticated
                // 启动时刷新 token，减少后续请求因过期被拒；不 await 避免阻塞启动
                Task { @MainActor in await refreshTokenAtLaunch() }
            } else {
                // Token无效，清除登录状态
                logout()
            }
        } catch {
            // Token无效或网络错误，清除登录状态
            // 注意：网络错误时，如果是测试模式，不自动登出
            #if DEBUG
            if !NetworkService.shared.isTestMode {
                logout()
            }
            #else
            logout()
            #endif
        }
    }
    
    /// 保存Token
    func saveToken(_ token: String) {
        self.token = token
        NetworkService.shared.setToken(token)
        _ = KeychainHelper.saveToken(token)
    }
    
    /// 启动时调用 appRefreshToken，在 token 有效或即将过期时换新 token，减少后续请求因过期被拒
    @MainActor
    private func refreshTokenAtLaunch() async {
        guard token != nil else { return }
        do {
            let data: RefreshTokenData = try await NetworkService.shared.request(
                operation: "appRefreshToken",
                data: [:],
                needsToken: true,
                useCache: false
            )
            saveToken(data.token)
            if data.refreshed {
                print("🔄 [Token] Refreshed at launch")
            }
        } catch {
            // 刷新失败不登出，后续请求仍用旧 token
            print("⚠️ [Token] Refresh at launch failed: \(error)")
        }
    }

    /// 收到 401 时尝试刷新 token 一次（用于充电/关注等操作重试前），不登出；失败则抛出，由调用方决定是否登出
    @MainActor
    func refreshTokenOnce() async throws {
        guard token != nil else { throw APIError.tokenExpired }
        let data: RefreshTokenData = try await NetworkService.shared.request(
            operation: "appRefreshToken",
            data: [:],
            needsToken: true,
            useCache: false
        )
        saveToken(data.token)
        print("🔄 [Token] Refreshed after 401, retrying operation")
    }
    
    /// 登录（微信授权后调用）
    @MainActor
    func login(wechatCode: String) async throws -> LoginResponse {
        authState = .authenticating

        // request 返回的是 API 的 data 字段，故用 LoginData
        let data: LoginData = try await NetworkService.shared.request(
            operation: "appLogin",
            data: ["code": wechatCode],
            needsToken: false,
            useCache: false  // 登录接口不应缓存
        )

        saveToken(data.token)
        _ = KeychainHelper.saveOpenId(data.openId)
        currentUserStatus = UserStatus(
            joinStatus: UserJoinStatus(rawValue: data.joinStatus) ?? .normal,
            vipStatus: data.vipStatus,
            trialStartTime: data.trialStartTime,
            trialDays: data.trialDays ?? 7
        )

        if !data.vipStatus && data.trialStartTime == nil {
            recordTrialStartTime()
        }

        authState = .authenticated
        print("🔐 [登录] 用户 openId: \(data.openId)")
        return LoginResponse(code: 200, data: data, message: "成功")
    }
    
    /// 记录试用期开始时间
    private func recordTrialStartTime() {
        let startTime = Int64(Date().timeIntervalSince1970 * 1000)
        UserDefaults.standard.set(startTime, forKey: "trialStartTime")
    }
    
    /// 获取试用期开始时间
    func getTrialStartTime() -> Int64? {
        if let time = UserDefaults.standard.object(forKey: "trialStartTime") as? Int64 {
            return time
        }
        return currentUserStatus?.trialStartTime
    }
    
    /// 登出
    func logout() {
        token = nil
        currentUserStatus = nil
        KeychainHelper.deleteToken()
        NetworkService.shared.setToken("")
        authState = .notAuthenticated
        UserDefaults.standard.removeObject(forKey: "trialStartTime")
        
        #if DEBUG
        // 重置测试模式
        NetworkService.shared.isTestMode = false
        #endif
    }
    
    // MARK: - 测试登录（仅开发调试使用，使用测试环境真实 token）
    #if DEBUG
    /// 测试环境固定 code，后端按数据源返回对应 openId 的 token（测试数据: test_openid_app；正式数据: onosB5lRKgCjonoNbj9peqM--e2Q）
    private static let testLoginCode = "test_app_debug"

    /// 测试登录 - 调用真实 appLogin 接口，用测试 code 获取真实 token，进入首页后可正常拉取数据
    /// 失败时抛出错误，由调用方展示提示
    @MainActor
    func testLogin() async throws {
        lastAuthError = nil
        do {
            // request 返回的是 API 的 data 字段，不是整份 { code, data, message }，故用 LoginData
            let data: LoginData = try await requestWithTimeout(seconds: 15) {
                try await NetworkService.shared.request(
                    operation: "appLogin",
                    data: ["code": Self.testLoginCode],
                    needsToken: false,
                    useCache: false  // 登录接口不应缓存
                )
            }
            saveToken(data.token)
            _ = KeychainHelper.saveOpenId(data.openId)
            currentUserStatus = UserStatus(
                joinStatus: UserJoinStatus(rawValue: data.joinStatus) ?? .normal,
                vipStatus: data.vipStatus,
                trialStartTime: data.trialStartTime,
                trialDays: data.trialDays ?? 7
            )
            authState = .authenticated
            print("🧪 测试登录成功（真实 token）")
            print("🔐 [登录] 用户 openId: \(data.openId)")
        } catch {
            authState = .notAuthenticated
            lastAuthError = "测试登录失败: \(error.localizedDescription)"
            print("🧪 测试登录失败: \(error.localizedDescription)")
            throw error
        }
    }

    private func requestWithTimeout<T>(seconds: Double, _ operation: @escaping () async throws -> T) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask {
                try await operation()
            }
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                throw APIError.timeout
            }

            let result = try await group.next()
            group.cancelAll()
            guard let value = result else {
                throw APIError.timeout
            }
            return value
        }
    }

    /// 测试登录 - 试用期用户（同样走真实 appLogin，后端固定测试用户；会员状态以接口返回为准）
    @MainActor
    func testLoginAsTrial() async throws {
        try await testLogin()
    }

    /// 测试登录 - 待验证用户（同样走真实 appLogin）
    @MainActor
    func testLoginAsPending() async throws {
        try await testLogin()
    }
    #endif
    
    /// 判断用户流程
    func determineUserFlow() -> AuthFlow {
        guard let userStatus = currentUserStatus else {
            return .languageVerify
        }

        #if DEBUG
        // 测试登录后直接进首页，避免卡在语言验证等中间页
        if userStatus.joinStatus == .normal {
            return userStatus.vipStatus ? .member : .trialPeriod
        }
        #endif

        guard let joinStatus = userStatus.joinStatus else {
            return .languageVerify
        }

        switch joinStatus {
        case .normal:
            if userStatus.vipStatus {
                return .member
            } else {
                // 检查试用期
                if let startTime = getTrialStartTime() {
                    let trial = TrialPeriod(
                        startTime: Date(timeIntervalSince1970: TimeInterval(startTime) / 1000),
                        days: userStatus.trialDays
                    )
                    if !trial.isExpired {
                        return .trialPeriod
                    } else {
                        return .nonMember
                    }
                } else {
                    // 首次登录，记录试用期
                    recordTrialStartTime()
                    return .trialPeriod
                }
            }
        case .pending, .pendingVoice:
            return .languageVerify
        case .deleted, .banned:
            return .accountError
        }
    }
}

// MARK: - API响应模型
struct LoginResponse: Codable {
    let code: Int
    let data: LoginData?
    let message: String
}

struct LoginData: Codable {
    let token: String
    let openId: String
    let joinStatus: Int
    let vipStatus: Bool
    let trialStartTime: Int64?
    let trialDays: Int?

    enum CodingKeys: String, CodingKey {
        case token, openId, joinStatus, vipStatus, trialStartTime, trialDays
    }

    init(token: String, openId: String, joinStatus: Int, vipStatus: Bool, trialStartTime: Int64?, trialDays: Int?) {
        self.token = token
        self.openId = openId
        self.joinStatus = joinStatus
        self.vipStatus = vipStatus
        self.trialStartTime = trialStartTime
        self.trialDays = trialDays
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        token = try c.decode(String.self, forKey: .token)
        openId = try c.decode(String.self, forKey: .openId)
        // 兼容后端返回 Int 或 String
        if let i = try? c.decode(Int.self, forKey: .joinStatus) {
            joinStatus = i
        } else if let s = try? c.decode(String.self, forKey: .joinStatus), let i = Int(s) {
            joinStatus = i
        } else {
            joinStatus = 1
        }
        vipStatus = try c.decodeIfPresent(Bool.self, forKey: .vipStatus) ?? false
        trialStartTime = try? c.decodeIfPresent(Int64.self, forKey: .trialStartTime)
            ?? (try? c.decodeIfPresent(Int.self, forKey: .trialStartTime)).map(Int64.init)
        trialDays = try? c.decodeIfPresent(Int.self, forKey: .trialDays)
            ?? (try? c.decodeIfPresent(String.self, forKey: .trialDays)).flatMap(Int.init)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(token, forKey: .token)
        try c.encode(openId, forKey: .openId)
        try c.encode(joinStatus, forKey: .joinStatus)
        try c.encode(vipStatus, forKey: .vipStatus)
        try c.encodeIfPresent(trialStartTime, forKey: .trialStartTime)
        try c.encodeIfPresent(trialDays, forKey: .trialDays)
    }
}

struct UserInfoResponse: Codable {
    let code: Int
    let data: UserInfoData?
    let message: String
}

struct UserInfoData: Codable {
    let userStatus: UserStatus
}
