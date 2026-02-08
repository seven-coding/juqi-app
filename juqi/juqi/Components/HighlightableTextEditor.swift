import SwiftUI
import UIKit

struct HighlightableTextEditor: UIViewRepresentable {
    @Binding var text: String
    @Binding var cursorPosition: Int
    var onSearchTrigger: (SearchTrigger) -> Void
    
    enum SearchTrigger {
        case none
        case topic(String)
        case user(String)
    }
    
    func makeUIView(context: Context) -> UITextView {
        let textView = UITextView()
        textView.backgroundColor = .clear
        textView.textColor = .white
        textView.font = .systemFont(ofSize: 19, weight: .medium)
        textView.delegate = context.coordinator
        textView.isScrollEnabled = true
        textView.dataDetectorTypes = []
        textView.autocapitalizationType = .none
        textView.autocorrectionType = .no
        
        // 设置行间距
        let style = NSMutableParagraphStyle()
        style.lineSpacing = 8
        textView.typingAttributes = [
            .paragraphStyle: style,
            .font: UIFont.systemFont(ofSize: 19, weight: .medium),
            .foregroundColor: UIColor.white
        ]
        
        return textView
    }
    
    func updateUIView(_ uiView: UITextView, context: Context) {
        if uiView.text != text {
            uiView.attributedText = highlight(text)
            // 同步光标位置
            if cursorPosition <= text.utf16.count {
                uiView.selectedRange = NSRange(location: cursorPosition, length: 0)
            }
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UITextViewDelegate {
        var parent: HighlightableTextEditor
        
        init(_ parent: HighlightableTextEditor) {
            self.parent = parent
        }
        
        func textViewDidChange(_ textView: UITextView) {
            parent.text = textView.text
            highlightAndDetectSearch(textView)
        }
        
        func textViewDidChangeSelection(_ textView: UITextView) {
            DispatchQueue.main.async {
                self.parent.cursorPosition = textView.selectedRange.location
            }
            highlightAndDetectSearch(textView)
        }
        
        private func highlightAndDetectSearch(_ textView: UITextView) {
            let text = textView.text ?? ""
            textView.attributedText = parent.highlight(text)
            
            // 检测搜索触发
            let cursor = textView.selectedRange.location
            let textBeforeCursor = String(text.prefix(cursor))
            
            if let lastTopicStart = textBeforeCursor.lastIndex(of: "#") {
                let suffix = textBeforeCursor[lastTopicStart...]
                // 确保话题中没有空格
                if !suffix.contains(" ") {
                    let query = String(suffix.dropFirst())
                    DispatchQueue.main.async {
                        self.parent.onSearchTrigger(.topic(query))
                    }
                    return
                }
            }
            
            if let lastUserStart = textBeforeCursor.lastIndex(of: "@") {
                let suffix = textBeforeCursor[lastUserStart...]
                if !suffix.contains(" ") {
                    let query = String(suffix.dropFirst())
                    DispatchQueue.main.async {
                        self.parent.onSearchTrigger(.user(query))
                    }
                    return
                }
            }
            
            DispatchQueue.main.async {
                self.parent.onSearchTrigger(.none)
            }
        }
    }
    
    func highlight(_ text: String) -> NSAttributedString {
        let attributedString = NSMutableAttributedString(string: text)
        let fullRange = NSRange(location: 0, length: text.utf16.count)
        
        // 默认样式
        let style = NSMutableParagraphStyle()
        style.lineSpacing = 8
        attributedString.addAttribute(.paragraphStyle, value: style, range: fullRange)
        attributedString.addAttribute(.font, value: UIFont.systemFont(ofSize: 19, weight: .medium), range: fullRange)
        attributedString.addAttribute(.foregroundColor, value: UIColor.white, range: fullRange)
        
        let linkColor = UIColor(red: 255/255, green: 107/255, blue: 53/255, alpha: 1.0) // #FF6B35
        
        // 高亮话题 #...# 或 #...
        let topicRegex = try? NSRegularExpression(pattern: "#[^#\\s]+#?", options: [])
        topicRegex?.enumerateMatches(in: text, options: [], range: fullRange) { match, _, _ in
            if let range = match?.range {
                attributedString.addAttribute(.foregroundColor, value: linkColor, range: range)
            }
        }
        
        // 高亮 @用户
        let userRegex = try? NSRegularExpression(pattern: "@[^@\\s]+", options: [])
        userRegex?.enumerateMatches(in: text, options: [], range: fullRange) { match, _, _ in
            if let range = match?.range {
                attributedString.addAttribute(.foregroundColor, value: linkColor, range: range)
            }
        }
        
        return attributedString
    }
}
