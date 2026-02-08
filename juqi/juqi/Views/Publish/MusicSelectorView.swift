//
//  MusicSelectorView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct MusicSelectorView: View {
    @Binding var selectedMusic: MusicInfo?
    @Environment(\.dismiss) private var dismiss
    @State private var searchText: String = ""
    @State private var musicList: [MusicItem] = []
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // 搜索框
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(Color(hex: "#666666"))
                    TextField("搜索音乐", text: $searchText)
                        .font(.system(size: 14))
                        .onSubmit {
                            Task {
                                await searchMusic()
                            }
                        }
                }
                .padding()
                .background(Color(hex: "#1A1A1A"))
                
                if isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if musicList.isEmpty {
                    Spacer()
                    Text("暂无音乐")
                        .foregroundColor(Color(hex: "#666666"))
                    Spacer()
                } else {
                    // 音乐列表
                    List {
                        ForEach(musicList) { music in
                            Button(action: {
                                selectMusic(music)
                            }) {
                                HStack {
                                    AsyncImage(url: URL(string: music.poster ?? "")) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Rectangle()
                                            .fill(Color(hex: "#2F3336"))
                                            .overlay(
                                                Image(systemName: "music.note")
                                                    .foregroundColor(.white)
                                            )
                                    }
                                    .frame(width: 50, height: 50)
                                    .cornerRadius(8)
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(music.name)
                                            .font(.system(size: 14, weight: .medium))
                                            .foregroundColor(.white)
                                        Text(music.author)
                                            .font(.system(size: 12))
                                            .foregroundColor(Color(hex: "#666666"))
                                    }
                                    
                                    Spacer()
                                    
                                    if selectedMusic?.musicId == music.id {
                                        Image(systemName: "checkmark")
                                            .foregroundColor(Color(hex: "#FF6B35"))
                                    }
                                }
                                .padding(.vertical, 8)
                            }
                        }
                    }
                    .listStyle(PlainListStyle())
                    .background(Color(hex: "#000000"))
                }
            }
            .background(Color(hex: "#000000"))
            .navigationTitle("选择音乐")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("取消") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            Task {
                await loadMusic()
            }
        }
    }
    
    private func loadMusic() async {
        isLoading = true
        // 模拟加载音乐列表
        try? await Task.sleep(nanoseconds: 500_000_000)
        musicList = [
            MusicItem(id: "1", name: "示例音乐1", author: "艺术家1", poster: nil, src: nil),
            MusicItem(id: "2", name: "示例音乐2", author: "艺术家2", poster: nil, src: nil)
        ]
        isLoading = false
    }
    
    private func searchMusic() async {
        isLoading = true
        // 模拟搜索
        try? await Task.sleep(nanoseconds: 500_000_000)
        musicList = musicList.filter { $0.name.contains(searchText) || $0.author.contains(searchText) }
        isLoading = false
    }
    
    private func selectMusic(_ music: MusicItem) {
        selectedMusic = MusicInfo(
            musicId: music.id,
            musicName: music.name,
            musicAuthor: music.author,
            musicPoster: music.poster,
            musicSrc: music.src,
            isAudioShow: true
        )
        dismiss()
    }
}

struct MusicItem: Identifiable {
    let id: String
    let name: String
    let author: String
    let poster: String?
    let src: String?
}

#Preview {
    MusicSelectorView(selectedMusic: .constant(nil))
}
