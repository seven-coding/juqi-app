//
//  RichTextView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct RichTextView: View {
    let text: String
    var onTopicClick: ((String) -> Void)? = nil
    var onMentionClick: ((String) -> Void)? = nil
    
    var body: some View {
        let parts = parseText(text)
        
        // 由于 SwiftUI 的 Text 不支持在中间插入交互式按钮，
        // 我们使用一个流式布局或 AttributedString (iOS 15+)
        // 这里使用 AttributedString 结合 SwiftUI 的自动链接处理或自定义处理
        
        Text(attributedString(from: parts))
            .font(.system(size: 15))
            .lineSpacing(2)
    }
    
    private func attributedString(from parts: [TextPart]) -> AttributedString {
        var result = AttributedString()
        
        for part in parts {
            var attrPart = AttributedString(part.text)
            switch part.type {
            case .normal:
                attrPart.foregroundColor = .white
            case .topic:
                attrPart.foregroundColor = Color(hex: "#FF6B35")
                attrPart.font = .system(size: 15, weight: .medium)
                let topicName = part.text.replacingOccurrences(of: "#", with: "")
                if let encodedName = topicName.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
                   let url = URL(string: "juqi://topic/\(encodedName)") {
                    attrPart.link = url
                }
            case .mention:
                attrPart.foregroundColor = Color(hex: "#FF6B35")
                attrPart.font = .system(size: 15, weight: .medium)
                let userName = part.text.replacingOccurrences(of: "@", with: "")
                if let encodedName = userName.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
                   let url = URL(string: "juqi://user/\(encodedName)") {
                    attrPart.link = url
                }
            }
            result.append(attrPart)
        }
        
        return result
    }
    
    private enum PartType {
        case normal, topic, mention
    }
    
    private struct TextPart {
        let text: String
        let type: PartType
    }
    
    private func parseText(_ text: String) -> [TextPart] {
        var parts: [TextPart] = []
        
        // 话题模式：支持 #话题# 或 #话题（以空格或结尾结束）
        let topicPattern = "#[^#\\s]+#?"
        // Mention模式：@用户名（支持中文、字母、数字、下划线）
        let mentionPattern = "@[\\w\\u4e00-\\u9fa5]+"
        let combinedPattern = "(\(topicPattern))|(\(mentionPattern))"
        
        guard let regex = try? NSRegularExpression(pattern: combinedPattern, options: []) else {
            return [TextPart(text: text, type: .normal)]
        }
        
        let nsString = text as NSString
        let matches = regex.matches(in: text, options: [], range: NSRange(location: 0, length: nsString.length))
        
        var lastIndex = 0
        for match in matches {
            let range = match.range
            
            // 添加匹配之前的普通文本
            if range.location > lastIndex {
                let normalText = nsString.substring(with: NSRange(location: lastIndex, length: range.location - lastIndex))
                parts.append(TextPart(text: normalText, type: .normal))
            }
            
            // 添加匹配的内容
            let matchedText = nsString.substring(with: range)
            if matchedText.hasPrefix("#") {
                parts.append(TextPart(text: matchedText, type: .topic))
            } else if matchedText.hasPrefix("@") {
                parts.append(TextPart(text: matchedText, type: .mention))
            }
            
            lastIndex = range.location + range.length
        }
        
        // 添加剩余的文本
        if lastIndex < nsString.length {
            let remainingText = nsString.substring(from: lastIndex)
            parts.append(TextPart(text: remainingText, type: .normal))
        }
        
        return parts.isEmpty ? [TextPart(text: text, type: .normal)] : parts
    }
}
