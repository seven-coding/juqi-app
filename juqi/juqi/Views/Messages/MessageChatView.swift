//
//  MessageChatView.swift
//  juqi
//
//  申请/私信对话页（type 20-23），对接 chat 接口、messageChat 数据与发送。支持文字、表情、图片。
//

import SwiftUI
import PhotosUI

struct MessageChatView: View {
    let from: String
    let type: Int
    let title: String
    let messageTypeId: String
    let chatId: String
    let fromPhoto: String?
    
    @StateObject private var viewModel: MessageChatViewModel
    @State private var inputText: String = ""
    @State private var showEmojiPicker = false
    @State private var showImagePicker = false
    @State private var isUploadingImage = false
    /// 发送中的文字，用于在列表底部展示「发送中」气泡
    @State private var sendingText: String?
    /// 发送中的图片，用于列表底部展示「发送中」气泡
    @State private var sendingImage: UIImage?
    /// 发送成功后 +1，用于触发滚到底部（等 refresh 完成后再滚）
    @State private var scrollToBottomAfterSendTrigger: Int = 0
    /// 相册选图后待确认的图片，确认后再发送
    @State private var pendingImageToSend: UIImage?
    @State private var showImageConfirmSheet = false
    
    /// 当 title 为空或为「未知」时展示「会话」
    private var displayTitle: String {
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty || t == "未知" { return "会话" }
        return t
    }

    init(from: String, type: Int, title: String, messageTypeId: String, chatId: String, fromPhoto: String?) {
        self.from = from
        self.type = type
        self.title = title
        self.messageTypeId = messageTypeId
        self.chatId = chatId
        self.fromPhoto = fromPhoto
        _viewModel = StateObject(wrappedValue: MessageChatViewModel(from: from, messageTypeId: messageTypeId, chatId: chatId))
    }
    
    var body: some View {
        ZStack {
            Color(hex: "#000000")
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                if viewModel.isLoading && viewModel.messages.isEmpty && !viewModel.loadFailed {
                    VStack(spacing: 12) {
                        Spacer()
                        ProgressView()
                            .tint(Color(hex: "#FF6B35"))
                            .scaleEffect(1.2)
                        Text("加载对话中...")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#605D5D"))
                        Spacer()
                    }
                } else if viewModel.loadFailed && !viewModel.isLoading {
                    MessageLoadFailedView(message: viewModel.loadFailedMessage) {
                        viewModel.refresh()
                    }
                } else if viewModel.messages.isEmpty && !viewModel.isLoading && sendingText == nil && sendingImage == nil {
                    VStack(spacing: 16) {
                        Spacer()
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.system(size: 48))
                            .foregroundColor(Color(hex: "#605D5D"))
                        Text("暂无对话消息")
                            .font(.system(size: 16))
                            .foregroundColor(Color(hex: "#D6D0D0"))
                        Text("发一句打个招呼吧")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#71767A"))
                        Spacer()
                    }
                } else {
                    chatList
                }
                
                inputBar
            }
        }
        .navigationTitle(displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.loadMessages()
        }
    }
    
    private var chatList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                        ChatMessageView(
                            message: message,
                            isFromCurrentUser: message.from != from
                        )
                        .id(message.id)
                        .onAppear {
                            if index == 0 && !viewModel.allLoaded {
                                viewModel.loadMore()
                            }
                        }
                    }
                    if sendingText != nil || sendingImage != nil {
                        sendingBubble
                    }
                    if viewModel.isLoading && !viewModel.messages.isEmpty {
                        HStack {
                            Spacer()
                            ProgressView()
                                .tint(Color(hex: "#FF6B35"))
                                .padding()
                            Spacer()
                        }
                    }
                }
                .padding(.vertical, 16)
            }
            .refreshable {
                viewModel.refresh()
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                scrollToBottom(proxy: proxy)
            }
            .onChange(of: scrollToBottomAfterSendTrigger) { _, _ in
                // 发送成功后 refresh 为异步，延迟执行滚动以等待列表更新
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    scrollToBottom(proxy: proxy)
                }
            }
            .onAppear {
                scrollToBottom(proxy: proxy)
            }
        }
    }
    
    /// 进入私信页或消息列表变化时滚到底部，使最新消息可见
    private func scrollToBottom(proxy: ScrollViewProxy) {
        guard !viewModel.messages.isEmpty, let lastId = viewModel.messages.last?.id else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            withAnimation(.easeOut(duration: 0.25)) {
                proxy.scrollTo(lastId, anchor: .bottom)
            }
        }
    }
    
    /// 列表底部的「发送中」气泡（右侧，与自己的消息样式一致）
    private var sendingBubble: some View {
        HStack(alignment: .top, spacing: 8) {
            Spacer(minLength: 48)
            Group {
                if let image = sendingImage {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: 220, maxHeight: 220)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color(hex: "#FF6B35").opacity(0.6), lineWidth: 1)
                        )
                } else if let text = sendingText {
                    Text(text)
                        .font(.system(size: 15))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color(hex: "#FF6B35"))
                        .cornerRadius(8)
                }
            }
            .overlay(alignment: .bottomTrailing) {
                HStack(spacing: 4) {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.8)
                    Text("发送中")
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.9))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.black.opacity(0.5))
                .cornerRadius(6)
                .padding(6)
            }
            .padding(.vertical, 8)
        }
        .padding(.horizontal, 16)
    }
    
    private var inputBar: some View {
        HStack(alignment: .bottom, spacing: 12) {
            Button(action: {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                showEmojiPicker = true
            }) {
                Image(systemName: "face.smiling")
                    .font(.system(size: 22))
                    .foregroundColor(isUploadingImage ? Color(hex: "#71767A").opacity(0.5) : Color(hex: "#71767A"))
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(isUploadingImage)
            
            Button(action: {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                showImagePicker = true
            }) {
                Image(systemName: "photo")
                    .font(.system(size: 22))
                    .foregroundColor(isUploadingImage ? Color(hex: "#71767A").opacity(0.5) : Color(hex: "#71767A"))
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(isUploadingImage)
            
            TextField("输入新消息", text: $inputText)
                .font(.system(size: 15))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color(hex: "#1B1B1B"))
                .cornerRadius(20)
            
            Button(action: {
                let generator = UIImpactFeedbackGenerator(style: .medium)
                generator.impactOccurred()
                sendMessage()
            }) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(canSend ? Color(hex: "#FF6B35") : Color(hex: "#71767A").opacity(0.6))
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(!canSend)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(hex: "#000000"))
        .photosPicker(
            isPresented: $showImagePicker,
            selection: Binding(
                get: { nil as PhotosPickerItem? },
                set: { newValue in
                    if let item = newValue {
                        Task { await loadImageForConfirm(from: item) }
                    }
                }
            ),
            matching: .images
        )
        .sheet(isPresented: $showImageConfirmSheet) {
            imageConfirmSheet
        }
        .sheet(isPresented: $showEmojiPicker) {
            EmojiPickerView(isPresented: $showEmojiPicker) { emoji in
                inputText += emoji
            }
            .presentationDetents([.height(300)])
            .presentationDragIndicator(.visible)
        }
    }
    
    private var canSend: Bool {
        !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isUploadingImage
    }
    
    /// 相册选图后仅加载并弹出确认，不直接发送
    private func loadImageForConfirm(from item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data) else {
            return
        }
        await MainActor.run {
            pendingImageToSend = image
            showImageConfirmSheet = true
        }
    }
    
    /// 确认发送待发图片（上传并发送）
    private func sendPendingImage() {
        guard let image = pendingImageToSend else { return }
        showImageConfirmSheet = false
        pendingImageToSend = nil
        isUploadingImage = true
        sendingImage = image
        Task {
            do {
                let url = try await APIService.shared.uploadImage(image: image)
                await MainActor.run {
                    viewModel.sendImage(imageURL: url) {
                        isUploadingImage = false
                        sendingImage = nil
                        scrollToBottomAfterSendTrigger += 1
                    } onError: { msg in
                        isUploadingImage = false
                        sendingImage = nil
                        ToastManager.shared.error(msg.isEmpty ? "图片发送失败，请重试" : msg)
                    }
                }
            } catch {
                await MainActor.run {
                    isUploadingImage = false
                    sendingImage = nil
                }
                ToastManager.shared.error("图片上传失败，请重试")
            }
        }
    }
    
    /// 相册选图确认弹窗：预览 + 确认发送 / 取消
    private var imageConfirmSheet: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#000000").ignoresSafeArea()
                if let image = pendingImageToSend {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .padding()
                }
            }
            .navigationTitle("发送图片")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        pendingImageToSend = nil
                        showImageConfirmSheet = false
                    }
                    .foregroundColor(Color(hex: "#71767A"))
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("确认发送") {
                        sendPendingImage()
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(hex: "#FF6B35"))
                }
            }
        }
    }
    
    private func sendMessage() {
        let text = inputText
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        inputText = ""
        sendingText = text
        viewModel.sendMessage(text: text) {
            sendingText = nil
            scrollToBottomAfterSendTrigger += 1
        } onError: { message in
            sendingText = nil
            inputText = text
            ToastManager.shared.error(message.isEmpty ? "发送失败，请重试" : message)
        }
    }
}
