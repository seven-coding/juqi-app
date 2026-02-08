//
//  Date+Format.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import Foundation

extension Date {
    /// 格式化消息日期，参考小程序逻辑
    func formatMessageDate() -> String {
        let now = Date()
        
        // 计算时间差（秒）
        let timeGap = now.timeIntervalSince(self)
        let days = Int(timeGap / 86400)
        let hours = Int((timeGap.truncatingRemainder(dividingBy: 86400)) / 3600)
        let minutes = Int((timeGap.truncatingRemainder(dividingBy: 3600)) / 60)
        let seconds = Int(timeGap.truncatingRemainder(dividingBy: 60))
        
        // 30天以上：显示完整日期时间
        if days >= 30 {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd HH:mm"
            return formatter.string(from: self)
        }
        
        // 3-30天：显示月-日 时:分
        if days >= 3 && days < 30 {
            let formatter = DateFormatter()
            formatter.dateFormat = "MM-dd HH:mm"
            return formatter.string(from: self)
        }
        
        // 1-8天：显示"X天前"
        if days > 0 && days < 8 {
            return "\(days)天前"
        }
        
        // 1小时以上：显示"X小时前"
        if hours > 0 {
            return "\(hours)小时前"
        }
        
        // 1分钟以上：显示"X分钟前"
        if minutes > 0 {
            return "\(minutes)分钟前"
        }
        
        // 1秒以上：显示"X秒前"
        if seconds > 0 {
            return "\(seconds)秒前"
        }
        
        // 刚刚
        return "刚刚发表"
    }
    
    /// 从时间戳字符串创建Date（支持毫秒和秒）
    static func fromTimestamp(_ timestamp: String) -> Date? {
        guard let timestampValue = Double(timestamp) else { return nil }
        
        // 判断是毫秒还是秒（大于10位数字认为是毫秒）
        let timeInterval: TimeInterval
        if timestamp.count > 10 {
            timeInterval = timestampValue / 1000.0
        } else {
            timeInterval = timestampValue
        }
        
        return Date(timeIntervalSince1970: timeInterval)
    }
}
