//
//  PublishView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI
import PhotosUI
import UIKit

// MARK: - MultiImagePicker (使用现代 PHPicker)
struct MultiImagePicker: UIViewControllerRepresentable {
    @Binding var images: [UIImage]
    let maxSelection: Int
    
    func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration()
        config.filter = .images
        config.selectionLimit = maxSelection
        let picker = PHPickerViewController(configuration: config)
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let parent: MultiImagePicker
        
        init(_ parent: MultiImagePicker) {
            self.parent = parent
        }
        
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            picker.dismiss(animated: true)
            
            let group = DispatchGroup()
            var newImages: [UIImage] = []
            
            for result in results {
                if result.itemProvider.canLoadObject(ofClass: UIImage.self) {
                    group.enter()
                    result.itemProvider.loadObject(ofClass: UIImage.self) { image, error in
                        if let uiImage = image as? UIImage {
                            newImages.append(uiImage)
                        }
                        group.leave()
                    }
                }
            }
            
            group.notify(queue: .main) {
                // 如果当前已有图片，则追加，但不超过限制
                let remainingSpace = 9 - self.parent.images.count
                if remainingSpace > 0 {
                    self.parent.images.append(contentsOf: newImages.prefix(remainingSpace))
                }
            }
        }
    }
}

struct PublishView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var activeTab: TabItem
    /// 从话题详情页「参与话题」进入时预填的话题名
    var initialTopic: String? = nil
    /// 从电站页进入时预填的电站 ID，发布时发到该电站
    var initialCircleId: String? = nil
    /// 从电站页进入时展示的电站名称
    var initialCircleTitle: String? = nil
    /// 当前选中的发布电站（正常进入时也显示，可点击切换）
    @State private var selectedCircleId: String = ""
    @State private var selectedCircleTitle: String = "日常"
    @State private var selectedCircleIsSecret: Bool = false
    @State private var isShowingCirclePicker = false
    @State private var content: String = ""
    @State private var selectedCategory: PostTag = .daily
    @State private var selectedImages: [UIImage] = []
    @State private var uploadedImageUrls: [String] = []
    @State private var imageUploadProgress: [Int: Double] = [:]
    @State private var imageUploadErrors: [Int: String] = [:]
    @State private var isShowingImagePicker = false
    @State private var isShowingMultiImagePicker = false
    @State private var imageSourceType: UIImagePickerController.SourceType = .photoLibrary
    @State private var isShowingActionSheet = false
    
    // 发布状态
    @State private var isPublishing = false
    @State private var publishStatus: PublishStatus = .idle
    private var isShowingErrorAlert: Binding<Bool> {
        Binding {
            if case .failed = publishStatus { return true }
            return false
        } set: { _ in
            publishStatus = .idle
        }
    }
    
    // 话题相关
    @State private var selectedTopics: [String] = []
    @State private var isShowingTopicSelector = false
    
    // @用户相关
    @State private var selectedAitUsers: [AitUser] = []
    @State private var isShowingUserSelector = false
    
    // 音乐相关
    @State private var selectedMusic: MusicInfo?
    @State private var isShowingMusicSelector = false
    
    // 表情相关
    @State private var isShowingEmojiPicker = false
    private let emojiDeletePublisher = NotificationCenter.default.publisher(for: NSNotification.Name("EmojiDeleteRequested"))
    
    // 搜索与触发相关
    @State private var searchingType: HighlightableTextEditor.SearchTrigger = .none
    @State private var cursorPosition: Int = 0
    
    // 交互辅助
    @FocusState private var isInputActive: Bool
    private let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
    
    // 常量
    private let maxContentLength = 3000
    private let maxImageCount = 9
    private let draftCacheKey = "publish_draft_content"
    
    enum PublishStatus {
        case idle, publishing, success, failed(String)
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // 顶部导航栏 - 精致简约
                headerView
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // 文本输入区域 - 留白与呼吸感
                        textInputSection
                        
                        // 媒体预览区域 - 卡片流
                        mediaPreviewSection
                            .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))
                        
                        // 附加信息区域 - 话题与音乐卡片
                        additionalInfoSection
                    }
                    .padding(.top, 16)
                }
                .scrollDismissesKeyboard(.interactively)
                
                Spacer(minLength: 80) // 为底部工具栏留出空间
            }
            
            // 现代悬浮工具栏 (Glassmorphism)
            VStack(spacing: 0) {
                suggestionSection
                floatingToolbar
                if isShowingEmojiPicker {
                    EmojiPickerView(isPresented: $isShowingEmojiPicker) { emoji in
                        insertText(emoji)
                        impactFeedback.impactOccurred()
                    }
                    .frame(height: 300)
                    .background(Color(hex: "#1A1A1A"))
                    .transition(.move(edge: .bottom))
                }
            }
        }
        .onAppear {
            // 从电站页进入时预填发布电站；否则使用默认
            if let id = initialCircleId, !id.isEmpty {
                selectedCircleId = id
                selectedCircleTitle = initialCircleTitle ?? "日常"
                selectedCircleIsSecret = false
            } else if selectedCircleId.isEmpty {
                selectedCircleId = "a9bfcffc5eba1e380072920313b78c59"
                selectedCircleTitle = "日常"
                selectedCircleIsSecret = false
            }
            // 从话题详情「参与话题」进入时预填话题
            if let topic = initialTopic, !topic.isEmpty, !selectedTopics.contains(topic) {
                selectedTopics = [topic]
            }
            // 加载草稿
            if let draft = UserDefaults.standard.string(forKey: draftCacheKey), !draft.isEmpty {
                self.content = draft
            }
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                isInputActive = true // 进入页面自动聚焦键盘
            }
        }
        .onReceive(emojiDeletePublisher) { _ in
            if !content.isEmpty && cursorPosition > 0 {
                let index = content.index(content.startIndex, offsetBy: cursorPosition - 1)
                content.remove(at: index)
                cursorPosition -= 1
            }
        }
        .onChange(of: content) { oldValue, newValue in
            // 自动保存草稿
            UserDefaults.standard.set(newValue, forKey: draftCacheKey)
            
            if newValue.count > maxContentLength {
                content = String(newValue.prefix(maxContentLength))
            }
        }
        .toolbar(.hidden, for: .tabBar)
        .navigationBarHidden(true)
        .sheet(isPresented: $isShowingMusicSelector) {
            MusicSelectorView(selectedMusic: $selectedMusic)
        }
        .sheet(isPresented: $isShowingImagePicker) {
            PublishImagePicker(images: $selectedImages, sourceType: imageSourceType)
        }
        .sheet(isPresented: $isShowingMultiImagePicker) {
            MultiImagePicker(images: $selectedImages, maxSelection: maxImageCount - selectedImages.count)
        }
        .sheet(isPresented: $isShowingCirclePicker) {
            PublishCirclePickerSheet(
                selectedCircleId: $selectedCircleId,
                selectedCircleTitle: $selectedCircleTitle,
                selectedCircleIsSecret: $selectedCircleIsSecret,
                isPresented: $isShowingCirclePicker,
                onNoPermission: {
                    ToastManager.shared.error("本电站需要成员才可发帖")
                }
            )
        }
        .actionSheet(isPresented: $isShowingActionSheet) {
            var buttons: [ActionSheet.Button] = [
                .default(Text("从相册选择")) { isShowingMultiImagePicker = true }
            ]
            
            // 只有当相机可用时才添加"拍照"选项
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                buttons.append(.default(Text("拍照")) { imageSourceType = .camera; isShowingImagePicker = true })
            }
            
            buttons.append(.cancel())
            
            return ActionSheet(title: Text("选择图片来源"), buttons: buttons)
        }
        .alert("发布失败", isPresented: isShowingErrorAlert) {
            Button("确定", role: .cancel) { }
        } message: {
            if case .failed(let message) = publishStatus { Text(message) }
        }
    }
    
    // MARK: - 精致 Header
    private var headerView: some View {
        HStack {
            Button(action: { 
                impactFeedback.impactOccurred()
                dismiss()
            }) {
                Text("取消")
                    .foregroundColor(.white.opacity(0.6))
                    .font(.system(size: 16))
            }
            
            Spacer()
            
            Button(action: { isShowingCirclePicker = true }) {
                VStack(spacing: 2) {
                    Text("发布动态")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                    Text("发布至 \(selectedCircleTitle)")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(.white.opacity(0.7))
                    if selectedCircleIsSecret {
                        Text("发到这里的内容不会出现在首页和你的个人主页")
                            .font(.system(size: 10, weight: .regular))
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
            }
            .buttonStyle(.plain)
            
            Spacer()
            
            Button(action: { Task { await publishDyn() } }) {
                ZStack {
                    if isPublishing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    } else {
                        Text("发布")
                            .font(.system(size: 14, weight: .bold))
                    }
                }
                .frame(width: 68, height: 32)
                .background(canPublish ? Color(hex: "#FF6B35") : Color.white.opacity(0.1))
                .foregroundColor(canPublish ? .white : .white.opacity(0.3))
                .clipShape(Capsule())
                .shadow(color: canPublish ? Color(hex: "#FF6B35").opacity(0.3) : Color.clear, radius: 8, x: 0, y: 4)
            }
            .disabled(!canPublish || isPublishing)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(Color.black.opacity(0.8))
    }
    
    // MARK: - 文本输入区
    private var textInputSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            ZStack(alignment: .topLeading) {
                if content.isEmpty {
                    Text("这一刻的想法...")
                        .foregroundColor(.white.opacity(0.25))
                        .font(.system(size: 19, weight: .medium))
                        .padding(.top, 8)
                        .padding(.leading, 4)
                }
                
                HighlightableTextEditor(text: $content, cursorPosition: $cursorPosition) { trigger in
                    DispatchQueue.main.async {
                        withAnimation(.spring(response: 0.3)) {
                            searchingType = trigger
                        }
                    }
                }
                .focused($isInputActive)
                .frame(minHeight: 120)
                .onChange(of: content) { oldValue, newValue in
                    if newValue.count > maxContentLength {
                        content = String(newValue.prefix(maxContentLength))
                    }
                }
            }
            
            if content.count > maxContentLength - 100 {
                HStack {
                    Spacer()
                    Text("\(content.count)/\(maxContentLength)")
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(content.count >= maxContentLength ? .red : .orange)
                }
            }
        }
        .padding(.horizontal, 20)
    }
    
    // MARK: - 媒体流预览
    private var mediaPreviewSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 14) {
                ForEach(selectedImages.indices, id: \.self) { index in
                    ZStack(alignment: .topTrailing) {
                        Image(uiImage: selectedImages[index])
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 120, height: 120)
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.1), lineWidth: 1))
                            .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: 5)
                        
                        if let progress = imageUploadProgress[index], progress < 1.0 {
                            ZStack {
                                Color.black.opacity(0.4)
                                Circle()
                                    .trim(from: 0, to: progress)
                                    .stroke(Color(hex: "#FF6B35"), lineWidth: 3)
                                    .frame(width: 32, height: 32)
                                    .rotationEffect(.degrees(-90))
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                        }
                        
                        Button(action: {
                            withAnimation(.spring()) {
                                selectedImages.remove(at: index)
                                impactFeedback.impactOccurred()
                            }
                        }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .padding(6)
                                .background(BlurView(style: .systemThinMaterialDark))
                                .clipShape(Circle())
                        }
                        .padding(8)
                    }
                }
                
                // 上传按钮移至末尾
                if selectedImages.count < maxImageCount {
                    Button(action: {
                        impactFeedback.impactOccurred()
                        isShowingActionSheet = true
                    }) {
                        VStack(spacing: 8) {
                            Image(systemName: "plus")
                                .font(.system(size: 24, weight: .light))
                            Text("上传图片")
                                .font(.system(size: 12))
                        }
                        .foregroundColor(.white.opacity(0.4))
                        .frame(width: 120, height: 120)
                        .background(Color.white.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                    }
                }
            }
            .padding(.horizontal, 20)
        }
    }
    
    // MARK: - 附加信息
    private var additionalInfoSection: some View {
        VStack(spacing: 20) {
            if let music = selectedMusic {
                HStack(spacing: 12) {
                    ZStack {
                        Rectangle().fill(Color.white.opacity(0.05))
                        Image(systemName: "music.note")
                            .foregroundColor(Color(hex: "#FF6B35"))
                    }
                    .frame(width: 44, height: 44)
                    .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(music.musicName ?? "未知音乐")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                        Text(music.musicAuthor ?? "未知艺术家")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.5))
                    }
                    
                    Spacer()
                    
                    Button(action: { withAnimation { selectedMusic = nil } }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white.opacity(0.2))
                            .font(.system(size: 20))
                    }
                }
                .padding(12)
                .background(Color.white.opacity(0.05))
                .cornerRadius(16)
                .padding(.horizontal, 20)
            }
        }
    }
    
    // MARK: - 辅助方法
    private func insertText(_ textToInsert: String) {
        let index = content.index(content.startIndex, offsetBy: cursorPosition)
        content.insert(contentsOf: textToInsert, at: index)
        cursorPosition += textToInsert.count
    }
    
    private func replaceTriggerWithText(trigger: String, replacement: String) {
        let prefix = String(content.prefix(cursorPosition))
        if let lastTriggerIndex = prefix.lastIndex(of: trigger.first!) {
            let beforeTrigger = content[..<lastTriggerIndex]
            let afterCursor = content[content.index(content.startIndex, offsetBy: cursorPosition)...]
            content = String(beforeTrigger) + replacement + String(afterCursor)
            cursorPosition = beforeTrigger.count + replacement.count
        }
    }

    // MARK: - 推荐区域
    private var suggestionSection: some View {
        Group {
            switch searchingType {
            case .none:
                if isInputActive || isShowingEmojiPicker {
                    // 图1：输入内容时，推荐话题在工具栏上方显示
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(["小红书科技AMA", "潜水员戴夫", "vibecoding"], id: \.self) { topic in
                                Button(action: {
                                    insertText("#\(topic)# ")
                                    impactFeedback.impactOccurred()
                                }) {
                                    Text("#\(topic)")
                                        .font(.system(size: 14))
                                        .foregroundColor(.white.opacity(0.8))
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(Color.white.opacity(0.1))
                                        .clipShape(Capsule())
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                    }
                    .background(BlurView(style: .systemChromeMaterialDark))
                }
            case .topic(let query):
                // 图2：输入话题时，显示推荐话题列表
                VStack(spacing: 0) {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 0) {
                            ForEach(["cursor", "开发", "有想法轻松", "小红书文采比拼"], id: \.self) { topic in
                                if query.isEmpty || topic.contains(query) {
                                    Button(action: {
                                        replaceTriggerWithText(trigger: "#", replacement: "#\(topic)# ")
                                        impactFeedback.impactOccurred()
                                    }) {
                                        HStack {
                                            Text("# \(topic)")
                                                .foregroundColor(.white)
                                            Spacer()
                                            Text("\(Int.random(in: 100...9000))万浏览")
                                                .font(.system(size: 12))
                                                .foregroundColor(.white.opacity(0.4))
                                        }
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 12)
                                    }
                                    Divider().background(Color.white.opacity(0.05))
                                }
                            }
                        }
                    }
                    .frame(maxHeight: 200)
                }
                .background(BlurView(style: .systemChromeMaterialDark))
            case .user(let query):
                // 图3：输入用户时，显示用户关注列表
                VStack(spacing: 0) {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 0) {
                            ForEach(["Christine-海外红人营销", "ShawnHacks", "在人间流浪"], id: \.self) { user in
                                if query.isEmpty || user.contains(query) {
                                    Button(action: {
                                        replaceTriggerWithText(trigger: "@", replacement: "@\(user) ")
                                        impactFeedback.impactOccurred()
                                    }) {
                                        HStack(spacing: 12) {
                                            Circle()
                                                .fill(Color.gray)
                                                .frame(width: 32, height: 32)
                                            Text(user)
                                                .foregroundColor(.white)
                                            Spacer()
                                        }
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 10)
                                    }
                                    Divider().background(Color.white.opacity(0.05))
                                }
                            }
                        }
                    }
                    .frame(maxHeight: 200)
                }
                .background(BlurView(style: .systemChromeMaterialDark))
            }
        }
    }
    
    // MARK: - 悬浮工具栏
    private var floatingToolbar: some View {
        VStack(spacing: 0) {
            Divider().background(Color.white.opacity(0.08))
            
            HStack(spacing: 32) {
                toolbarIcon(isShowingEmojiPicker ? "keyboard" : "face.smiling.fill", action: {
                    if isShowingEmojiPicker {
                        isInputActive = true
                        isShowingEmojiPicker = false
                    } else {
                        isInputActive = false
                        withAnimation(.spring()) {
                            isShowingEmojiPicker = true
                        }
                    }
                })
                toolbarIcon("number", action: {
                    insertText("#")
                    impactFeedback.impactOccurred()
                })
                toolbarIcon("at", action: {
                    insertText("@")
                    impactFeedback.impactOccurred()
                })
                toolbarIcon("photo.fill.badge.plus", action: { isShowingActionSheet = true })
                
                Spacer()
                
                Button(action: { 
                    impactFeedback.impactOccurred(intensity: 0.5)
                    isInputActive = false 
                    isShowingEmojiPicker = false
                }) {
                    Text("完成")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background(BlurView(style: .systemChromeMaterialDark))
        }
    }
    
    private func toolbarIcon(_ name: String, action: @escaping () -> Void, active: Bool = false) -> some View {
        Button(action: {
            impactFeedback.impactOccurred()
            action()
        }) {
            Image(systemName: name)
                .font(.system(size: 22))
                .foregroundColor(active ? Color(hex: "#FF6B35") : .white.opacity(0.6))
        }
    }
    
    // MARK: - 发布逻辑
    private var canPublish: Bool {
        !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !selectedImages.isEmpty
    }
    
    private func publishDyn() async {
        guard canPublish else { 
            print("⚠️ 发布校验未通过: content='\((content))', imagesCount=\(selectedImages.count)")
            return 
        }
        
        isPublishing = true
        print("🚀 开始发布流程...")
        impactFeedback.impactOccurred(intensity: 0.8)
        
        do {
            var imageUrls: [String] = []
            for (index, image) in selectedImages.enumerated() {
                print("📸 正在上传第 \(index + 1)/\(selectedImages.count) 张图片...")
                imageUploadProgress[index] = 0.1
                // 压缩并上传
                let compressed = compressImage(image)
                let url = try await APIService.shared.uploadImage(image: compressed)
                imageUrls.append(url)
                imageUploadProgress[index] = 1.0
                print("✅ 第 \(index + 1) 张上传成功: \(url)")
            }
            
            let circleIdToUse = selectedCircleId.isEmpty ? "a9bfcffc5eba1e380072920313b78c59" : selectedCircleId
            let circleTitleToUse = selectedCircleTitle.isEmpty ? "日常" : selectedCircleTitle
            print("📡 正在调用发布接口... circleId=\(circleIdToUse), circleTitle=\(circleTitleToUse)")
            let response = try await APIService.shared.publishDyn(
                content: content,
                circleId: circleIdToUse,
                circleTitle: circleTitleToUse,
                imageIds: imageUrls,
                topic: selectedTopics,
                ait: selectedAitUsers,
                music: selectedMusic
            )
            
            print("📦 发布接口响应: code=\(response.code), message=\(response.message)")
            
            if response.code == 200 {
                print("🎉 发布成功！")
                // 清除草稿
                UserDefaults.standard.removeObject(forKey: draftCacheKey)
                
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                
                // 通知首页刷新并切换 Tab
                NotificationCenter.default.post(name: NSNotification.Name("PostPublished"), object: nil)
                withAnimation(.spring()) {
                    activeTab = .home
                }
                
                dismiss()
            } else {
                print("❌ 发布失败: \(response.message)")
                publishStatus = .failed(response.message)
            }
        } catch {
            print("💥 发布过程中抛出异常: \(error.localizedDescription)")
            publishStatus = .failed(error.localizedDescription)
        }
        isPublishing = false
    }
    
    private func compressImage(_ image: UIImage) -> UIImage {
        let maxSize: CGFloat = 2000
        if image.size.width <= maxSize && image.size.height <= maxSize { return image }
        let scale = min(maxSize / image.size.width, maxSize / image.size.height)
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let result = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()
        return result
    }
}

// MARK: - 发布电站选择器（弹层列表，仅限成员电站显示锁+「仅限成员」）
//
// 无权限电站判断规则（与后端 publishDyn getPublicAuth 一致）：
// - 列表 appGetCircleList 已返回 isMemberPublic，打开选择器仅 1 次请求；
// - isMemberPublic == true 的电站显示锁+「仅限成员」，点击时再请求 getCircleDetail 校验 followStatus；
// - 无权限 = isMemberPublic == true 且 followStatus != 2；非仅成员电站直接可选。
struct PublishCirclePickerSheet: View {
    @Binding var selectedCircleId: String
    @Binding var selectedCircleTitle: String
    @Binding var selectedCircleIsSecret: Bool
    @Binding var isPresented: Bool
    var onNoPermission: () -> Void
    
    @State private var circles: [CircleItem] = []
    @State private var isLoading = true
    @State private var loadError: String?
    /// 点击仅限成员电站且无权限时高亮提示的 id，用于短暂高亮「仅限成员」文案
    @State private var highlightedNoPermissionId: String? = nil
    /// 在弹窗内显示无权限 Toast（避免被 sheet 遮挡）
    @State private var showNoPermissionToast = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#FF6B35")))
                } else if let err = loadError {
                    VStack(spacing: 12) {
                        Text(err)
                            .font(.system(size: 15))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(circles) { circle in
                                circleRow(circle)
                                if circle.id != circles.last?.id {
                                    Divider()
                                        .background(Color(hex: "#2F3336"))
                                        .padding(.leading, 20)
                                }
                            }
                        }
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationTitle("选择发布电站")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        isPresented = false
                    }
                    .foregroundColor(.white.opacity(0.8))
                }
            }
            .task { await loadCircles() }
            .toast(isPresented: $showNoPermissionToast, message: "本电站需要成员才可发帖", type: .error)
        }
    }
    
    private func circleRow(_ circle: CircleItem) -> some View {
        let needMember = circle.isMemberPublic == true
        let isHighlighted = highlightedNoPermissionId == circle.id
        return Button {
            Task { await selectCircle(circle) }
        } label: {
            HStack(spacing: 12) {
                if let urlString = circle.imageSmall, !urlString.isEmpty, let u = URL(string: urlString) {
                    AsyncImage(url: u) { phase in
                        switch phase {
                        case .success(let img): img.resizable().aspectRatio(contentMode: .fill)
                        case .failure, .empty: placeholderThumb
                        @unknown default: placeholderThumb
                        }
                    }
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                } else {
                    placeholderThumb
                }
                Text(circle.title)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if needMember {
                    HStack(spacing: 4) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 12))
                        Text("仅限成员")
                            .font(.system(size: 12, weight: .regular))
                    }
                    .foregroundColor(isHighlighted ? Color(hex: "#FF6B35") : Color(hex: "#8E8E93"))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
    
    private var placeholderThumb: some View {
        RoundedRectangle(cornerRadius: 6)
            .fill(Color(hex: "#2F3336"))
            .frame(width: 44, height: 44)
    }
    
    private func loadCircles() async {
        isLoading = true
        loadError = nil
        defer { isLoading = false }
        do {
            let list = try await APIService.shared.getCircleList()
            await MainActor.run { circles = list }
        } catch {
            await MainActor.run { loadError = "加载电站列表失败" }
        }
    }
    
    /// 仅限成员发帖的电站需请求详情得到 followStatus 再决定是否可选中；非仅成员电站直接选中
    private func selectCircle(_ circle: CircleItem) async {
        if circle.isMemberPublic != true {
            await MainActor.run {
                selectedCircleId = circle.id
                selectedCircleTitle = circle.title
                selectedCircleIsSecret = circle.isSecret == true
                isPresented = false
            }
            return
        }
        do {
            let detail = try await APIService.shared.getCircleDetail(circleId: circle.id)
            let status = detail.followStatus ?? 0
            await MainActor.run {
                if status == 2 {
                    selectedCircleId = circle.id
                    selectedCircleTitle = circle.title
                    selectedCircleIsSecret = circle.isSecret == true
                    isPresented = false
                } else {
                    highlightNoPermissionThenToast(circleId: circle.id)
                }
            }
        } catch {
            await MainActor.run { highlightNoPermissionThenToast(circleId: circle.id) }
        }
    }
    
    private func highlightNoPermissionThenToast(circleId: String) {
        withAnimation(.easeOut(duration: 0.15)) {
            highlightedNoPermissionId = circleId
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            withAnimation(.easeOut(duration: 0.2)) {
                highlightedNoPermissionId = nil
            }
            showNoPermissionToast = true
        }
    }
}

// MARK: - 基础组件
struct BlurView: UIViewRepresentable {
    var style: UIBlurEffect.Style
    func makeUIView(context: Context) -> UIVisualEffectView {
        UIVisualEffectView(effect: UIBlurEffect(style: style))
    }
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {}
}

// MARK: - 扩展
extension PublishView.PublishStatus {
    var isFailed: Bool { if case .failed = self { return true }; return false }
}

// MARK: - PublishImagePicker Helper
struct PublishImagePicker: UIViewControllerRepresentable {
    @Binding var images: [UIImage]
    var sourceType: UIImagePickerController.SourceType
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        // 检查源类型是否可用，如果不可用则使用相册作为后备
        if UIImagePickerController.isSourceTypeAvailable(sourceType) {
            picker.sourceType = sourceType
        } else {
            picker.sourceType = .photoLibrary
        }
        return picker
    }
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: PublishImagePicker
        init(_ parent: PublishImagePicker) { self.parent = parent }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                if parent.images.count < 9 { parent.images.append(image) }
            }
            picker.dismiss(animated: true)
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { picker.dismiss(animated: true) }
    }
}

#Preview {
    PublishView(activeTab: .constant(.publish))
}
