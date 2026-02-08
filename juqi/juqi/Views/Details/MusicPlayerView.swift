//
//  MusicPlayerView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import AVFoundation

struct MusicPlayerView: View {
    let musicInfo: MusicInfo
    
    @State private var isPlaying = false
    @State private var player: AVAudioPlayer?
    
    var body: some View {
        HStack(spacing: 12) {
            // 音乐封面
            AsyncImage(url: URL(string: musicInfo.musicPoster ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color(hex: "#2F3336"))
                    .overlay(
                        Image(systemName: "music.note")
                            .foregroundColor(Color(hex: "#71767A"))
                            .font(.system(size: 24))
                    )
            }
            .frame(width: 60, height: 60)
            .cornerRadius(8)
            .clipped()
            
            // 音乐信息
            VStack(alignment: .leading, spacing: 4) {
                if let musicName = musicInfo.musicName {
                    Text(musicName)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                
                if let musicAuthor = musicInfo.musicAuthor {
                    Text(musicAuthor)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#71767A"))
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // 播放按钮
            Button(action: {
                togglePlay()
            }) {
                Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                    .foregroundColor(Color(hex: "#FF6B35"))
                    .font(.system(size: 32))
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
        guard let musicSrc = musicInfo.musicSrc, let url = URL(string: musicSrc) else { return }
        
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
            player?.pause()
            isPlaying = false
        } else {
            player?.play()
            isPlaying = true
        }
    }
    
    private func stop() {
        player?.stop()
        player = nil
        isPlaying = false
    }
}
