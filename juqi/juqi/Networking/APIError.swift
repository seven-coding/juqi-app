//
//  APIError.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation

enum APIError: Error, Equatable {
    case invalidURL
    case networkError(Error)
    case invalidResponse
    case noData
    case apiError(code: Int, message: String)
    case decodingError(Error)
    case timeout
    case offline
    case tokenExpired
    case serverError(Int)
    case unknown
    
    /// 日志用：错误类型短标签（超时、解码失败、接口错误等），便于直接看出原因
    var errorType: String {
        switch self {
        case .timeout: return "timeout"
        case .offline: return "offline"
        case .decodingError: return "decoding"
        case .apiError: return "api_error"
        case .tokenExpired: return "token_expired"
        case .serverError: return "server_error"
        case .networkError: return "network"
        case .invalidURL: return "invalid_url"
        case .invalidResponse: return "invalid_response"
        case .noData: return "no_data"
        case .unknown: return "unknown"
        }
    }

    var localizedDescription: String {
        switch self {
        case .invalidURL:
            return "无效的URL"
        case .networkError(let error):
            let ns = error as NSError
            return "网络错误 (\(ns.code))"
        case .invalidResponse:
            return "服务器响应异常"
        case .noData:
            return "暂无数据"
        case .apiError(let code, let message):
            return "服务异常(\(code)): \(message)"
        case .decodingError:
            return "数据解析失败"
        case .timeout:
            return "请求超时，请稍后重试"
        case .offline:
            return "网络连接不可用"
        case .tokenExpired:
            return "登录已过期"
        case .serverError(let code):
            return "服务器错误(\(code))"
        case .unknown:
            return "未知错误"
        }
    }
    
    /// 用户友好的错误提示
    var userMessage: String {
        switch self {
        case .timeout:
            return "网络请求超时，请检查网络后重试"
        case .offline:
            return "当前网络不可用，请检查网络设置"
        case .networkError(let err):
            if (err as? URLError)?.code == .cancelled {
                return "连接被取消或中断（如云托管冷启动），请稍后重试"
            }
            return "网络异常，请稍后重试"
        case .serverError, .apiError(500...599, _):
            return "服务器开小差了，请稍后再试"
        case .tokenExpired:
            return "登录状态已失效，请重新登录"
        case .decodingError, .invalidResponse:
            return "数据处理异常，请联系客服或稍后重试"
        default:
            return "加载失败，请稍后重试"
        }
    }
    
    /// 错误对应的图标
    var iconName: String {
        switch self {
        case .timeout:
            return "timer"
        case .offline:
            return "wifi.slash"
        case .serverError, .apiError(500...599, _):
            return "exclamationmark.icloud"
        case .tokenExpired:
            return "person.badge.key"
        default:
            return "exclamationmark.circle"
        }
    }
    
    /// 是否可重试的错误（服务端 500/request timeout 多为冷启动或瞬时超时，重试可成功）
    /// 明确的服务端代码错误（如 SyntaxError、functions execute fail）不重试，避免长时间无效等待
    /// 注意：Task 取消导致的 CancellationError 不重试，直接向上抛出
    var isRetryable: Bool {
        switch self {
        case .timeout, .offline, .serverError(500...599):
            return true
        case .networkError(let err):
            if err is CancellationError { return false }
            return true
        case .apiError(let code, let message) where (500...599).contains(code):
            return !Self.isServerCodeError(message)
        default:
            return false
        }
    }
    
    /// 服务端返回的“代码/配置错误”特征，此类错误重试无意义
    private static func isServerCodeError(_ message: String) -> Bool {
        let m = message.lowercased()
        return m.contains("syntaxerror") || m.contains("functions execute fail")
    }
    
    /// 是否需要重新登录
    var requiresReauth: Bool {
        switch self {
        case .tokenExpired, .apiError(401, _):
            return true
        default:
            return false
        }
    }
}

// MARK: - Equatable 实现（Error 无 Equatable，带 Error 的 case 需手动实现 ==）
extension APIError {
    static func == (lhs: APIError, rhs: APIError) -> Bool {
        switch (lhs, rhs) {
        case (.invalidURL, .invalidURL),
             (.invalidResponse, .invalidResponse),
             (.noData, .noData),
             (.timeout, .timeout),
             (.offline, .offline),
             (.tokenExpired, .tokenExpired),
             (.unknown, .unknown):
            return true
        case (.apiError(let c1, let m1), .apiError(let c2, let m2)):
            return c1 == c2 && m1 == m2
        case (.serverError(let c1), .serverError(let c2)):
            return c1 == c2
        case (.networkError(let e1), .networkError(let e2)):
            let n1 = e1 as NSError, n2 = e2 as NSError
            return n1.domain == n2.domain && n1.code == n2.code
        case (.decodingError(let e1), .decodingError(let e2)):
            let n1 = e1 as NSError, n2 = e2 as NSError
            return n1.domain == n2.domain && n1.code == n2.code
        default:
            return false
        }
    }
}
