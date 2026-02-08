//
//  UserStatus.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation

/// 用户状态模型（使用 Post.swift 中定义的 UserJoinStatus）
struct UserStatus: Codable, Equatable {
    let joinStatus: UserJoinStatus?
    let vipStatus: Bool
    let trialStartTime: Int64?    // 试用期开始时间戳（毫秒）
    let trialDays: Int            // 试用期天数（默认7天）
    
    /// 判断是否为已验证用户
    var isVerified: Bool {
        return joinStatus == .normal
    }
    
    /// 判断是否为会员
    var isMember: Bool {
        return isVerified && vipStatus
    }
    
    /// 判断是否需要语言验证
    var needsLanguageVerify: Bool {
        return joinStatus != .normal
    }
}

/// 试用期模型
struct TrialPeriod {
    let startTime: Date
    let days: Int
    
    /// 试用期结束时间
    var endTime: Date {
        return Calendar.current.date(byAdding: .day, value: days, to: startTime) ?? startTime
    }
    
    /// 是否已过期
    var isExpired: Bool {
        return Date() > endTime
    }
    
    /// 剩余天数
    var remainingDays: Int {
        let remaining = Calendar.current.dateComponents([.day], from: Date(), to: endTime)
        return max(0, remaining.day ?? 0)
    }
    
    /// 剩余时间描述
    var remainingTimeDescription: String {
        if isExpired {
            return "试用期已过期"
        }
        let days = remainingDays
        if days > 0 {
            return "剩余 \(days) 天"
        } else {
            let hours = Calendar.current.dateComponents([.hour], from: Date(), to: endTime).hour ?? 0
            return "剩余 \(hours) 小时"
        }
    }
}
