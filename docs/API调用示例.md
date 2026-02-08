# API调用示例文档

## 文档说明

本文档提供iOS App调用云函数API的详细示例代码。

---

## 一、基础调用方式

### 1.1 云函数调用封装

```swift
// APIService.swift
func callAppApi(operation: String, data: [String: Any]? = nil, token: String? = nil) async throws -> [String: Any] {
    var params: [String: Any] = [
        "operation": operation,
        "source": "v2"
    ]
    
    if let data = data {
        params["data"] = data
    }
    
    if let token = token {
        params["token"] = token
    }
    
    // 调用云函数
    let result = try await cloud.callFunction(name: "appApi", data: params)
    
    guard let resultDict = result.result as? [String: Any] else {
        throw APIError.invalidResponse
    }
    
    // 检查错误
    if let code = resultDict["code"] as? Int, code != 200 {
        let message = resultDict["message"] as? String ?? "未知错误"
        throw APIError.serverError(code: code, message: message)
    }
    
    return resultDict
}
```

---

## 二、接口调用示例

### 2.1 用户认证

#### 登录
```swift
func login(wechatCode: String) async throws -> LoginResponse {
    let result = try await callAppApi(
        operation: "appLogin",
        data: ["code": wechatCode]
    )
    
    guard let data = result["data"] as? [String: Any] else {
        throw APIError.invalidResponse
    }
    
    return try LoginResponse(from: data)
}
```

#### 获取用户信息
```swift
func getUserInfo(token: String) async throws -> UserStatus {
    let result = try await callAppApi(
        operation: "appGetUserInfo",
        token: token
    )
    
    guard let data = result["data"] as? [String: Any],
          let userStatus = data["userStatus"] as? [String: Any] else {
        throw APIError.invalidResponse
    }
    
    return try UserStatus(from: userStatus)
}
```

---

### 2.2 动态相关

#### 获取动态列表
```swift
func getDynList(
    type: String,
    page: Int = 1,
    limit: Int = 20,
    token: String
) async throws -> PostListResponse {
    var data: [String: Any] = [
        "type": type,
        "page": page,
        "limit": limit
    ]
    
    let result = try await callAppApi(
        operation: "appGetDynList",
        data: data,
        token: token
    )
    
    guard let responseData = result["data"] as? [String: Any] else {
        throw APIError.invalidResponse
    }
    
    return try PostListResponse(from: responseData)
}
```

#### 发布动态
```swift
func publishDyn(
    content: String,
    circleId: String,
    circleTitle: String,
    images: [String] = [],
    token: String
) async throws -> PublishResponse {
    let data: [String: Any] = [
        "dynContent": content,
        "circleId": circleId,
        "circleTitle": circleTitle,
        "imageIds": images,
        "topic": [],
        "ait": []
    ]
    
    let result = try await callAppApi(
        operation: "appPublishDyn",
        data: data,
        token: token
    )
    
    guard let responseData = result["data"] as? [String: Any] else {
        throw APIError.invalidResponse
    }
    
    return try PublishResponse(from: responseData)
}
```

#### 点赞动态
```swift
func likeDyn(dynId: String, token: String) async throws {
    let result = try await callAppApi(
        operation: "appLikeDyn",
        data: ["id": dynId],
        token: token
    )
    
    // 检查是否成功
    if let code = result["code"] as? Int, code != 200 {
        let message = result["message"] as? String ?? "点赞失败"
        throw APIError.serverError(code: code, message: message)
    }
}
```

---

### 2.3 用户相关

#### 获取用户主页
```swift
func getUserProfile(userId: String, token: String) async throws -> UserProfile {
    let result = try await callAppApi(
        operation: "appGetUserProfile",
        data: ["userId": userId],
        token: token
    )
    
    guard let data = result["data"] as? [String: Any],
          let userInfo = data["userInfo"] as? [String: Any] else {
        throw APIError.invalidResponse
    }
    
    return try UserProfile(from: userInfo)
}
```

#### 关注用户
```swift
func followUser(userId: String, token: String) async throws {
    let result = try await callAppApi(
        operation: "appFollowUser",
        data: ["userId": userId],
        token: token
    )
    
    if let code = result["code"] as? Int, code != 200 {
        let message = result["message"] as? String ?? "关注失败"
        throw APIError.serverError(code: code, message: message)
    }
}
```

---

### 2.4 评论相关

#### 获取评论列表
```swift
func getComments(
    dynId: String,
    page: Int = 1,
    limit: Int = 20,
    token: String
) async throws -> CommentListResponse {
    let data: [String: Any] = [
        "id": dynId,
        "page": page,
        "limit": limit
    ]
    
    let result = try await callAppApi(
        operation: "appGetDynComment",
        data: data,
        token: token
    )
    
    guard let responseData = result["data"] as? [String: Any] else {
        throw APIError.invalidResponse
    }
    
    return try CommentListResponse(from: responseData)
}
```

#### 提交评论
```swift
func commentDyn(
    dynId: String,
    content: String,
    replyToUserId: String? = nil,
    token: String
) async throws -> CommentResponse {
    var data: [String: Any] = [
        "id": dynId,
        "commentContent": content
    ]
    
    if let replyToUserId = replyToUserId {
        data["to"] = replyToUserId
    }
    
    let result = try await callAppApi(
        operation: "appCommentDyn",
        data: data,
        token: token
    )
    
    guard let responseData = result["data"] as? [String: Any] else {
        throw APIError.invalidResponse
    }
    
    return try CommentResponse(from: responseData)
}
```

---

## 三、错误处理

### 3.1 错误码处理

```swift
enum APIError: Error {
    case invalidResponse
    case serverError(code: Int, message: String)
    case networkError(Error)
    case unauthorized
    case forbidden
    case notFound
}

func handleAPIError(_ result: [String: Any]) throws {
    guard let code = result["code"] as? Int else {
        throw APIError.invalidResponse
    }
    
    let message = result["message"] as? String ?? "未知错误"
    
    switch code {
    case 200:
        return // 成功
    case 401:
        throw APIError.unauthorized
    case 403:
        throw APIError.forbidden
    case 404:
        throw APIError.notFound
    default:
        throw APIError.serverError(code: code, message: message)
    }
}
```

---

## 四、最佳实践

### 4.1 Token管理

```swift
class TokenManager {
    static let shared = TokenManager()
    
    private var currentToken: String?
    private var tokenExpiry: Date?
    
    func getToken() -> String? {
        // 检查token是否过期
        if let expiry = tokenExpiry, expiry < Date() {
            // Token已过期，需要刷新
            return nil
        }
        return currentToken
    }
    
    func setToken(_ token: String, expiresIn: TimeInterval = 30 * 24 * 60 * 60) {
        currentToken = token
        tokenExpiry = Date().addingTimeInterval(expiresIn)
    }
    
    func refreshToken() async throws {
        guard let token = currentToken else {
            throw APIError.unauthorized
        }
        
        let result = try await callAppApi(
            operation: "appRefreshToken",
            token: token
        )
        
        if let data = result["data"] as? [String: Any],
           let newToken = data["token"] as? String {
            setToken(newToken)
        }
    }
}
```

### 4.2 重试机制

```swift
func callWithRetry<T>(
    maxRetries: Int = 3,
    operation: @escaping () async throws -> T
) async throws -> T {
    var lastError: Error?
    
    for attempt in 1...maxRetries {
        do {
            return try await operation()
        } catch let error as APIError {
            lastError = error
            
            // 如果是401错误，尝试刷新token
            if case .unauthorized = error, attempt < maxRetries {
                try await TokenManager.shared.refreshToken()
                continue
            }
            
            // 其他错误或达到最大重试次数
            if attempt >= maxRetries {
                throw error
            }
            
            // 等待后重试
            try await Task.sleep(nanoseconds: UInt64(attempt * 1_000_000_000))
        } catch {
            lastError = error
            if attempt >= maxRetries {
                throw error
            }
        }
    }
    
    throw lastError ?? APIError.invalidResponse
}
```

---

**文档更新时间**: 2026-01-15
