//
//  SettingsView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import UIKit
import PhotosUI
import Photos

struct SettingsView: View {
    @State private var userProfile: UserProfile?
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var lastError: APIError? = nil
    @State private var showErrorToast = false
    @State private var errorToastMessage = ""

    // 表单字段
    @State private var userName: String = ""
    @State private var signature: String = ""
    @State private var birthday: Date = Date()
    @State private var constellation: String = ""
    @State private var mbti: String = ""
    @State private var relationshipStatus: String = ""
    @State private var school: String = ""
    @State private var selectedPhotos: [UIImage] = []
    @State private var selectedAvatar: UIImage?
    @State private var showImagePicker = false
    @State private var showPhotoPicker = false
    @State private var isAvatarPicker = false
    
    @Environment(\.dismiss) private var dismiss
    
    private let themeOrange = Color(hex: "#FF6B35")
    private let secondaryText = Color(hex: "#71767A")
    
    // 星座选项
    private let constellations = ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"]
    
    // MBTI选项
    private let mbtiTypes = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"]
    
    // 感情状态选项
    private let relationshipStatuses = ["单身", "恋爱中", "已婚", "保密"]
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                
                if isLoading {
                    ProgressView().tint(themeOrange)
                } else if let error = lastError {
                    EmptyStateView(
                        icon: error.iconName,
                        title: "加载失败",
                        message: error.userMessage,
                        actionTitle: "重试",
                        iconColor: .red.opacity(0.8),
                        action: {
                            Task { await loadUserProfile() }
                        }
                    )
                } else {
                    Form {
                        // 头像
                        Section {
                            Button(action: {
                                isAvatarPicker = true
                                showImagePicker = true
                            }) {
                                HStack {
                                    Text("头像")
                                        .foregroundColor(.white)
                                    Spacer()
                                    if let avatar = selectedAvatar {
                                        Image(uiImage: avatar)
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: 60, height: 60)
                                            .clipShape(Circle())
                                    } else if let avatarUrl = userProfile?.avatar, !avatarUrl.isEmpty {
                                        AsyncImage(url: URL(string: avatarUrl)) { image in
                                            image.resizable().aspectRatio(contentMode: .fill)
                                        } placeholder: {
                                            Circle().fill(Color(hex: "#2F3336"))
                                        }
                                        .frame(width: 60, height: 60)
                                        .clipShape(Circle())
                                    } else {
                                        Image(systemName: "person.circle.fill")
                                            .foregroundColor(secondaryText)
                                            .font(.system(size: 60))
                                    }
                                }
                            }
                        }
                        
                        // 基本信息
                        Section(header: Text("基本信息").foregroundColor(secondaryText)) {
                            TextField("昵称", text: $userName)
                                .foregroundColor(.white)
                            
                            TextField("个性签名", text: $signature, axis: .vertical)
                                .foregroundColor(.white)
                                .lineLimit(3...6)
                            
                            DatePicker("生日", selection: $birthday, displayedComponents: .date)
                                .foregroundColor(.white)
                            
                            Picker("星座", selection: $constellation) {
                                Text("未选择").tag("")
                                ForEach(constellations, id: \.self) { item in
                                    Text(item).tag(item)
                                }
                            }
                            .foregroundColor(.white)
                            
                            Picker("MBTI", selection: $mbti) {
                                Text("未选择").tag("")
                                ForEach(mbtiTypes, id: \.self) { item in
                                    Text(item).tag(item)
                                }
                            }
                            .foregroundColor(.white)
                            
                            Picker("感情状态", selection: $relationshipStatus) {
                                Text("未选择").tag("")
                                ForEach(relationshipStatuses, id: \.self) { item in
                                    Text(item).tag(item)
                                }
                            }
                            .foregroundColor(.white)
                            
                            TextField("学校", text: $school)
                                .foregroundColor(.white)
                        }
                        
                        // 照片管理
                        Section(header: Text("照片（最多9张）").foregroundColor(secondaryText)) {
                            Button(action: {
                                isAvatarPicker = false
                                showPhotoPicker = true
                            }) {
                                HStack {
                                    Text("添加照片")
                                        .foregroundColor(themeOrange)
                                    Spacer()
                                    Image(systemName: "plus.circle")
                                        .foregroundColor(themeOrange)
                                }
                            }
                            
                            if !selectedPhotos.isEmpty {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 12) {
                                        ForEach(Array(selectedPhotos.enumerated()), id: \.offset) { index, photo in
                                            ZStack(alignment: .topTrailing) {
                                                Image(uiImage: photo)
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                                    .frame(width: 100, height: 100)
                                                    .cornerRadius(8)
                                                
                                                Button(action: {
                                                    selectedPhotos.remove(at: index)
                                                }) {
                                                    Image(systemName: "xmark.circle.fill")
                                                        .foregroundColor(.white)
                                                        .background(Color.black.opacity(0.6))
                                                        .clipShape(Circle())
                                                }
                                                .padding(4)
                                            }
                                        }
                                    }
                                    .padding(.horizontal, 4)
                                }
                            }
                        }

                    }
                    .scrollContentBackground(.hidden)
                    .background(Color.black)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button(action: { dismiss() }) {
                                Image(systemName: "chevron.left")
                                    .foregroundColor(.white)
                                    .font(.system(size: 16, weight: .medium))
                            }
                        }
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("保存") {
                                Task {
                                    await saveUserInfo()
                                }
                            }
                            .foregroundColor(themeOrange)
                            .disabled(isSaving)
                        }
                    }
                }
                }
            .navigationTitle("资料设置")
            .navigationBarTitleDisplayMode(.inline)
            .toast(isPresented: $showErrorToast, message: errorToastMessage, type: .error)
        }
        .task {
            await loadUserProfile()
        }
        .toolbar(.hidden, for: .tabBar)
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(image: isAvatarPicker ? $selectedAvatar : nil, images: isAvatarPicker ? nil : $selectedPhotos, isPresented: $showImagePicker)
        }
    }
    
    private func loadUserProfile() async {
        isLoading = true
        lastError = nil
        do {
            userProfile = try await APIService.shared.getCurrentUserProfile()
            if let profile = userProfile {
                userName = profile.userName
                signature = profile.signature ?? ""
                constellation = profile.constellation ?? ""
                // mbti、relationshipStatus、school 当前 UserProfile 模型无对应字段，保留表单默认空值
            }
        } catch {
            print("Failed to load user profile: \(error)")
            if let apiError = error as? APIError {
                lastError = apiError
            } else {
                lastError = .unknown
            }
        }
        isLoading = false
    }
    
    private func saveUserInfo() async {
        isSaving = true
        showErrorToast = false
        do {
            var data: [String: Any] = [
                "userName": userName,
                "signature": signature,
                "constellation": constellation,
                "mbti": mbti,
                "relationshipStatus": relationshipStatus,
                "school": school
            ]
            // 生日：服务端常用时间戳（毫秒）
            data["birthDay"] = Int(birthday.timeIntervalSince1970 * 1000)

            // 上传头像
            if let avatar = selectedAvatar {
                let avatarUrl = try await APIService.shared.uploadImage(image: avatar)
                data["avatar"] = avatarUrl
            }

            // 上传照片
            if !selectedPhotos.isEmpty {
                var photoUrls: [String] = []
                for photo in selectedPhotos {
                    let url = try await APIService.shared.uploadImage(image: photo)
                    photoUrls.append(url)
                }
                data["imgList"] = photoUrls
            }

            _ = try await APIService.shared.updateUserInfo(data: data)
            await MainActor.run {
                dismiss()
            }
        } catch {
            print("Failed to save user info: \(error)")
            await MainActor.run {
                if let apiError = error as? APIError {
                    errorToastMessage = apiError.userMessage
                } else {
                    errorToastMessage = "保存失败，请稍后重试"
                }
                showErrorToast = true
            }
        }
        await MainActor.run {
            isSaving = false
        }
    }
}

// MARK: - Image Picker
struct ImagePicker: UIViewControllerRepresentable {
    var image: Binding<UIImage?>?
    var images: Binding<[UIImage]>?
    @Binding var isPresented: Bool
    
    func makeUIViewController(context: Context) -> PHPickerViewController {
        var configuration = PHPickerConfiguration()
        configuration.selectionLimit = image != nil ? 1 : 9
        configuration.filter = .images
        
        let picker = PHPickerViewController(configuration: configuration)
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            picker.dismiss(animated: true)
            
            if let imageBinding = parent.image {
                // 单图选择（头像）
                guard let result = results.first else { return }
                result.itemProvider.loadObject(ofClass: UIImage.self) { object, error in
                    if let image = object as? UIImage {
                        DispatchQueue.main.async {
                            imageBinding.wrappedValue = image
                        }
                    }
                }
            } else if let imagesBinding = parent.images {
                // 多图选择（照片）
                var loadedImages: [UIImage] = []
                let group = DispatchGroup()
                
                for result in results {
                    group.enter()
                    result.itemProvider.loadObject(ofClass: UIImage.self) { object, error in
                        if let image = object as? UIImage {
                            loadedImages.append(image)
                        }
                        group.leave()
                    }
                }
                
                group.notify(queue: .main) {
                    imagesBinding.wrappedValue.append(contentsOf: loadedImages)
                }
            }
            
            parent.isPresented = false
        }
    }
}
