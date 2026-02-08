//
//  ChatMessageView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct ChatMessageView: View {
    let message: Message
    let isFromCurrentUser: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if isFromCurrentUser {
                Spacer()
            }
            
            // 头像
            if !isFromCurrentUser {
                LazyAsyncImage(url: message.fromPhoto) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(hex: "#1B1B1B"))
                        .overlay(
                            Image(systemName: "person.fill")
                                .font(.system(size: 16))
                                .foregroundColor(Color(hex: "#605D5D"))
                        )
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())
            }
            
            // 消息气泡
            VStack(alignment: isFromCurrentUser ? .trailing : .leading, spacing: 4) {
                // 消息内容
                Text(message.msgText ?? message.message ?? "")
                    .font(.system(size: 15))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(hex: "#1B1B1B"))
                    .cornerRadius(8)
                
                // 时间戳
                Text(message.formatDate ?? message.createTime.formatMessageDate())
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "#605D5D"))
                    .padding(.horizontal, 4)
            }
            
            // 头像
            if isFromCurrentUser {
                LazyAsyncImage(url: message.fromPhoto) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(hex: "#1B1B1B"))
                        .overlay(
                            Image(systemName: "person.fill")
                                .font(.system(size: 16))
                                .foregroundColor(Color(hex: "#605D5D"))
                        )
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())
            }
            
            if !isFromCurrentUser {
                Spacer()
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }
}
