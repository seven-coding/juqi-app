//
//  LanguageVerifyView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import AVFoundation

struct LanguageVerifyView: View {
    @StateObject private var authService = AuthService.shared
    @State private var isRecording = false
    @State private var recordingTime: TimeInterval = 0
    @State private var audioRecorder: AVAudioRecorder?
    @State private var audioURL: URL?
    @State private var isUploading = false
    @State private var uploadProgress: Double = 0
    @State private var showError = false
    @State private var errorMessage: String?
    @State private var hasSubmitted = false
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 30) {
                // 标题
                VStack(spacing: 10) {
                    Text("语言验证")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("为了保证社区安全性，请录制一段语音进行验证")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                .padding(.top, 60)
                
                Spacer()
                
                if hasSubmitted {
                    // 已提交状态
                    VStack(spacing: 20) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(Color(hex: "#FF6B35"))
                        
                        Text("语音已提交")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.white)
                        
                        Text("正在等待审核，请耐心等待")
                            .font(.system(size: 14))
                            .foregroundColor(.gray)
                    }
                } else {
                    // 录制界面
                    VStack(spacing: 30) {
                        // 录制按钮
                        Button(action: {
                            if isRecording {
                                stopRecording()
                            } else {
                                startRecording()
                            }
                        }) {
                            ZStack {
                                Circle()
                                    .fill(isRecording ? Color.red : Color(hex: "#FF6B35"))
                                    .frame(width: 120, height: 120)
                                
                                if isRecording {
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(Color.white)
                                        .frame(width: 40, height: 40)
                                } else {
                                    Image(systemName: "mic.fill")
                                        .font(.system(size: 40))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        
                        // 录制时间
                        if isRecording {
                            Text(formatTime(recordingTime))
                                .font(.system(size: 32, weight: .medium, design: .monospaced))
                                .foregroundColor(.white)
                        } else if audioURL != nil {
                            Text("已录制，点击按钮重新录制")
                                .font(.system(size: 14))
                                .foregroundColor(.gray)
                        }
                    }
                }
                
                Spacer()
                
                // 提交按钮
                if !hasSubmitted {
                    Button(action: {
                        submitVoice()
                    }) {
                        Text("提交验证")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(audioURL != nil ? Color(hex: "#FF6B35") : Color.gray)
                            .cornerRadius(25)
                    }
                    .disabled(audioURL == nil || isUploading)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 60)
                } else {
                    Button(action: {
                        // 跳转到审核进度页
                        // 这里应该导航到VerifyProgressView
                    }) {
                        Text("查看审核进度")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color(hex: "#FF6B35"))
                            .cornerRadius(25)
                    }
                    .padding(.horizontal, 40)
                    .padding(.bottom, 60)
                }
            }
            
            // 上传进度
            if isUploading {
                Color.black.opacity(0.7)
                    .ignoresSafeArea()
                
                VStack(spacing: 20) {
                    ProgressView(value: uploadProgress)
                        .progressViewStyle(LinearProgressViewStyle(tint: Color(hex: "#FF6B35")))
                        .frame(width: 200)
                    
                    Text("正在上传... \(Int(uploadProgress * 100))%")
                        .foregroundColor(.white)
                        .font(.system(size: 14))
                }
            }
        }
        .alert("错误", isPresented: $showError) {
            Button("确定", role: .cancel) { }
        } message: {
            Text(errorMessage ?? "未知错误")
        }
        .onAppear {
            requestMicrophonePermission()
        }
    }
    
    private func requestMicrophonePermission() {
        AVAudioApplication.requestRecordPermission { granted in
            if !granted {
                DispatchQueue.main.async {
                    errorMessage = "需要麦克风权限才能录制语音"
                    showError = true
                }
            }
        }
    }
    
    private func startRecording() {
        let audioSession = AVAudioSession.sharedInstance()
        
        do {
            try audioSession.setCategory(.record, mode: .default)
            try audioSession.setActive(true)
        } catch {
            errorMessage = "无法启动录音: \(error.localizedDescription)"
            showError = true
            return
        }
        
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let audioFilename = documentsPath.appendingPathComponent("voice_verify_\(Date().timeIntervalSince1970).m4a")
        
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        
        do {
            audioRecorder = try AVAudioRecorder(url: audioFilename, settings: settings)
            audioRecorder?.record()
            isRecording = true
            audioURL = audioFilename
            
            // 开始计时
            Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { timer in
                if isRecording {
                    recordingTime += 0.1
                } else {
                    timer.invalidate()
                }
            }
        } catch {
            errorMessage = "录音初始化失败: \(error.localizedDescription)"
            showError = true
        }
    }
    
    private func stopRecording() {
        audioRecorder?.stop()
        isRecording = false
        
        let audioSession = AVAudioSession.sharedInstance()
        try? audioSession.setActive(false)
    }
    
    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    private func submitVoice() {
        guard let audioURL = audioURL else { return }
        
        isUploading = true
        uploadProgress = 0
        
        Task {
            do {
                // 读取音频文件
                let audioData = try Data(contentsOf: audioURL)
                
                // 调用上传接口
                let response: VerifySubmitResponse = try await NetworkService.shared.request(
                    operation: "appSubmitLanguageVerify",
                    data: [
                        "voiceData": audioData.base64EncodedString(),
                        "voiceDuration": Int(recordingTime)
                    ],
                    needsToken: true
                )
                
                if response.code == 200 {
                    hasSubmitted = true
                    uploadProgress = 1.0
                } else {
                    errorMessage = response.message
                    showError = true
                }
                
                isUploading = false
            } catch {
                isUploading = false
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
}

struct VerifySubmitResponse: Codable {
    let code: Int
    let message: String
    let data: VerifySubmitData?
}

struct VerifySubmitData: Codable {
    let verifyId: String
    let status: Int
}

#Preview {
    LanguageVerifyView()
}
