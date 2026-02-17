//
//  CommentInputView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import PhotosUI

struct CommentInputView: View {
    let postId: String
    @Binding var replyTo: Comment?
    var placeholder: String = "善意的回应是沟通的开始"
    
    @State private var commentText = ""
    @State private var isSubmitting = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var selectedImage: UIImage? = nil
    @State private var showImagePicker = false
    @State private var pendingImageForConfirm: UIImage?
    @State private var showImageConfirmSheet = false
    @State private var isUploadingImage = false
    @State private var showUserSelector = false
    @State private var showEmojiPicker = false
    @State private var mentionedUsers: [AitUser] = []
    @State private var atPosition: Int = 0
    @FocusState private var isFocused: Bool
    
    var onCommentSubmitted: (() -> Void)?
    
    var body: some View {
        VStack(spacing: 0) {
            // 回复提示栏
            if let replyToComment = replyTo {
                HStack {
                    HStack(spacing: 4) {
                        Text(replyToComment.userName)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color(hex: "#FF6B35"))
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        replyTo = nil
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Color(hex: "#71767A"))
                            .font(.system(size: 16))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(hex: "#16181C"))
            }
            
            // 图片预览
            if let selectedImage = selectedImage {
                HStack {
                    ZStack(alignment: .topTrailing) {
                        Image(uiImage: selectedImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 80, height: 80)
                            .cornerRadius(8)
                            .clipped()
                        
                        Button(action: {
                            self.selectedImage = nil
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.white)
                                .background(Color.black.opacity(0.6))
                                .clipShape(Circle())
                                .font(.system(size: 20))
                        }
                        .offset(x: 8, y: -8)
                    }
                    
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            }
            
            // 输入区域
            HStack(alignment: .bottom, spacing: 12) {
                // 图片选择按钮
                Button(action: {
                    showImagePicker = true
                }) {
                    Image(systemName: "photo")
                        .foregroundColor(Color(hex: "#71767A"))
                        .font(.system(size: 20))
                }
                .disabled(isSubmitting || isUploadingImage)
                
                // 表情选择按钮
                Button(action: {
                    showEmojiPicker = true
                }) {
                    Image(systemName: "face.smiling")
                        .foregroundColor(Color(hex: "#71767A"))
                        .font(.system(size: 20))
                }
                .disabled(isSubmitting || isUploadingImage)
                
                // 输入框
                TextField(
                    replyTo != nil ? "回复 \(replyTo?.userName ?? "")" : placeholder,
                    text: $commentText,
                    axis: .vertical
                )
                .focused($isFocused)
                .font(.system(size: 15))
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(hex: "#2F3336"))
                .cornerRadius(20)
                .lineLimit(1...5)
                .disabled(isSubmitting || isUploadingImage)
                .onChange(of: commentText) { oldValue, newValue in
                    // 检测@符号
                    if let lastChar = newValue.last, lastChar == "@" {
                        atPosition = newValue.count - 1
                        showUserSelector = true
                    } else if showUserSelector && !newValue.contains("@") {
                        showUserSelector = false
                    }
                }
                
                // 提交按钮
                Button(action: {
                    Task {
                        await submitComment()
                    }
                }) {
                    if isSubmitting || isUploadingImage {
                        ProgressView()
                            .tint(.white)
                            .frame(width: 44, height: 44)
                    } else {
                        Image(systemName: "arrow.up.circle.fill")
                            .foregroundColor((commentText.isEmpty && selectedImage == nil) ? Color(hex: "#71767A") : Color(hex: "#FF6B35"))
                            .font(.system(size: 28))
                    }
                }
                .disabled((commentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && selectedImage == nil) || isSubmitting || isUploadingImage)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(hex: "#000000"))
            .overlay(
                Rectangle()
                    .frame(height: 0.5)
                    .foregroundColor(Color(hex: "#2F3336")),
                alignment: .top
            )
            .photosPicker(
                isPresented: $showImagePicker,
                selection: Binding(
                    get: { nil },
                    set: { newValue in
                        if let newValue = newValue {
                            Task {
                                await loadImageForConfirm(from: newValue)
                            }
                        }
                    }
                ),
                matching: .images
            )
            .sheet(isPresented: $showImageConfirmSheet) {
                imageConfirmSheet
            }
            .overlay(
                // 用户选择器和表情选择器
                VStack {
                    Spacer()
                    
                    if showUserSelector {
                        UserSearchModalView(
                            isPresented: $showUserSelector,
                            onUserSelected: { user in
                                insertMentionedUser(user)
                            }
                        )
                        .padding(.horizontal, 16)
                        .padding(.bottom, 60)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    
                    if showEmojiPicker {
                        EmojiPickerView(
                            isPresented: $showEmojiPicker,
                            onEmojiSelected: { emoji in
                                commentText += emoji
                            }
                        )
                        .padding(.horizontal, 16)
                        .padding(.bottom, 60)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .animation(.spring(), value: showUserSelector)
                .animation(.spring(), value: showEmojiPicker)
            )
            .sheet(isPresented: $showEmojiPicker) {
                EmojiPickerView(
                    isPresented: $showEmojiPicker,
                    onEmojiSelected: { emoji in
                        commentText += emoji
                    }
                )
                .presentationDetents([.height(300)])
                .presentationDragIndicator(.visible)
            }
        }
        .alert("错误", isPresented: $showError) {
            Button("确定", role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
    }
    
    /// 相册选图后仅加载并弹出确认，确认后再填入评论
    private func loadImageForConfirm(from item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data) else {
            return
        }
        await MainActor.run {
            pendingImageForConfirm = image
            showImageConfirmSheet = true
        }
    }
    
    /// 相册选图确认弹窗：预览 + 确认 / 取消
    private var imageConfirmSheet: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#000000").ignoresSafeArea()
                if let image = pendingImageForConfirm {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .padding()
                }
            }
            .navigationTitle("使用图片")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        pendingImageForConfirm = nil
                        showImageConfirmSheet = false
                    }
                    .foregroundColor(Color(hex: "#71767A"))
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("确认") {
                        selectedImage = pendingImageForConfirm
                        pendingImageForConfirm = nil
                        showImageConfirmSheet = false
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(hex: "#FF6B35"))
                }
            }
        }
    }
    
    private func insertMentionedUser(_ user: AitUser) {
        // 从@位置插入用户名
        let beforeAt = String(commentText.prefix(atPosition))
        let afterAt = String(commentText.dropFirst(atPosition + 1))
        commentText = beforeAt + "@\(user.nickName) " + afterAt
        
        // 添加到@用户列表
        if !mentionedUsers.contains(where: { $0.openId == user.openId }) {
            mentionedUsers.append(user)
        }
        
        showUserSelector = false
    }
    
    private func submitComment() async {
        let trimmedText = commentText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty || selectedImage != nil else { return }
        
        isSubmitting = true
        
        // 如果有图片，先上传图片
        var imagePath: String? = nil
        if let image = selectedImage {
            isUploadingImage = true
            do {
                imagePath = try await APIService.shared.uploadImage(image: image)
            } catch {
                await MainActor.run {
                    errorMessage = "图片上传失败: \(error.localizedDescription)"
                    showError = true
                    isSubmitting = false
                    isUploadingImage = false
                }
                return
            }
            isUploadingImage = false
        }
        
        do {
            _ = try await APIService.shared.submitComment(
                postId: postId,
                content: trimmedText,
                imagePath: imagePath,
                replyTo: replyTo?.id,
                replyToUserId: replyTo?.userId,
                mentionedUsers: mentionedUsers.isEmpty ? nil : mentionedUsers
            )
            
            await MainActor.run {
                commentText = ""
                selectedImage = nil
                mentionedUsers = []
                isFocused = false
                isSubmitting = false
                replyTo = nil
                onCommentSubmitted?()
            }
        } catch {
            CrashReporter.shared.logError(error, context: [
                "action": "submitComment",
                "postId": postId
            ])
            await MainActor.run {
                errorMessage = error.localizedDescription
                showError = true
                isSubmitting = false
            }
        }
    }
}
