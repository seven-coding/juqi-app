//
//  UserSelectorView.swift
//  juqi
//

import SwiftUI

struct UserSelectorView: View {
    @Binding var selectedUsers: [AitUser]
    @State private var searchText: String = ""
    @State private var userList: [User] = []
    @State private var isLoading = false
    
    var body: some View {
        VStack(spacing: 0) {
            // 指示条
            Capsule()
                .fill(Color.white.opacity(0.1))
                .frame(width: 36, height: 5)
                .padding(.top, 12)
            
            // 搜索框
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.white.opacity(0.3))
                
                TextField("搜索用户", text: $searchText)
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                    .onSubmit {
                        if !searchText.isEmpty { Task { await searchUsers() } }
                    }
                
                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white.opacity(0.3))
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.white.opacity(0.05))
            .cornerRadius(16)
            .padding(20)
            
            if isLoading {
                ProgressView().padding()
            }
            
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(userList) { user in
                        Button(action: { toggleUser(user) }) {
                            HStack(spacing: 16) {
                                AsyncImage(url: URL(string: user.avatar ?? "")) { image in
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Circle().fill(Color.white.opacity(0.1))
                                        .overlay(Text(user.userName.prefix(1)).foregroundColor(.white))
                                }
                                .frame(width: 48, height: 48)
                                .clipShape(Circle())
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(user.userName)
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.white)
                                    if let signature = user.signature {
                                        Text(signature)
                                            .font(.system(size: 13))
                                            .foregroundColor(.white.opacity(0.4))
                                            .lineLimit(1)
                                    }
                                }
                                
                                Spacer()
                                
                                if selectedUsers.contains(where: { $0.openId == user.id }) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(Color(hex: "#FF6B35"))
                                        .font(.system(size: 24))
                                } else {
                                    Circle()
                                        .stroke(Color.white.opacity(0.1), lineWidth: 2)
                                        .frame(width: 24, height: 24)
                                }
                            }
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                        }
                    }
                }
            }
            
            // 已选用户栏
            if !selectedUsers.isEmpty {
                VStack(spacing: 0) {
                    Divider().background(Color.white.opacity(0.1))
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(selectedUsers, id: \.openId) { user in
                                userAvatar(user)
                            }
                        }
                        .padding(16)
                    }
                }
                .background(Color.black.opacity(0.3))
            }
        }
        .background(Color(hex: "#1A1A1A"))
        .onAppear {
            if userList.isEmpty { Task { await searchUsers() } }
        }
    }
    
    private func userAvatar(_ user: AitUser) -> some View {
        ZStack(alignment: .topTrailing) {
            Circle()
                .fill(Color(hex: "#FF6B35").opacity(0.2))
                .frame(width: 40, height: 40)
                .overlay(Text(user.nickName.prefix(1)).foregroundColor(Color(hex: "#FF6B35")))
            
            Button(action: {
                withAnimation { selectedUsers.removeAll { $0.openId == user.openId } }
            }) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.white)
                    .background(Color.black)
                    .clipShape(Circle())
                    .font(.system(size: 14))
            }
            .offset(x: 4, y: -4)
        }
    }
    
    private func toggleUser(_ user: User) {
        withAnimation(.spring(response: 0.3)) {
            if let index = selectedUsers.firstIndex(where: { $0.openId == user.id }) {
                selectedUsers.remove(at: index)
            } else {
                selectedUsers.append(AitUser(openId: user.id, nickName: user.userName))
            }
        }
    }
    
    private func searchUsers() async {
        isLoading = true
        do {
            userList = try await APIService.shared.searchUser(keyword: searchText)
        } catch {
            print(error)
        }
        isLoading = false
    }
}
