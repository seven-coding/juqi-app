//
//  CommentMessageItemView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct CommentMessageItemView: View {
    let message: Message
    let onReplyTap: () -> Void
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
                        
                        // 描述标签
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
                            .lineLimit(1)
                    }
                }
                
                Spacer()
                
                // 回复按钮
                Button(action: onReplyTap) {
                    Text("回复")
                        .font(.system(size: 14))
                        .foregroundColor(.black)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 8)
                        .background(Color.white)
                        .cornerRadius(16)
                }
            }
            
            // 评论提示
            Text("评论了你的帖子:")
                .font(.system(size: 14))
                .foregroundColor(.white)
                .padding(.leading, 60)
            
            // 评论内容
            if let commentContent = message.message ?? message.msgText, !commentContent.isEmpty {
                Text(commentContent)
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .lineLimit(nil)
                    .padding(.leading, 60)
            }
            
            // 原帖子预览（带缩进），点击跳转帖子/用户
            if let postPreview = message.messageInfo?.first?.message ?? message.riskControlReason {
                Button(action: onViewTap) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(alignment: .top, spacing: 8) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color(hex: "#1B1B1B"))
                                .frame(width: 60, height: 60)
                                .overlay(
                                    Text("预览")
                                        .font(.system(size: 10))
                                        .foregroundColor(Color(hex: "#605D5D"))
                                )
                            Text(postPreview)
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#605D5D"))
                                .lineLimit(2)
                            Spacer()
                            Text("查看")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#FF6B35"))
                        }
                        .padding(12)
                        .background(Color(hex: "#1B1B1B").opacity(0.5))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color(hex: "#605D5D").opacity(0.3), lineWidth: 1)
                        )
                    }
                    .padding(.leading, 60)
                }
                .buttonStyle(.plain)
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
