//
//  NetworkService.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation
import UIKit
import Network

class NetworkService {
    static let shared = NetworkService()

    /// 收到 401 时不立即登出，先尝试刷新 token 再重试一次（减少充电/关注等操作误登出）
    private let retry401Operations: Set<String> = ["appChargeUser", "appFollowUser", "appUnfollowUser", "appRefreshToken"]
    
    private var baseURL: String {
        return AppConfig.apiURL
    }
    private var token: String? = nil
    private let session: URLSession
    private let monitor = NWPathMonitor()
    private var isOnline = true
    private let maxRetries = 3
    /// 请求超时（含云托管冷启动场景，略大以降低 -999）
    private let timeoutInterval: TimeInterval = 45
    
    #if DEBUG
    /// 测试模式标志 - 跳过 token 检查
    var isTestMode = false
    #endif
    
    private init() {
        // 不在init中读取Token，由AuthService统一管理
        // 避免重复读取和初始化顺序问题
        
        // 配置URLSession
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = timeoutInterval
        config.timeoutIntervalForResource = timeoutInterval * 2
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        session = URLSession(configuration: config)
        
        // 延迟启动网络监控，避免启动时隐私权限崩溃
        // 网络监控由AppInitializer统一管理
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.startNetworkMonitoring()
        }
    }
    
    func setToken(_ token: String) {
        self.token = token
        _ = KeychainHelper.saveToken(token)
    }
    
    // MARK: - 网络监控
    
    private func startNetworkMonitoring() {
        let queue = DispatchQueue(label: "NetworkMonitor")
        monitor.pathUpdateHandler = { [weak self] path in
            self?.isOnline = path.status == .satisfied
        }
        monitor.start(queue: queue)
    }
    
    /// DEBUG 下使用本地 API（localhost）时，NWPathMonitor 可能误报离线，仍允许尝试请求
    private var shouldAttemptNetworkRequest: Bool {
        if isOnline { return true }
        #if DEBUG
        if AppConfig.useLocalTestAPI {
            let url = baseURL.lowercased()
            if url.contains("localhost") || url.contains("127.0.0.1") {
                return true
            }
        }
        #endif
        return false
    }
    
    // MARK: - 请求方法
    
    func request<T: Codable>(
        operation: String,
        data: [String: Any] = [:],
        needsToken: Bool = true,
        useCache: Bool = true,
        maxRetries: Int? = nil
    ) async throws -> T {
        let startTime = Date()
        print("📤 [API] operation=\(operation) url=\(baseURL) needsToken=\(needsToken)")
        
        // 以下接口不缓存：写操作必须打服务端；读操作避免二级页与入口数据不一致
        var effectiveUseCache = useCache
        let noCacheOperations: [String] = [
            "appGetCurrentUserProfile",
            "appGetUserList", "appGetBlackList",
            "appGetChargeList", "appGetFavoriteList", "appGetUserDynList",
            "appGetNoVisitList", "appGetNoSeeList", "appGetNoSeeMeList",
            "appGetUserProfile", "appGetDynComment",
            "appChargeDyn", "appUnchargeDyn", "appReportDyn", "appFollowUser", "appUnfollowUser", "appGetUserFollowStatus"
        ]
        if noCacheOperations.contains(operation) {
            effectiveUseCache = false
        }

        var did401Retry = false
        
        // 检查网络状态（DEBUG 下使用 localhost 时仍尝试请求，避免 NWPathMonitor 误报离线）
        if !shouldAttemptNetworkRequest {
            print("⚠️ [API] Network offline, checking cache...")
            // 尝试从缓存获取
            if effectiveUseCache {
                let cacheKey = generateCacheKey(operation: operation, data: data)
                if let cached: T = CacheService.shared.getCachedResponse(T.self, for: cacheKey) {
                    print("💾 [Cache Hit] operation: \(operation), key: \(cacheKey)")
                    return cached
                }
            }
            print("❌ [API Error] operation: \(operation), error: Network offline")
            throw APIError.offline
        }
        
        // 检查Token
        #if DEBUG
        let skipTokenCheck = isTestMode
        #else
        let skipTokenCheck = false
        #endif
        
        if needsToken && !skipTokenCheck {
            if token == nil {
                print("❌ [Token] Token missing, logging out...")
                await MainActor.run {
                    ToastManager.shared.error("登录已过期，请重新登录")
                    AuthService.shared.logout()
                }
                throw APIError.tokenExpired
            } else {
                print("✅ [Token] Token present, hasToken: true")
            }
        }
        
        // 尝试从缓存获取
        if effectiveUseCache {
            let cacheKey = generateCacheKey(operation: operation, data: data)
            if let cached: T = CacheService.shared.getCachedResponse(T.self, for: cacheKey) {
                let duration = Int((Date().timeIntervalSince(startTime) * 1000))
                print("💾 [Cache Hit] operation: \(operation), duration: \(duration)ms")
                return cached
            }
        }
        
        // 执行请求（带重试）
        let retryCount = maxRetries ?? self.maxRetries
        var lastError: Error?
        
        for attempt in 0...retryCount {
            do {
                let result: T = try await performRequest(
                    operation: operation,
                    data: data,
                    needsToken: needsToken,
                    useCache: effectiveUseCache
                )
                let duration = Int((Date().timeIntervalSince(startTime) * 1000))
                print("✅ [API] operation=\(operation) duration=\(duration)ms attempt=\(attempt + 1)")
                return result
            } catch let error as APIError {
                lastError = error

                // 401 时对充电/关注等操作：先尝试刷新 token 再重试一次，仍 401 再登出
                if case .tokenExpired = error, retry401Operations.contains(operation), !did401Retry {
                    did401Retry = true
                    do {
                        try await AuthService.shared.refreshTokenOnce()
                        let result: T = try await performRequest(operation: operation, data: data, needsToken: needsToken, useCache: effectiveUseCache)
                        print("✅ [API] operation=\(operation) succeeded after 401 refresh retry")
                        return result
                    } catch {
                        if case APIError.tokenExpired = error {
                            print("❌ [API] operation=\(operation) still 401 after refresh, logging out")
                            await MainActor.run {
                                ToastManager.shared.error("登录已过期，请重新登录")
                                AuthService.shared.logout()
                            }
                        }
                        throw error
                    }
                }

                // 如果不需要重试或已达到最大重试次数
                if !error.isRetryable || attempt >= retryCount {
                    print("❌ [API] operation=\(operation) type=\(error.errorType) message=\(error.localizedDescription) retry=\(attempt)/\(retryCount)")
                    // 需要重新登录
                    if error.requiresReauth {
                        print("🔄 [Token] Token expired, logging out...")
                        await MainActor.run {
                            ToastManager.shared.error("登录已过期，请重新登录")
                            AuthService.shared.logout()
                        }
                    }
                    throw error
                }
                
                // 等待后重试（指数退避，首轮 1s 以配合云托管冷启动）
                let delay = pow(2.0, Double(attempt)) * 1.0
                print("🔄 [Retry] operation: \(operation), attempt: \(attempt + 1)/\(retryCount), delay: \(delay)s, reason: \(error.localizedDescription)")
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            } catch {
                // Task 取消（如用户离开页面）时直接抛出，不包装、不重试
                if error is CancellationError {
                    throw error
                }
                lastError = error
                if attempt >= retryCount {
                    print("❌ [API Error] operation: \(operation), error: \(error.localizedDescription), retry: \(attempt)/\(retryCount)")
                    throw APIError.networkError(error)
                }
                let delay = pow(2.0, Double(attempt)) * 1.0
                print("🔄 [Retry] operation: \(operation), attempt: \(attempt + 1)/\(retryCount), delay: \(delay)s")
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }
        
        throw lastError ?? APIError.unknown
    }
    
    // MARK: - 执行请求
    
    private func performRequest<T: Codable>(
        operation: String,
        data: [String: Any],
        needsToken: Bool,
        useCache: Bool
    ) async throws -> T {
        let localReqId = String(UUID().uuidString.prefix(8))
        // 使用真实后端API
        guard let url = URL(string: baseURL) else {
            print("❌ [API] req=\(localReqId) operation=\(operation) error=Invalid URL")
            throw APIError.invalidURL
        }
        
        let requestedDataEnv = AppConfig.dataEnv
        var body: [String: Any] = [
            "operation": operation,
            "data": data,
            "source": "v2", // 自动添加source='v2'参数标识App请求
            "dataEnv": requestedDataEnv // 测试环境下可切换 测试数据/线上数据
        ]
        
        if needsToken, let token = token {
            body["token"] = token
        }
        
        var dataKeys = Array(data.keys).sorted().joined(separator: ",")
        if dataKeys.isEmpty { dataKeys = "-" }
        print("📤 [API] req=\(localReqId) operation=\(operation) dataEnv=\(requestedDataEnv) dataKeys=\(dataKeys)\(dataIdLogSuffix(data))")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // 如果需要Token，添加到请求头（trim 避免换行等导致服务端 Invalid character in header）
        if needsToken, let t = token, !t.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            request.addValue("Bearer \(t.trimmingCharacters(in: .whitespacesAndNewlines))", forHTTPHeaderField: "Authorization")
        }
        
        request.timeoutInterval = timeoutInterval
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        do {
            let requestStartTime = Date()
            let (responseData, response) = try await session.data(for: request)
            let requestDuration = Int((Date().timeIntervalSince(requestStartTime) * 1000))
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [API] req=\(localReqId) operation=\(operation) error=Invalid response type")
                throw APIError.invalidResponse
            }
            
            print("📥 [API] req=\(localReqId) operation=\(operation) status=\(httpResponse.statusCode) duration=\(requestDuration)ms\(dataIdLogSuffix(data))")
            
            // 2xx 但响应体为空时直接报错，便于区分「解码失败」与「网关未返回 body」
            if responseData.isEmpty && (200...299).contains(httpResponse.statusCode) {
                print("❌ [API] req=\(localReqId) operation=\(operation) error=响应体为空 status=\(httpResponse.statusCode)\(dataIdLogSuffix(data))")
                throw APIError.apiError(code: 0, message: "服务器返回空数据，请稍后重试")
            }
            
            // 个人主页动态列表：打印原始响应便于定位「有数据但列表为空」问题
            if operation == "appGetUserDynList", (200...299).contains(httpResponse.statusCode), !responseData.isEmpty {
                if let raw = try? JSONSerialization.jsonObject(with: responseData) as? [String: Any] {
                    let code = raw["code"] as? Int ?? -1
                    if let dataObj = raw["data"] as? [String: Any] {
                        let list = dataObj["list"]
                        let listCount = (list as? [[String: Any]])?.count ?? (list as? [Any])?.count ?? -1
                        let hasMore = dataObj["hasMore"] ?? "?"
                        print("📋 [API] req=\(localReqId) operation=appGetUserDynList raw code=\(code) data.list.count=\(listCount) hasMore=\(hasMore)\(dataIdLogSuffix(data))")
                    } else {
                        print("📋 [API] req=\(localReqId) operation=appGetUserDynList raw code=\(code) data=null或非对象\(dataIdLogSuffix(data))")
                    }
                }
            }

            // 处理HTTP状态码
            switch httpResponse.statusCode {
            case 200...299:
                break
            case 401:
                print("❌ [API] req=\(localReqId) operation=\(operation) error=Unauthorized 401\(dataIdLogSuffix(data))")
                if !retry401Operations.contains(operation) {
                    await MainActor.run {
                        ToastManager.shared.error("登录已过期，请重新登录")
                        AuthService.shared.logout()
                    }
                }
                throw APIError.tokenExpired
            case 500...599:
                print("❌ [API] req=\(localReqId) operation=\(operation) error=Server status=\(httpResponse.statusCode)\(dataIdLogSuffix(data))")
                throw APIError.serverError(httpResponse.statusCode)
            default:
                print("❌ [API] req=\(localReqId) operation=\(operation) error=Unexpected status=\(httpResponse.statusCode)\(dataIdLogSuffix(data))")
                throw APIError.invalidResponse
            }
            
            let decoder = JSONDecoder()
            // 兼容服务端返回秒级或毫秒级时间戳：
            // 若值 > 1e12 认为是毫秒，除以 1000 转换；否则按秒解码
            decoder.dateDecodingStrategy = .custom { decoder in
                let container = try decoder.singleValueContainer()
                let timestamp = try container.decode(Double.self)
                if timestamp > 1e12 {
                    return Date(timeIntervalSince1970: timestamp / 1000)
                }
                return Date(timeIntervalSince1970: timestamp)
            }
            var apiResponse: APIResponse<T>
            do {
                apiResponse = try decoder.decode(APIResponse<T>.self, from: responseData)
            } catch let decodeError as DecodingError {
                // 兼容 appLogin 被网关/服务端包装成 { result: { code, data, message } } 的情况
                if operation == "appLogin",
                   let top = try? JSONSerialization.jsonObject(with: responseData) as? [String: Any],
                   let inner = top["result"] as? [String: Any],
                   (inner["code"] as? Int) == 200,
                   let dataObj = inner["data"] as? [String: Any],
                   let token = dataObj["token"] as? String,
                   let openId = dataObj["openId"] as? String {
                    let joinStatus = (dataObj["joinStatus"] as? Int) ?? (dataObj["joinStatus"] as? String).flatMap { Int($0) } ?? 1
                    let vipStatus = dataObj["vipStatus"] as? Bool ?? false
                    let trialStartTime = dataObj["trialStartTime"] as? Int64 ?? (dataObj["trialStartTime"] as? Int).map { Int64($0) }
                    let trialDays = dataObj["trialDays"] as? Int
                    let loginData = LoginData(token: token, openId: openId, joinStatus: joinStatus, vipStatus: vipStatus, trialStartTime: trialStartTime, trialDays: trialDays)
                    return loginData as! T
                }
                // 兼容旧版 appGetUserProfile 返回 data: { userInfo, isInvisible }（无 data.id）导致解码失败
                if operation == "appGetUserProfile",
                   let top = try? JSONSerialization.jsonObject(with: responseData) as? [String: Any],
                   (top["code"] as? Int) == 200,
                   let dataAny = top["data"], let dataDict = dataAny as? [String: Any],
                   let profile = UserProfile.fromLegacyAPI(dataDict: dataDict) {
                    if useCache {
                        let cacheKey = generateCacheKey(operation: operation, data: data)
                        CacheService.shared.cacheResponse(profile, for: cacheKey)
                    }
                    return profile as! T
                }
                // appGetCurrentUserProfile 返回结构异常或缺字段时，用 data 字典构造最小 profile 避免白屏
                if operation == "appGetCurrentUserProfile",
                   let top = try? JSONSerialization.jsonObject(with: responseData) as? [String: Any],
                   (top["code"] as? Int) == 200,
                   let dataAny = top["data"], let dataDict = dataAny as? [String: Any] {
                    if let profile = UserProfile.fromLegacyAPI(dataDict: dataDict) {
                        if useCache {
                            let cacheKey = generateCacheKey(operation: operation, data: data)
                            CacheService.shared.cacheResponse(profile, for: cacheKey)
                        }
                        return profile as! T
                    }
                    let minimal: [String: Any] = [
                        "id": (dataDict["id"] as? String) ?? (dataDict["openId"] as? String) ?? "",
                        "userName": (dataDict["userName"] as? String) ?? (dataDict["nickName"] as? String) ?? "",
                        "isVip": (dataDict["isVip"] as? Bool) ?? false,
                        "followCount": (dataDict["followCount"] as? Int) ?? 0,
                        "followerCount": (dataDict["followerCount"] as? Int) ?? 0
                    ]
                    if let dataJson = try? JSONSerialization.data(withJSONObject: minimal),
                       let profile = try? decoder.decode(UserProfile.self, from: dataJson) {
                        if useCache {
                            let cacheKey = generateCacheKey(operation: operation, data: data)
                            CacheService.shared.cacheResponse(profile, for: cacheKey)
                        }
                        return profile as! T
                    }
                }
                // 兼容部分电站 appGetCircleDetail 返回 data 为圈子对象直接包装（非 { circle, followStatus }）
                if operation == "appGetCircleDetail",
                   let fallback = Self.decodeCircleDetailFallback(from: responseData, decoder: decoder) {
                    if useCache {
                        let cacheKey = generateCacheKey(operation: operation, data: data)
                        CacheService.shared.cacheResponse(fallback, for: cacheKey)
                    }
                    return fallback as! T
                }
                // getMessagesNew：服务端返回错误时 data 为 { reason } 无 messages，直接解码会 keyNotFound；先按 code 区分
                if operation == "getMessagesNew",
                   let top = try? JSONSerialization.jsonObject(with: responseData) as? [String: Any] {
                    let code = top["code"] as? Int ?? 500
                    let msg = top["message"] as? String ?? "请求失败"
                    if code != 200 {
                        print("❌ [API] req=\(localReqId) operation=getMessagesNew code=\(code) message=\(msg)\(dataIdLogSuffix(data))")
                        if code == 500 && msg.lowercased().contains("timeout") {
                            throw APIError.timeout
                        }
                        throw APIError.apiError(code: code, message: msg)
                    }
                    // code == 200：尝试只解码 data 部分；若缺 messages 则返回空列表避免崩溃
                    if let dataObj = top["data"] as? [String: Any],
                       let dataJson = try? JSONSerialization.data(withJSONObject: dataObj) {
                        if let listResp = try? decoder.decode(MessageListResponse.self, from: dataJson) {
                            if useCache {
                                let cacheKey = generateCacheKey(operation: operation, data: data)
                                CacheService.shared.cacheResponse(listResp, for: cacheKey)
                            }
                            return listResp as! T
                        }
                    }
                    // data 缺 messages（异常结构）时返回空列表，避免解码崩溃
                    let empty = MessageListResponse(messages: [], count: 0, notReadCount: nil)
                    return empty as! T
                }
                // 解析失败时打印原始响应（便于排查 appLogin 等接口的网关/服务端返回形状）
                if operation == "appLogin" {
                    let raw = String(data: responseData, encoding: .utf8) ?? ""
                    let preview = raw.count > 500 ? String(raw.prefix(500)) + "…" : raw
                    print("❌ [API] req=\(localReqId) operation=appLogin decoding 原始响应体(前500字符): \(preview)")
                }
                throw decodeError
            }
            
            // 处理API错误码：401 需区分「登录过期」与「业务 401」（如充电接口返回「已充电/点过」）
            if apiResponse.code == 401 {
                let msg = apiResponse.message ?? ""
                let isBusiness401 = msg.contains("点过") || msg.contains("已充电")
                if isBusiness401 {
                    print("❌ [API] req=\(localReqId) operation=\(operation) code=401 业务码 message=\(msg)")
                    throw APIError.apiError(code: 401, message: msg)
                }
                print("❌ [API] req=\(localReqId) operation=\(operation) code=401 Token expired")
                if !retry401Operations.contains(operation) {
                    await MainActor.run {
                        ToastManager.shared.error("登录已过期，请重新登录")
                        AuthService.shared.logout()
                    }
                }
                throw APIError.tokenExpired
            }
            
            if apiResponse.code != 200 {
                let msg = apiResponse.message ?? "请求失败"
                let sid = apiResponse.requestId ?? "-"
                print("❌ [API] req=\(localReqId) requestId=\(sid) operation=\(operation) code=\(apiResponse.code) message=\(msg)\(dataIdLogSuffix(data))")
                
                // 兼容服务端返回的 request timeout 消息，映射为客户端的 timeout 错误
                if apiResponse.code == 500 && msg.lowercased().contains("timeout") {
                    throw APIError.timeout
                }
                
                throw APIError.apiError(code: apiResponse.code, message: msg)
            }
            
            // 兼容服务端返回 code=200 且 data=null 的空体接口（如 appDeleteDyn），视为成功
            if apiResponse.data == nil {
                if apiResponse.code == 200 && T.self == EmptyResponse.self {
                    print("✅ [API] req=\(localReqId) operation=\(operation) code=200 data=null 按 EmptyResponse 成功")
                    return EmptyResponse() as! T
                }
                print("❌ [API] req=\(localReqId) operation=\(operation) error=Response data is nil\(dataIdLogSuffix(data))")
                throw APIError.unknown
            }
            let resultData = apiResponse.data!
            
            let sid = apiResponse.requestId ?? "-"
            print("✅ [API] req=\(localReqId) requestId=\(sid) operation=\(operation) code=\(apiResponse.code)\(dataIdLogSuffix(data))")
            
            // 若服务端下发 newToken（token 即将过期时），立即保存，避免后续请求因过期被拒
            if let newToken = apiResponse.newToken, !newToken.isEmpty {
                await MainActor.run {
                    AuthService.shared.saveToken(newToken)
                }
                print("🔄 [Token] Updated from response newToken")
            }
            
            // 缓存响应
            if useCache {
                let cacheKey = generateCacheKey(operation: operation, data: data)
                CacheService.shared.cacheResponse(resultData, for: cacheKey)
                print("💾 [Cache] Saved response for operation: \(operation)")
            }
            
            return resultData
        } catch let error as URLError {
            let apiError: APIError
            if error.code == .timedOut {
                apiError = .timeout
                print("❌ [Network Error] type: timeout, error: Timeout after \(timeoutInterval)s")
            } else if error.code == .notConnectedToInternet {
                apiError = .offline
                print("❌ [Network Error] type: offline, error: Not connected to internet")
            } else if error.code == .cancelled {
                // -999：请求被取消。除冷启动外，还可能是：负载均衡/网关超时、服务端主动关闭连接、
                // 网络切换、App 进入后台、并发过多导致连接被挤掉。MinNum≥1 可减少冷启动，其余需从服务端/网络排查。
                apiError = .networkError(error)
                print("❌ [Network Error] type: network(cancelled), error: 请求被取消(-999)，可能为云托管冷启动或连接中断")
            } else {
                apiError = .networkError(error)
                print("❌ [Network Error] type: network, error: \(error.localizedDescription)")
            }
            CrashReporter.shared.logError(apiError, context: [
                "operation": operation,
                "data": data
            ])
            throw apiError
        } catch let error as DecodingError {
            let apiError = APIError.decodingError(error)
            print("❌ [API] req=\(localReqId) operation=\(operation) type=decoding error=\(error.localizedDescription)\(dataIdLogSuffix(data))")
            CrashReporter.shared.logError(apiError, context: [
                "operation": operation,
                "data": data
            ])
            throw apiError
        } catch let error as APIError {
            print("❌ [API] req=\(localReqId) operation=\(operation) type=\(error.errorType) error=\(error.localizedDescription)\(dataIdLogSuffix(data))")
            CrashReporter.shared.logError(error, context: [
                "operation": operation,
                "data": data
            ])
            throw error
        } catch {
            // Task 取消时原样抛出，便于上层不展示“加载失败”
            if error is CancellationError {
                throw error
            }
            let apiError = APIError.networkError(error)
            print("❌ [API] req=\(localReqId) operation=\(operation) error=\(error.localizedDescription)\(dataIdLogSuffix(data))")
            CrashReporter.shared.logError(apiError, context: [
                "operation": operation,
                "data": data
            ])
            throw apiError
        }
    }
    
    // MARK: - 辅助方法

    /// 从请求 data 中提取与服务端一致的 id（动态）、userId（用户），用于日志便于排查
    private func dataIdLogSuffix(_ data: [String: Any]) -> String {
        var parts: [String] = []
        if let v = data["id"] {
            let s = (v as? String) ?? String(describing: v)
            if !s.isEmpty { parts.append("id=\(s)") }
        }
        if let v = data["userId"] {
            let s = (v as? String) ?? String(describing: v)
            if !s.isEmpty { parts.append("userId=\(s)") }
        }
        if parts.isEmpty { return "" }
        return " " + parts.joined(separator: " ")
    }

    /// 当 appGetCircleDetail 标准解码失败时，尝试将 data 视为圈子对象直接解码（部分电站返回格式不同）
    private static func decodeCircleDetailFallback(from responseData: Data, decoder: JSONDecoder) -> CircleDetailResponse? {
        guard let top = try? JSONSerialization.jsonObject(with: responseData) as? [String: Any],
              let code = top["code"] as? Int, (code == 200 || code == 201),
              let dataAny = top["data"] else { return nil }
        // data 可能是 { circle, followStatus } 或 直接为圈子对象
        if let dataDict = dataAny as? [String: Any],
           let dataJson = try? JSONSerialization.data(withJSONObject: dataDict),
           let circle = try? decoder.decode(CircleItem.self, from: dataJson) {
            return CircleDetailResponse(circle: circle, followStatus: nil)
        }
        return nil
    }

    private func generateCacheKey(operation: String, data: [String: Any]) -> String {
        // 将字典转换为排序后的键值对数组，然后序列化为JSON
        let sortedKeys = data.keys.sorted()
        let sortedData = sortedKeys.compactMap { key -> String? in
            guard let value = data[key] else { return nil }
            // 将值转换为字符串表示
            if let stringValue = value as? String {
                return "\(key):\(stringValue)"
            } else if let numberValue = value as? NSNumber {
                return "\(key):\(numberValue)"
            } else if let boolValue = value as? Bool {
                return "\(key):\(boolValue)"
            } else {
                // 对于复杂类型，尝试JSON序列化
                if let jsonData = try? JSONSerialization.data(withJSONObject: value),
                   let jsonString = String(data: jsonData, encoding: .utf8) {
                    return "\(key):\(jsonString)"
                }
                return "\(key):\(String(describing: value))"
            }
        }
        let dataString = sortedData.joined(separator: "|")
        // 将 dataEnv 包含在缓存 key 中，确保不同数据环境的缓存互相隔离
        let dataEnv = AppConfig.dataEnv
        return "\(operation)_\(dataEnv)_\(dataString)"
    }
}

struct APIResponse<T: Codable>: Codable {
    let code: Int
    let data: T?
    let message: String?
    /// 服务端返回的请求 ID，便于与云端日志对应（可选，兼容未返回的版本）
    let requestId: String?
    /// 服务端在 token 即将过期（7 天内）时下发的刷新 token，客户端需保存以延长有效使用期
    let newToken: String?
}
