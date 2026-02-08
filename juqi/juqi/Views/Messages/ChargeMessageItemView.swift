//
//  ChargeMessageItemView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct ChargeMessageItemView: View {
    let message: Message
    let onViewTap: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 用户信息行
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
                    HStack(spacing: 4) {
                        Text(message.fromName)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                        
                        // 描述标签（如果有）
                        if let desc = message.userInfo?.first?.nickName {
                            Text("(\(desc))")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#605D5D"))
                        }
                    }
                    
                    // 二级文本
                    if let userInfo = message.userInfo?.first {
                        Text(userInfo.nickName ?? "")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#605D5D"))
                            .lineLimit(2)
                    }
                }
                
                Spacer()
                
                // 查看按钮
                Button(action: onViewTap) {
                    Text("查看")
                        .font(.system(size: 14))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.white.opacity(0.3), lineWidth: 1)
                        )
                }
            }
            
            // 充电提示
            HStack(spacing: 8) {
                Text("为你的帖子充电")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                
                Image(systemName: "bolt.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Color(hex: "#FFD700"))
                
                Text("+1")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
            }
            .padding(.leading, 60) // 对齐到用户信息下方
            
            // 帖子预览
            if let postContent = message.message ?? message.msgText, !postContent.isEmpty {
                Text(postContent)
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#605D5D"))
                    .lineLimit(2)
                    .padding(.leading, 60)
            }
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
