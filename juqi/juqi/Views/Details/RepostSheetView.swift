//
//  RepostSheetView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct RepostSheetView: View {
    let post: Post
    @Binding var repostContent: String
    @Binding var isReposting: Bool
    let onRepost: () async -> Void
    
    @Environment(\.dismiss) var dismiss
    @FocusState private var isFocused: Bool
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // 被转发的内容预览
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 12) {
                        AsyncImage(url: URL(string: post.userAvatar ?? "")) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            SwiftUI.Circle()
                                .fill(Color(hex: "#2F3336"))
                                .overlay(
                                    Text(post.userName.isEmpty ? "匿" : String(post.userName.prefix(1)))
                                        .foregroundColor(.white)
                                        .font(.system(size: 14, weight: .medium))
                                )
                        }
                        .frame(width: 40, height: 40)
                        .clipShape(SwiftUI.Circle())
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(post.userName)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.white)
                            
                            Text(post.content)
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#71767A"))
                                .lineLimit(2)
                        }
                        
                        Spacer()
                    }
                    .padding(12)
                    .background(Color(hex: "#16181C"))
                    .cornerRadius(8)
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                
                // 输入框
                VStack(alignment: .leading, spacing: 12) {
                    TextField("说点什么...", text: $repostContent, axis: .vertical)
                        .focused($isFocused)
                        .font(.system(size: 15))
                        .foregroundColor(.white)
                        .padding(12)
                        .background(Color(hex: "#2F3336"))
                        .cornerRadius(8)
                        .lineLimit(3...10)
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                
                Spacer()
            }
            .background(Color.black)
            .navigationTitle("转发")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        Task {
                            await onRepost()
                            if !isReposting {
                                dismiss()
                            }
                        }
                    }) {
                        if isReposting {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("转发")
                                .foregroundColor(repostContent.isEmpty ? Color(hex: "#71767A") : Color(hex: "#FF6B35"))
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(isReposting)
                }
            }
            .onAppear {
                isFocused = true
            }
        }
    }
}
