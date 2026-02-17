//
//  SessionMessageRowView.swift
//  juqi
//
//  会话详情页单条消息行（只读），点击可跳转动态或用户主页。
//

import SwiftUI

struct SessionMessageRowView: View {
    let message: Message
    /// 点击回调：第一个为 dynId（跳帖子），第二个为 userId（跳用户）
    let onTap: (String?, String?) -> Void
    
    var body: some View {
        Button(action: {
            if let dynId = message.dynId, !dynId.isEmpty {
                onTap(dynId, nil)
            } else {
                onTap(nil, message.from)
            }
        }) {
            HStack(alignment: .top, spacing: 8) {
                LazyAsyncImage(url: message.fromPhoto) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(hex: "#1B1B1B"))
                        .overlay(
                            Image(systemName: message.type == 18 ? "person.fill" : "person")
                                .font(.system(size: 16))
                                .foregroundColor(Color(hex: "#605D5D"))
                        )
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(message.msgText ?? message.message ?? "")
                        .font(.system(size: 15))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color(hex: "#1B1B1B"))
                        .cornerRadius(8)
                    
                    Text(message.formatDate ?? message.createTime.formatMessageDate())
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "#605D5D"))
                        .padding(.horizontal, 4)
                }
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }
}
