//
//  VisitorMessageItemView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct VisitorMessageItemView: View {
    let message: Message
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // 头像
            LazyAsyncImage(url: message.fromPhoto) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(Color(hex: "#1B1B1B"))
                    .overlay(
                        Image(systemName: "person.fill")
                            .font(.system(size: 20))
                            .foregroundColor(Color(hex: "#605D5D"))
                    )
            }
            .frame(width: 48, height: 48)
            .clipShape(Circle())
            
            // 用户信息
            VStack(alignment: .leading, spacing: 4) {
                Text(message.fromName)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                
                // 二级文本
                if let userInfo = message.userInfo?.first {
                    Text(userInfo.nickName ?? "")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#605D5D"))
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // 时间戳
            Text(message.formatDate ?? message.createTime.formatMessageDate())
                .font(.system(size: 12))
                .foregroundColor(Color(hex: "#605D5D"))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(Color(hex: "#000000"))
        .overlay(
            Rectangle()
                .fill(Color(hex: "#1B1B1B").opacity(0.3))
                .frame(height: 1)
                .offset(y: -0.5),
            alignment: .bottom
        )
    }
}
