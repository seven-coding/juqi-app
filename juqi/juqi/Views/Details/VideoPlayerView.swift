//
//  VideoPlayerView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import AVKit

struct VideoPlayerView: View {
    let videoUrl: String
    @State private var player: AVPlayer?
    @State private var isPlaying = false
    @State private var showControls = false
    @State private var currentTime: Double = 0
    @State private var duration: Double = 0
    @State private var isFullscreen = false
    @State private var controlsTimer: Timer?
    
    var body: some View {
        ZStack {
            if let player = player {
                VideoPlayer(player: player)
                    .aspectRatio(16/9, contentMode: .fit)
                    .cornerRadius(12)
                    .clipped()
                    .onTapGesture {
                        toggleControls()
                    }
                    .overlay(
                        // 播放控制覆盖层
                        Group {
                            if showControls {
                                videoControlsOverlay
                                    .transition(.opacity)
                            }
                        }
                        .animation(.easeInOut(duration: 0.2), value: showControls)
                    )
            } else {
                Rectangle()
                    .fill(Color(hex: "#2F3336"))
                    .aspectRatio(16/9, contentMode: .fit)
                    .cornerRadius(12)
                    .overlay(
                        ProgressView()
                            .tint(Color(hex: "#FF6B35"))
                    )
            }
        }
        .onAppear {
            setupPlayer()
        }
        .onDisappear {
            cleanup()
        }
    }
    
    private var videoControlsOverlay: some View {
        ZStack {
            // 半透明背景
            Color.black.opacity(0.5)
                .ignoresSafeArea()
            
            VStack {
                Spacer()
                
                HStack(spacing: 16) {
                    // 播放/暂停按钮
                    Button(action: {
                        togglePlay()
                    }) {
                        Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .foregroundColor(.white)
                            .font(.system(size: 44))
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
                                .foregroundColor(.white)
                            
                            Spacer()
                            
                            Text(formatTime(duration))
                                .font(.system(size: 12))
                                .foregroundColor(.white)
                        }
                    }
                    
                    // 全屏按钮
                    Button(action: {
                        toggleFullscreen()
                    }) {
                        Image(systemName: isFullscreen ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right")
                            .foregroundColor(.white)
                            .font(.system(size: 20))
                    }
                }
                .padding()
            }
        }
    }
    
    private func setupPlayer() {
        guard let url = URL(string: videoUrl) else { return }
        player = AVPlayer(url: url)
        
        // 监听播放状态
        player?.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.1, preferredTimescale: 600), queue: .main) { time in
            currentTime = time.seconds
            if let item = player?.currentItem {
                duration = item.duration.seconds
            }
        }
        
        // 监听播放结束
        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: player?.currentItem,
            queue: .main
        ) { _ in
            isPlaying = false
            currentTime = 0
            player?.seek(to: .zero)
        }
    }
    
    private func togglePlay() {
        if isPlaying {
            player?.pause()
        } else {
            player?.play()
        }
        isPlaying.toggle()
        resetControlsTimer()
    }
    
    private func toggleControls() {
        withAnimation {
            showControls.toggle()
        }
        resetControlsTimer()
    }
    
    private func resetControlsTimer() {
        controlsTimer?.invalidate()
        if showControls {
            controlsTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { _ in
                withAnimation {
                    showControls = false
                }
            }
        }
    }
    
    private func seekToTime(_ time: Double) {
        let cmTime = CMTime(seconds: time, preferredTimescale: 600)
        player?.seek(to: cmTime)
    }
    
    private func toggleFullscreen() {
        // TODO: 实现全屏功能
        isFullscreen.toggle()
    }
    
    private func formatTime(_ time: Double) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
    
    private func cleanup() {
        player?.pause()
        player = nil
        controlsTimer?.invalidate()
        NotificationCenter.default.removeObserver(self)
    }
}
