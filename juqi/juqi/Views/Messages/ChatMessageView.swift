//
//  ChatMessageView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct ChatMessageView: View {
    let message: Message
    /// true = 自己（右侧），false = 对方（左侧）
    let isFromCurrentUser: Bool
    @State private var showImagePreview = false
    
    private var bubbleBackground: Color {
        isFromCurrentUser ? Color(hex: "#FF6B35") : Color(hex: "#1B1B1B")
    }
    
    var body: some View {
        // 左右结构：对方在左（头像+内容），自己在右（内容+头像）
        HStack(alignment: .top, spacing: 8) {
            if !isFromCurrentUser {
                // 左侧：对方头像 + 气泡
                HStack(alignment: .top, spacing: 8) {
                    avatarView
                    bubbleContent
                    Spacer(minLength: 48)
                }
            } else {
                // 右侧：自己的内容 + 头像（整行右对齐）
                HStack(alignment: .top, spacing: 8) {
                    Spacer(minLength: 48)
                    bubbleContent
                    avatarView
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .fullScreenCover(isPresented: $showImagePreview) {
            ImagePreviewView(images: [message.message ?? ""], currentIndex: 0)
        }
    }
    
    private var avatarView: some View {
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
    
    private var bubbleContent: some View {
        VStack(alignment: isFromCurrentUser ? .trailing : .leading, spacing: 4) {
            if message.contentType == 2, let imageURL = message.message.flatMap(URL.init(string:)), !imageURL.absoluteString.isEmpty {
                Button(action: { showImagePreview = true }) {
                    LazyAsyncImage(url: imageURL.absoluteString) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(hex: "#2F3336"))
                            .overlay(ProgressView().tint(.white))
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: 220, maxHeight: 220)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                Text(message.msgText ?? message.message ?? "")
                    .font(.system(size: 15))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(bubbleBackground)
                    .cornerRadius(8)
            }
            Text(message.formatDate ?? message.createTime.formatMessageDate())
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "#605D5D"))
                .padding(.horizontal, 4)
        }
    }
}
