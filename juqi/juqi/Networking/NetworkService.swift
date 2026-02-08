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
        print("📤 [NetworkService] 请求 - operation: \(operation), url: \(baseURL), needsToken: \(needsToken)")
        
        // 检查网络状态（DEBUG 下使用 localhost 时仍尝试请求，避免 NWPathMonitor 误报离线）
        if !shouldAttemptNetworkRequest {
            print("⚠️ [API] Network offline, checking cache...")
            // 尝试从缓存获取
            if useCache {
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
                    AuthService.shared.logout()
                }
                throw APIError.tokenExpired
            } else {
                print("✅ [Token] Token present, hasToken: true")
            }
        }
        
        // 尝试从缓存获取
        if useCache {
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
                    useCache: useCache
                )
                let duration = Int((Date().timeIntervalSince(startTime) * 1000))
                print("✅ [API Success] operation: \(operation), duration: \(duration)ms, attempt: \(attempt + 1)")
                return result
            } catch let error as APIError {
                lastError = error
                
                // 如果不需要重试或已达到最大重试次数
                if !error.isRetryable || attempt >= retryCount {
                    print("❌ [API Error] operation: \(operation), error: \(error.localizedDescription), retry: \(attempt)/\(retryCount), isRetryable: \(error.isRetryable)")
                    // 需要重新登录
                    if error.requiresReauth {
                        print("🔄 [Token] Token expired, logging out...")
                        await MainActor.run {
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
        // 使用真实后端API
        guard let url = URL(string: baseURL) else {
            print("❌ [API Error] Invalid URL: \(baseURL)")
            throw APIError.invalidURL
        }
        
        var body: [String: Any] = [
            "operation": operation,
            "data": data,
            "source": "v2", // 自动添加source='v2'参数标识App请求
            "dataEnv": AppConfig.dataEnv // 测试环境下可切换 测试数据/线上数据
        ]
        
        if needsToken, let token = token {
            body["token"] = token
        }
        
        print("📤 [HTTP Request] POST \(url.absoluteString), body: operation=\(operation), source=v2, dataEnv=\(AppConfig.dataEnv), hasToken=\(needsToken && token != nil)")
        
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
                print("❌ [HTTP Error] Invalid response type")
                throw APIError.invalidResponse
            }
            
            print("📥 [HTTP Response] status: \(httpResponse.statusCode), duration: \(requestDuration)ms")
            
            // 处理HTTP状态码
            switch httpResponse.statusCode {
            case 200...299:
                break
            case 401:
                print("❌ [HTTP Error] Unauthorized (401), logging out...")
                await MainActor.run {
                    AuthService.shared.logout()
                }
                throw APIError.tokenExpired
            case 500...599:
                print("❌ [HTTP Error] Server error: \(httpResponse.statusCode)")
                throw APIError.serverError(httpResponse.statusCode)
            default:
                print("❌ [HTTP Error] Unexpected status: \(httpResponse.statusCode)")
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
            let apiResponse = try decoder.decode(APIResponse<T>.self, from: responseData)
            
            // 处理API错误码
            if apiResponse.code == 401 {
                print("❌ [API Error] Token expired (401), logging out...")
                await MainActor.run {
                    AuthService.shared.logout()
                }
                throw APIError.tokenExpired
            }
            
            if apiResponse.code != 200 {
                print("❌ [API Error] operation: \(operation), code: \(apiResponse.code), message: \(apiResponse.message)")
                
                // 兼容服务端返回的 request timeout 消息，映射为客户端的 timeout 错误
                if apiResponse.code == 500 && apiResponse.message.lowercased().contains("timeout") {
                    throw APIError.timeout
                }
                
                throw APIError.apiError(code: apiResponse.code, message: apiResponse.message)
            }
            
            guard let resultData = apiResponse.data else {
                print("❌ [API Error] Response data is nil")
                throw APIError.unknown
            }
            
            print("✅ [API Response] operation: \(operation), code: \(apiResponse.code), hasData: true")
            
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
                print("❌ [Network Error] Timeout after \(timeoutInterval)s")
            } else if error.code == .notConnectedToInternet {
                apiError = .offline
                print("❌ [Network Error] Not connected to internet")
            } else if error.code == .cancelled {
                // -999：请求被取消。除冷启动外，还可能是：负载均衡/网关超时、服务端主动关闭连接、
                // 网络切换、App 进入后台、并发过多导致连接被挤掉。MinNum≥1 可减少冷启动，其余需从服务端/网络排查。
                apiError = .networkError(error)
                print("❌ [Network Error] Request cancelled (-999)，可能为云托管冷启动或连接中断，将重试")
            } else {
                apiError = .networkError(error)
                print("❌ [Network Error] \(error.localizedDescription)")
            }
            CrashReporter.shared.logError(apiError, context: [
                "operation": operation,
                "data": data
            ])
            throw apiError
        } catch let error as DecodingError {
            let apiError = APIError.decodingError(error)
            print("❌ [Decoding Error] operation: \(operation), error: \(error.localizedDescription)")
            CrashReporter.shared.logError(apiError, context: [
                "operation": operation,
                "data": data
            ])
            throw apiError
        } catch let error as APIError {
            print("❌ [API Error] operation: \(operation), error: \(error.localizedDescription)")
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
            print("❌ [Unknown Error] operation: \(operation), error: \(error.localizedDescription)")
            CrashReporter.shared.logError(apiError, context: [
                "operation": operation,
                "data": data
            ])
            throw apiError
        }
    }
    
    // MARK: - 辅助方法
    
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
    
    private func mockResponse<T: Codable>(for operation: String, data: [String: Any], needsToken: Bool = true) async throws -> T {
        print("📡 mockResponse - operation: \(operation), data: \(data)")
        
        // 这里可以根据 operation 返回模拟数据
        switch operation {
        case "appGetDynList":
            let type = data["type"] as? String ?? "all"
            let page = data["page"] as? Int ?? 1
            print("   📋 获取动态列表 - type: \(type), page: \(page)")
            var posts: [Post] = []
            
            // 预定义一些内容和表情
            let contents = [
                "这是一条带表情的动态 🥳✨🌈 感觉今天心情不错！",
                "正在参加 #姬圈才艺大赛# ，大家多多支持呀！@财神爷 来看我的作品",
                "分享一个最近发现的好地方 📍✨ #旅行日记#",
                "今天也要元气满满哦！🍭🍬🍦",
                "测试一下 @七一 的跳转功能，还有这个 #超级话题# 是否生效",
                "看到这个动态的你，也要开心哦 💖",
                "这是一条纯文字的动态，用来测试长文本的显示效果。文字内容稍微多一点点，看看在列表页的显示是否符合预期，是否会自动折叠并显示全文按钮。",
                "转发测试内容 @余散至秋",
                "1-9张图片的完整显示效果测试...",
                "连轴转快一个月了,最近喝的咖啡比去年一整年都多惹。来大姨妈+感冒+身体透支,今晚一定要好好睡一觉!忙完这阵子要去旅游几天,一想到下半年就要住新房了就感觉自己当牛马还是值得的,过完年回来就要开始装修了,想想就有点小激动。虽然工作很累,但是想到未来的美好生活,就觉得所有的努力都是值得的。最近在看各种装修风格,北欧风、日式风、现代简约风,每一种都很好看,但是预算有限,只能选择性价比最高的方案。希望装修出来的效果能让自己满意,毕竟这是要住很久的地方。最近也在学习一些装修知识,比如水电改造、防水工程、材料选择等等,感觉装修真的是一门大学问。不过好在现在网络发达,可以看很多装修案例和教程,也能找到很多实用的建议。希望到时候能少踩一些坑,毕竟装修一次不容易,要尽量做到完美。最近也在考虑要不要请设计师,虽然会增加一些成本,但是专业的设计师应该能给出更好的方案,也能避免很多不必要的麻烦。不过还是要看预算,如果预算紧张的话,可能就只能自己设计了。不管怎样,都希望装修能顺利进行,早日住进新房子。最近也在看一些家具和软装,感觉要买的东西真的很多,床、沙发、餐桌、椅子、衣柜、书桌等等,每一件都要仔细挑选。希望能在预算范围内买到性价比高的产品,毕竟家具也是要长期使用的,质量一定要好。最近也在考虑要不要买一些智能家居产品,比如智能门锁、智能灯光、智能窗帘等等,虽然会增加一些成本,但是能提升生活品质,感觉还是值得的。不过还是要看实际需求,不能盲目追求高科技,要选择真正实用的产品。最近也在学习一些收纳技巧,毕竟房子空间有限,要学会合理利用空间,让家里看起来更整洁。希望装修完成后,能有一个舒适温馨的家,每天下班回来都能感受到家的温暖。最近也在考虑要不要养一些绿植,既能净化空气,又能美化环境,感觉是个不错的选择。不过还是要看自己的时间和精力,毕竟养植物也需要一定的照顾。希望未来的生活能越来越好,工作顺利,生活幸福,家人健康,这就是最大的愿望了。最近开始研究各种装修材料,从地板到墙面,从灯具到窗帘,每一个细节都要仔细考虑。实木地板虽然好看但价格昂贵,复合地板性价比高但质感稍差,瓷砖耐用但不够温馨。墙面涂料的选择也很重要,环保无味的乳胶漆是首选,但颜色搭配需要仔细考虑。灯具的选择更是关键,既要保证照明效果,又要符合整体装修风格。现代简约风格适合简洁的吊灯,北欧风格适合温暖的壁灯,日式风格则更适合柔和的落地灯。窗帘的选择也很重要,既要保证隐私,又要让阳光能够透进来。厚重的遮光窗帘适合卧室,轻薄的纱帘适合客厅。每一个细节都需要仔细考虑,才能打造出一个完美的家。"
            ]
            
            // 生成1-9张图片的动态
            for i in 1...9 {
                let images = (1...i).map { "https://picsum.photos/400/400?random=\(i * 10 + $0)" }
                posts.append(Post(
                    id: "mock_\(i)",
                    userId: "\(i)",
                    userName: "测试用户_\(i)张图",
                    userAvatar: "https://picsum.photos/100/100?random=\(i)",
                    userSignature: "这是第\(i)个测试用户的签名效果",
                    isVip: i % 2 == 0,
                    content: contents[min(i-1, contents.count-1)],
                    images: images,
                    tag: .daily,
                    publishTime: Date().addingTimeInterval(TimeInterval(-i * 3600)),
                    commentCount: i * 2,
                    likeCount: i * 5,
                    shareCount: i,
                    chargeCount: i % 3,
                    isLiked: false,
                    isCollected: false,
                    isCharged: i % 4 == 0,
                    repostPost: i == 5 ? Post.RepostPost(
                        id: "repost_1",
                        userId: "user_99",
                        userName: "七一",
                        userAvatar: "https://picsum.photos/100/100?random=99",
                        content: "测试",
                        images: nil
                    ) : nil,
                    likeUsers: nil,
                    joinCount: nil,
                    circleId: nil,
                    circleTitle: nil,
                    circleJoinCount: nil,
                    voiceUrl: nil,
                    voiceDuration: nil,
                    videoUrl: nil,
                    musicInfo: nil
                ))
            }
            
            // 添加一个超过1000字的长文本动态（无图片）
            if contents.count > 9 {
                posts.append(Post(
                    id: "mock_long_text",
                    userId: "long_text_user",
                    userName: "长文本测试用户",
                    userAvatar: "https://picsum.photos/100/100?random=999",
                    userSignature: "这是一个测试长文本显示的用户",
                    isVip: true,
                    content: contents[9], // 使用第10个内容（超过1000字）
                    images: nil,
                    tag: .daily,
                    publishTime: Date().addingTimeInterval(TimeInterval(-3600)),
                    commentCount: 10,
                    likeCount: 20,
                    shareCount: 5,
                    chargeCount: 3,
                    isLiked: false,
                    isCollected: false,
                    isCharged: false,
                    repostPost: nil,
                    likeUsers: nil,
                    joinCount: nil,
                    circleId: nil,
                    circleTitle: nil,
                    circleJoinCount: nil,
                    voiceUrl: nil,
                    voiceDuration: nil,
                    videoUrl: nil,
                    musicInfo: nil
                ))
            }
            
            let response = DynListResponse(list: posts, total: 100, hasMore: true)
            print("   ✅ 返回模拟数据 - 动态数量: \(posts.count)")
            return response as! T
            
        case "appLikeDyn", "appRepostDyn", "appChargeDyn":
            return EmptyResponse() as! T
            
        case "appGetTopicList":
            let topics = [
                Topic(id: "1", name: "姬圈才艺大赛", icon: nil),
                Topic(id: "2", name: "日常", icon: nil),
                Topic(id: "3", name: "情感交流", icon: nil)
            ]
            return topics as! T
            
        case "appPublishDyn":
            let response = PublishResponse(
                dynId: "dyn_\(UUID().uuidString)",
                code: 200,
                message: "发布成功",
                requestID: UUID().uuidString
            )
            return response as! T
            
        case "appUploadImage":
            // 模拟上传，返回一个图片URL
            let imageUrl = "https://picsum.photos/400/400?random=\(Int.random(in: 1...1000))"
            let response = ImageUploadResponse(url: imageUrl)
            return response as! T
            
        case "appSearchTopic":
            let keyword = data["keyword"] as? String
            var topics = [
                Topic(id: "1", name: "姬圈才艺大赛", icon: nil),
                Topic(id: "2", name: "日常", icon: nil),
                Topic(id: "3", name: "情感交流", icon: nil)
            ]
            if let keyword = keyword, !keyword.isEmpty {
                topics = topics.filter { $0.name.contains(keyword) }
            }
            return topics as! T
            
        case "appCreateTopic":
            let topicName = data["topic"] as? String ?? "新话题"
            let topic = Topic(id: UUID().uuidString, name: topicName, icon: nil)
            return topic as! T
            
        case "appSearchUser":
            let keyword = data["keyword"] as? String ?? ""
            let users = [
                User(id: "1", userName: "用户\(keyword)1", avatar: nil, signature: "签名1", isVip: false),
                User(id: "2", userName: "用户\(keyword)2", avatar: nil, signature: "签名2", isVip: true)
            ]
            return users as! T
            
        case "appGetDynDetail":
            let postId = data["id"] as? String ?? "1"
            // 模拟详情数据，包含互动用户列表
            let likeUsers = [
                Post.LikeUser(id: "1", userName: "用户1", avatar: "https://picsum.photos/100/100?random=1"),
                Post.LikeUser(id: "2", userName: "用户2", avatar: "https://picsum.photos/100/100?random=2"),
                Post.LikeUser(id: "3", userName: "用户3", avatar: "https://picsum.photos/100/100?random=3"),
                Post.LikeUser(id: "4", userName: "用户4", avatar: "https://picsum.photos/100/100?random=4"),
                Post.LikeUser(id: "5", userName: "用户5", avatar: "https://picsum.photos/100/100?random=5")
            ]
            
            // 创建1月2日 20:57的日期（当前年份）
            let calendar = Calendar.current
            let now = Date()
            let year = calendar.component(.year, from: now)
            var dateComponents = DateComponents()
            dateComponents.year = year
            dateComponents.month = 1
            dateComponents.day = 2
            dateComponents.hour = 20
            dateComponents.minute = 57
            let publishDate = calendar.date(from: dateComponents) ?? Date().addingTimeInterval(-86400 * 2)
            
            let post = Post(
                id: postId,
                userId: "1",
                userName: "七一",
                userAvatar: "https://picsum.photos/200/200?random=10",
                userSignature: "既难飞至，则必跛行",
                isVip: true,
                content: "国际大农村测试下照片功能",
                images: ["https://picsum.photos/800/600?random=20"],
                tag: .daily,
                publishTime: publishDate,
                commentCount: 5,
                likeCount: 10,
                shareCount: 3,
                chargeCount: 2,
                isLiked: false,
                isCollected: false,
                isCharged: false,
                repostPost: nil,
                likeUsers: likeUsers,
                joinCount: 4266,
                circleId: "circle_1",
                circleTitle: "日常",
                circleJoinCount: 4266,
                voiceUrl: nil,
                voiceDuration: nil,
                videoUrl: nil,
                musicInfo: nil
            )
            return post as! T
            
        case "appGetDynComment":
            let postId = data["id"] as? String ?? "1"
            let page = data["page"] as? Int ?? 1
            let limit = data["limit"] as? Int ?? 20
            
            // 模拟评论数据
            let now = Date()
            
            var comments: [Comment] = []
            
            // 生成一级评论
            for i in 0..<min(5, limit) {
                let commentDate = now.addingTimeInterval(-Double(i * 3600))
                let replies: [Comment]? = i < 2 ? [
                    Comment(
                        id: "reply_\(i)_1",
                        postId: postId,
                        userId: "user_reply_\(i)_1",
                        userName: "回复用户\(i)_1",
                        userAvatar: "https://picsum.photos/100/100?random=\(i + 100)",
                        content: "这是一条回复评论",
                        imagePath: nil,
                        publishTime: commentDate.addingTimeInterval(-1800),
                        likeCount: 2,
                        isLiked: false,
                        replies: nil,
                        mentionedUsers: nil,
                        replyToUserId: "user_\(i)",
                        replyToUserName: "用户\(i)",
                        forwardStatus: false
                    )
                ] : nil
                
                let comment = Comment(
                    id: "comment_\(i)",
                    postId: postId,
                    userId: "user_\(i)",
                    userName: "用户\(i)",
                    userAvatar: "https://picsum.photos/100/100?random=\(i + 50)",
                    content: "这是一条评论内容，可以包含文字和图片。评论\(i + 1)",
                    imagePath: i == 0 ? "https://picsum.photos/400/400?random=\(i + 200)" : nil,
                    publishTime: commentDate,
                    likeCount: i + 1,
                    isLiked: i % 2 == 0,
                    replies: replies,
                    mentionedUsers: i == 0 ? [
                        Comment.MentionedUser(id: "mentioned_1", userName: "被@的用户")
                    ] : nil,
                    replyToUserId: nil,
                    replyToUserName: nil,
                    forwardStatus: false
                )
                comments.append(comment)
            }
            
            let response = CommentListResponse(
                list: comments,
                total: 10,
                hasMore: page * limit < 10
            )
            return response as! T
            
        case "appCommentDyn":
            let commentId = "comment_\(UUID().uuidString)"
            let response = CommentResponse(
                commentId: commentId,
                code: 200,
                message: "评论成功"
            )
            return response as! T
            
        case "appLikeComment":
            return EmptyResponse() as! T
            
        case "appFollowUser", "appUnfollowUser":
            return EmptyResponse() as! T
            
        case "appGetCurrentUserProfile":
            let profile = UserProfile(
                id: "current_user_id",
                userName: "我本人",
                avatar: "https://picsum.photos/100/100?random=100",
                signature: "我的个性签名",
                isVip: true,
                level: 5,
                age: 25,
                constellation: "处女座",
                city: "上海",
                followCount: 100,
                followerCount: 200,
                isFollowing: nil,
                isCharged: nil,
                chargeCount: 10,
                chargeNums: 50,
                followStatus: nil,
                chargingStatus: false,
                joinStatus: .normal,
                blackStatus: BlackStatus.none,
                restStatus: false,
                vipStatus: true,
                vipConfig: nil,
                imgList: nil,
                bindUserInfo: nil,
                ownOpenId: "current_user_id",
                publishCount: 20,
                collectionCount: 5,
                inviteCount: 2,
                blockedCount: 0
            )
            return profile as! T
            
        case "appGetUserProfile":
            let targetUserId = data["userId"] as? String ?? "1"
            let currentUserId = "current_user_id"
            
            // 根据userId生成不同的用户信息
            let isOwnProfile = targetUserId == currentUserId
            let userName = isOwnProfile ? "我本人" : (targetUserId == "1" ? "七一" : "用户\(targetUserId)")
            
            let profile = UserProfile(
                id: targetUserId,
                userName: userName,
                avatar: "https://picsum.photos/200/200?random=\(targetUserId)",
                signature: targetUserId == "1" ? "既难飞至,则必跛行" : "这是\(userName)的个性签名",
                isVip: targetUserId == "1" || targetUserId == currentUserId,
                level: targetUserId == "1" ? 1426 : Int.random(in: 100...1000),
                age: targetUserId == "1" ? 35 : Int.random(in: 18...40),
                constellation: targetUserId == "1" ? "魔羯" : "天秤",
                city: targetUserId == "1" ? "广州" : "北京",
                followCount: targetUserId == "1" ? 6 : Int.random(in: 10...100),
                followerCount: targetUserId == "1" ? 30 : Int.random(in: 20...200),
                isFollowing: isOwnProfile ? nil : (targetUserId == "1" ? false : Bool.random()),
                isCharged: isOwnProfile ? nil : false,
                chargeCount: targetUserId == "1" ? 10 : Int.random(in: 5...50),
                chargeNums: targetUserId == "1" ? 1426 : Int.random(in: 100...2000),
                followStatus: isOwnProfile ? nil : (targetUserId == "1" ? .notFollowing : .following),
                chargingStatus: isOwnProfile ? nil : false,
                joinStatus: .normal,
                blackStatus: BlackStatus.none,
                restStatus: false,
                vipStatus: targetUserId == "1" || targetUserId == currentUserId,
                vipConfig: nil,
                imgList: targetUserId == "1" ? ["https://picsum.photos/400/300?random=1", "https://picsum.photos/400/300?random=2"] : nil,
                bindUserInfo: nil,
                ownOpenId: currentUserId,
                publishCount: targetUserId == "1" ? 15 : Int.random(in: 5...30),
                collectionCount: targetUserId == "1" ? 8 : Int.random(in: 3...20),
                inviteCount: targetUserId == "1" ? 3 : Int.random(in: 0...10),
                blockedCount: targetUserId == "1" ? 0 : Int.random(in: 0...5)
            )
            return profile as! T
            
        case "appGetUserDynList":
            let targetUserId = data["userId"] as? String
            let page = data["page"] as? Int ?? 1
            let limit = data["limit"] as? Int ?? 20
            
            // 生成该用户的动态列表
            var posts: [Post] = []
            for i in 0..<limit {
                let postId = "user_\(targetUserId ?? "1")_dyn_\(page)_\(i)"
                let images = (0..<min(3, i % 4)).map { "https://picsum.photos/400/400?random=\(i * 10 + $0)" }
                
                posts.append(Post(
                    id: postId,
                    userId: targetUserId ?? "1",
                    userName: targetUserId == "1" ? "七一" : "用户\(targetUserId ?? "1")",
                    userAvatar: "https://picsum.photos/100/100?random=\(targetUserId ?? "1")",
                    userSignature: targetUserId == "1" ? "既难飞至,则必跛行" : nil,
                    isVip: targetUserId == "1",
                    content: "这是用户\(targetUserId ?? "1")发布的第\(page)页第\(i+1)条动态",
                    images: images.isEmpty ? nil : images,
                    tag: .daily,
                    publishTime: Date().addingTimeInterval(TimeInterval(-i * 3600)),
                    commentCount: i * 2,
                    likeCount: i * 5,
                    shareCount: i,
                    chargeCount: i % 3,
                    isLiked: false,
                    isCollected: false,
                    isCharged: i % 4 == 0,
                    repostPost: nil,
                    likeUsers: nil,
                    joinCount: nil,
                    circleId: nil,
                    circleTitle: nil,
                    circleJoinCount: nil,
                    voiceUrl: nil,
                    voiceDuration: nil,
                    videoUrl: nil,
                    musicInfo: nil
                ))
            }
            
            let response = DynListResponse(list: posts, total: 50, hasMore: page * limit < 50)
            return response as! T
            
        case "appChargeUser", "appBlackUser", "appUnblackUser", "appSetUserStatus", "appSetUserAuth":
            return EmptyResponse() as! T
            
        case "appGetUserActionHistory":
            _ = data["userId"] as? String ?? "1"
            let history: [UserActionHistory] = [
                UserActionHistory(
                    id: "action_1",
                    type: 14,
                    reason: "违规内容",
                    createTime: Date().addingTimeInterval(-86400),
                    content: "封禁"
                )
            ]
            return history as! T
            
        case "appGetUserFollowStatus":
            _ = data["userId"] as? String ?? "1"
            let response = FollowStatusResponse(followStatus: 1) // 1 = notFollowing
            return response as! T
            
        case "appLogin":
            // 模拟登录响应（request 返回的是 data 部分，即 LoginData）
            _ = data["code"] as? String ?? "mock_code"
            let loginData = LoginData(
                token: "mock_token_\(UUID().uuidString)",
                openId: "mock_openid_\(UUID().uuidString)",
                joinStatus: 0,
                vipStatus: false,
                trialStartTime: nil as Int64?,
                trialDays: 7
            )
            return loginData as! T
            
        case "appGetUserInfo":
            // 模拟获取用户信息响应
            let userStatus = UserStatus(
                joinStatus: .normal,
                vipStatus: false,
                trialStartTime: nil,
                trialDays: 7
            )
            let userInfoData = UserInfoData(userStatus: userStatus)
            let response = UserInfoResponse(code: 200, data: userInfoData, message: "成功")
            return response as! T
            
        case "appSubmitLanguageVerify":
            // 模拟提交语言验证响应
            let verifyData = VerifySubmitData(
                verifyId: "verify_\(UUID().uuidString)",
                status: 0 // 待审核
            )
            let response = VerifySubmitResponse(code: 200, message: "提交成功", data: verifyData)
            return response as! T
            
        case "appGetVerifyStatus":
            // 模拟获取审核状态响应
            let verifyStatus = VerifyStatus(
                status: .pending,
                joinStatus: 3,
                likeCount: 1,
                message: nil
            )
            let response = VerifyStatusResponse(code: 200, data: verifyStatus, message: "成功")
            return response as! T
            
        case "getMessagesNew":
            // 模拟消息列表响应
            let page = data["page"] as? Int ?? 1
            let limit = data["limit"] as? Int ?? 20
            
            var messages: [Message] = []
            let now = Date()
            
            // 生成模拟消息数据
            for i in 0..<min(limit, 10) {
                let messageDate = now.addingTimeInterval(-Double(i * 3600))
                let messageId = "msg_\(page)_\(i)"
                
                // 根据索引生成不同类型的消息
                let messageType: Int
                let fromName: String
                let fromPhoto: String?
                let msgText: String
                
                switch i % 5 {
                case 0:
                    messageType = 20 // 私信
                    fromName = "车厘子好吃"
                    fromPhoto = "https://picsum.photos/100/100?random=\(i + 100)"
                    msgText = "请你吃了个🍑"
                case 1:
                    messageType = 19 // 评论点赞
                    fromName = "橘气风纪委员"
                    fromPhoto = nil
                    msgText = "你的评论被点赞了"
                case 2:
                    messageType = 16 // 关注
                    fromName = "橘气风纪委员"
                    fromPhoto = nil
                    msgText = "关注提醒"
                case 3:
                    messageType = 18 // 系统通知
                    fromName = "橘气风纪委员"
                    fromPhoto = "https://picsum.photos/100/100?random=\(i + 200)"
                    msgText = "您发布的帖子内容经过审核..."
                case 4:
                    messageType = 18 // 系统通知
                    fromName = "橘卡丘"
                    fromPhoto = nil
                    msgText = "100个橘气币已放入你的背..."
                default:
                    messageType = 20
                    fromName = "用户\(i)"
                    fromPhoto = "https://picsum.photos/100/100?random=\(i + 300)"
                    msgText = "这是一条消息"
                }
                
                let message = Message(
                    id: messageId,
                    from: "user_\(i)",
                    fromName: fromName,
                    fromPhoto: fromPhoto,
                    type: messageType,
                    message: msgText,
                    msgText: msgText,
                    createTime: messageDate,
                    formatDate: messageDate.formatMessageDate(),
                    status: i % 3 == 0 ? 0 : 1, // 部分未读
                    noReadCount: i % 3 == 0 ? (i % 5 + 1) : 0,
                    groupType: nil,
                    groupId: nil,
                    url: nil,
                    chatId: nil,
                    dynId: nil,
                    user: nil,
                    circles: nil,
                    userInfo: nil,
                    messageInfo: nil,
                    riskControlReason: nil
                )
                messages.append(message)
            }
            
            // 生成未读数量统计
            let notReadCount = MessageNotReadCount(
                chargeNums: MessageCount(total: 1),
                commentNums: MessageCount(total: 0),
                aitType1Nums: MessageCount(total: 0),
                aitType2Nums: MessageCount(total: 0),
                visitorNums: MessageCount(total: 1)
            )
            
            let response = MessageListResponse(
                messages: messages,
                count: 50,
                notReadCount: notReadCount
            )
            return response as! T
            
        case "setMessage":
            // 模拟设置消息状态响应
            return EmptyResponse() as! T
            
        default:
            throw APIError.apiError(code: 404, message: "未实现的接口")
        }
    }
}

struct APIResponse<T: Codable>: Codable {
    let code: Int
    let data: T?
    let message: String
}
