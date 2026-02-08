//
//  ActionSheetView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct ActionSheetView: View {
    @Binding var isPresented: Bool
    let actions: [ActionItem]
    let onActionSelected: (ActionItem) -> Void
    
    struct ActionItem: Identifiable {
        let id = UUID()
        let title: String
        let icon: String?
        let isDestructive: Bool
    }
    
    var body: some View {
        ZStack {
            if isPresented {
                // 背景遮罩
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation {
                            isPresented = false
                        }
                    }
                
                // 操作菜单
                VStack(spacing: 0) {
                    ForEach(actions) { action in
                        Button(action: {
                            onActionSelected(action)
                            withAnimation {
                                isPresented = false
                            }
                        }) {
                            HStack(spacing: 12) {
                                if let icon = action.icon {
                                    Image(systemName: icon)
                                        .foregroundColor(action.isDestructive ? .red : .white)
                                        .font(.system(size: 18))
                                        .frame(width: 24)
                                }
                                
                                Text(action.title)
                                    .font(.system(size: 16))
                                    .foregroundColor(action.isDestructive ? .red : .white)
                                
                                Spacer()
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        if action.id != actions.last?.id {
                            Divider()
                                .background(Color(hex: "#2F3336"))
                        }
                    }
                }
                .background(Color(hex: "#16181C"))
                .cornerRadius(12)
                .padding(.horizontal, 16)
                .padding(.bottom, 40)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.8), value: isPresented)
    }
}
