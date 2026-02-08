//
//  AuthState.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation

/// 认证状态枚举
enum AuthState {
    case notAuthenticated  // 未登录
    case authenticating    // 登录中
    case authenticated     // 已登录
}

/// 认证流程枚举
enum AuthFlow {
    case languageVerify   // 语言验证
    case trialPeriod       // 试用期
    case nonMember         // 非会员（试用期已过）
    case member            // 会员
    case accountError      // 账号异常
}
