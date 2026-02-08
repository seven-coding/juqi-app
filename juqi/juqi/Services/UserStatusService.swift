//
//  UserStatusService.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation
import Combine

/// 用户状态服务
class UserStatusService: ObservableObject {
    static let shared = UserStatusService()
    
    private init() {}
    
    /// 获取用户状态
    func getUserStatus() async throws -> UserStatus {
        let response: UserInfoResponse = try await NetworkService.shared.request(
            operation: "appGetUserInfo",
            needsToken: true
        )
        guard let data = response.data else {
            throw APIError.noData
        }
        return data.userStatus
    }
    
    /// 获取试用期信息
    func getTrialPeriod() -> TrialPeriod? {
        guard let startTime = AuthService.shared.getTrialStartTime() else {
            return nil
        }
        
        let userStatus = AuthService.shared.currentUserStatus
        let days = userStatus?.trialDays ?? 7
        
        return TrialPeriod(
            startTime: Date(timeIntervalSince1970: TimeInterval(startTime) / 1000),
            days: days
        )
    }
    
    /// 检查试用期是否有效
    func isTrialValid() -> Bool {
        guard let trial = getTrialPeriod() else {
            return false
        }
        return !trial.isExpired
    }
}
