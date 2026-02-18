//
//  PostReportView.swift
//  juqi
//
//  帖子举报页：选择原因、选填图片与补充说明，参考小程序举报页实现
//

import SwiftUI
import PhotosUI

/// 举报原因选项（与小程序 dynMore 一致）
private let kReportReasons = [
    "男生",
    "涉政涉恐",
    "敏感信息",
    "广告营销",
    "恶意引战/人身攻击",
    "欺诈/违法信息",
    "其他"
]

struct PostReportView: View {
    let post: Post
    var onDismiss: (() -> Void)?
    /// 举报提交成功时调用（用于详情页标记「已举报」状态）
    var onReportSubmitted: (() -> Void)?
    
    @Environment(\.dismiss) private var dismiss
    @State private var selectedReason: String?
    @State private var description: String = ""
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var loadedImages: [UIImage] = []
    @State private var isSubmitting = false
    @State private var isUploadingImages = false
    
    private let maxDescLength = 200
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // 选择原因
                        VStack(alignment: .leading, spacing: 12) {
                            Text("选择原因")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(kReportReasons, id: \.self) { reason in
                                    Button(action: { selectedReason = reason }) {
                                        HStack(spacing: 12) {
                                            Image(systemName: selectedReason == reason ? "checkmark.circle.fill" : "circle")
                                                .foregroundColor(selectedReason == reason ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                                                .font(.system(size: 20))
                                            Text(reason)
                                                .font(.system(size: 15))
                                                .foregroundColor(.white)
                                            Spacer()
                                        }
                                        .padding(.vertical, 10)
                                        .padding(.horizontal, 12)
                                        .background(Color(hex: "#16181C"))
                                        .cornerRadius(10)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                        }
                        
                        // 上传图片（选填）
                        VStack(alignment: .leading, spacing: 12) {
                            Text("上传图片，最多9张（选填）")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                            
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                                ForEach(Array(loadedImages.enumerated()), id: \.offset) { index, img in
                                    ZStack(alignment: .topTrailing) {
                                        Image(uiImage: img)
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(height: 72)
                                            .clipped()
                                            .cornerRadius(8)
                                        
                                        Button(action: {
                                            selectedItems.remove(at: index)
                                            loadedImages.remove(at: index)
                                        }) {
                                            Image(systemName: "xmark.circle.fill")
                                                .font(.system(size: 20))
                                                .foregroundColor(.white)
                                                .background(Color.black.opacity(0.6))
                                                .clipShape(Circle())
                                        }
                                        .offset(x: 4, y: -4)
                                    }
                                }
                                
                                if loadedImages.count < 9 {
                                    PhotosPicker(
                                        selection: $selectedItems,
                                        maxSelectionCount: 9 - loadedImages.count,
                                        matching: .images
                                    ) {
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(Color(hex: "#2F3336"), lineWidth: 1)
                                            .frame(height: 72)
                                            .overlay(
                                                Image(systemName: "plus.circle")
                                                    .font(.system(size: 28))
                                                    .foregroundColor(Color(hex: "#71767A"))
                                            )
                                    }
                                    .onChange(of: selectedItems) { _, newItems in
                                        Task { await loadImages(from: newItems) }
                                    }
                                }
                            }
                        }
                        
                        // 补充说明
                        VStack(alignment: .leading, spacing: 8) {
                            Text("还有其它补充信息吗")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                            
                            TextField("选填，最多\(maxDescLength)字", text: $description, axis: .vertical)
                                .lineLimit(4...6)
                                .textFieldStyle(.plain)
                                .padding(12)
                                .background(Color(hex: "#16181C"))
                                .cornerRadius(10)
                                .foregroundColor(.white)
                                .onChange(of: description) { _, newValue in
                                    if newValue.count > maxDescLength {
                                        description = String(newValue.prefix(maxDescLength))
                                    }
                                }
                            Text("\(description.count)/\(maxDescLength)")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#71767A"))
                        }
                        
                        Spacer(minLength: 40)
                    }
                    .padding(16)
                }
            }
            .navigationTitle("举报")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") {
                        dismissOrCallback()
                    }
                    .foregroundColor(Color(hex: "#FF6B35"))
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("确定") {
                        submitReport()
                    }
                    .foregroundColor(selectedReason != nil ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                    .disabled(selectedReason == nil || isSubmitting)
                }
            }
            .overlay {
                if isSubmitting || isUploadingImages {
                    Color.black.opacity(0.4)
                        .ignoresSafeArea()
                    ProgressView()
                        .tint(Color(hex: "#FF6B35"))
                        .scaleEffect(1.2)
                }
            }
        }
    }
    
    private func loadImages(from items: [PhotosPickerItem]) async {
        var images: [UIImage] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self),
               let img = UIImage(data: data) {
                images.append(img)
            }
        }
        await MainActor.run {
            loadedImages = images
        }
    }
    
    private func dismissOrCallback() {
        if let onDismiss = onDismiss {
            onDismiss()
        } else {
            dismiss()
        }
    }
    
    private func submitReport() {
        guard let reason = selectedReason else {
            ToastManager.shared.error("请选择举报原因")
            return
        }
        
        isSubmitting = true
        
        Task {
            do {
                var imageIds: [String] = []
                if !loadedImages.isEmpty {
                    await MainActor.run { isUploadingImages = true }
                    for img in loadedImages {
                        let url = try await APIService.shared.uploadImage(image: img)
                        imageIds.append(url)
                    }
                    await MainActor.run { isUploadingImages = false }
                }
                
                _ = try await APIService.shared.reportDyn(
                    id: post.id,
                    circleId: post.circleId,
                    tipsReason: reason,
                    tipsDesc: description.isEmpty ? nil : description,
                    tipsImageIds: imageIds.isEmpty ? nil : imageIds
                )
                
                await MainActor.run {
                    isSubmitting = false
                    ToastManager.shared.success("提交成功")
                    onReportSubmitted?()
                    dismissOrCallback()
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    isUploadingImages = false
                    ToastManager.shared.error((error as? APIError)?.userMessage ?? "提交失败，请稍后重试")
                }
            }
        }
    }
}
