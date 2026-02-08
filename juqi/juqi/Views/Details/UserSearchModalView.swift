//
//  UserSearchModalView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct UserSearchModalView: View {
    @Binding var isPresented: Bool
    let onUserSelected: (AitUser) -> Void
    
    @State private var searchText = ""
    @State private var users: [User] = []
    @State private var isLoading = false
    
    var body: some View {
        VStack(spacing: 0) {
            // 搜索框
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Color(hex: "#71767A"))
                
                TextField("搜索用户", text: $searchText)
                    .font(.system(size: 15))
                    .foregroundColor(.white)
                    .onChange(of: searchText) { oldValue, newValue in
                        Task {
                            await searchUsers(keyword: newValue)
                        }
                    }
                
                if !searchText.isEmpty {
                    Button(action: {
                        searchText = ""
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Color(hex: "#71767A"))
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(hex: "#2F3336"))
            .cornerRadius(20)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            
            // 用户列表
            if isLoading {
                ProgressView()
                    .tint(Color(hex: "#FF6B35"))
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if users.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 40))
                        .foregroundColor(Color(hex: "#71767A"))
                    
                    Text(searchText.isEmpty ? "输入用户名搜索" : "未找到用户")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#71767A"))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(users) { user in
                            Button(action: {
                                let aitUser = AitUser(openId: user.id, nickName: user.userName)
                                onUserSelected(aitUser)
                                isPresented = false
                            }) {
                                HStack(spacing: 12) {
                                    AsyncImage(url: URL(string: user.avatar ?? "")) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Circle()
                                            .fill(Color(hex: "#2F3336"))
                                            .overlay(
                                                Text(user.userName.isEmpty ? "匿" : String(user.userName.prefix(1)))
                                                    .foregroundColor(.white)
                                                    .font(.system(size: 14, weight: .medium))
                                            )
                                    }
                                    .frame(width: 40, height: 40)
                                    .clipShape(Circle())
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(user.userName.isEmpty ? "匿名用户" : user.userName)
                                            .font(.system(size: 15, weight: .medium))
                                            .foregroundColor(.white)
                                        
                                        if let signature = user.signature, !signature.isEmpty {
                                            Text(signature)
                                                .font(.system(size: 13))
                                                .foregroundColor(Color(hex: "#71767A"))
                                                .lineLimit(1)
                                        }
                                    }
                                    
                                    Spacer()
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Divider()
                                .background(Color(hex: "#2F3336"))
                        }
                    }
                }
            }
        }
        .background(Color(hex: "#000000"))
        .frame(height: 300)
        .cornerRadius(12)
        .shadow(radius: 10)
    }
    
    private func searchUsers(keyword: String) async {
        guard !keyword.isEmpty else {
            await MainActor.run {
                users = []
            }
            return
        }
        
        isLoading = true
        
        do {
            let searchResults = try await APIService.shared.searchUser(keyword: keyword)
            await MainActor.run {
                users = searchResults
                isLoading = false
            }
        } catch {
            await MainActor.run {
                users = []
                isLoading = false
            }
        }
    }
}
