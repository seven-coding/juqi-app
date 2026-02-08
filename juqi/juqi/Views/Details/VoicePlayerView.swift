//
//  VoicePlayerView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import AVFoundation

struct VoicePlayerView: View {
    let voiceUrl: String
    let duration: TimeInterval
    
    @State private var isPlaying = false
    @State private var currentTime: TimeInterval = 0
    @State private var player: AVAudioPlayer?
    
    @State private var progressTimer: Timer?
    
    var body: some View {
        HStack(spacing: 12) {
            // 播放按钮
            Button(action: {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                togglePlay()
            }) {
                Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                    .foregroundColor(Color(hex: "#FF6B35"))
                    .font(.system(size: 32))
                    .scaleEffect(isPlaying ? 1.1 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPlaying)
            }
            
            // 进度条
            VStack(alignment: .leading, spacing: 4) {
                Slider(value: $currentTime, in: 0...duration) { editing in
                    if !editing {
                        seekToTime(currentTime)
                    }
                }
                .tint(Color(hex: "#FF6B35"))
                
                HStack {
                    Text(formatTime(currentTime))
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#71767A"))
                    
                    Spacer()
                    
                    Text(formatTime(duration))
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#71767A"))
                }
            }
        }
        .padding(12)
        .background(Color(hex: "#16181C"))
        .cornerRadius(12)
        .onAppear {
            setupPlayer()
        }
        .onDisappear {
            stop()
        }
    }
    
    private func setupPlayer() {
        guard let url = URL(string: voiceUrl) else { return }
        
        do {
            let data = try Data(contentsOf: url)
            player = try AVAudioPlayer(data: data)
            player?.prepareToPlay()
        } catch {
            print("Failed to setup player: \(error)")
        }
    }
    
    private func togglePlay() {
        if isPlaying {
            pause()
        } else {
            play()
        }
    }
    
    private func play() {
        player?.play()
        isPlaying = true
        
        // 更新进度
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { timer in
            if let player = player {
                currentTime = player.currentTime
                if !player.isPlaying {
                    isPlaying = false
                    timer.invalidate()
                }
            } else {
                timer.invalidate()
            }
        }
    }
    
    private func pause() {
        player?.pause()
        isPlaying = false
        progressTimer?.invalidate()
    }
    
    private func seekToTime(_ time: TimeInterval) {
        player?.currentTime = time
        currentTime = time
    }
    
    private func stop() {
        player?.stop()
        player = nil
        isPlaying = false
        currentTime = 0
        progressTimer?.invalidate()
    }
    
    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
