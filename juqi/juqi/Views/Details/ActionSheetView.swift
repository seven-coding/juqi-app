//
//  ActionSheetView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//  更多弹窗：从底部弹出，参考 Apple iOS 官方最佳实践（拖拽指示器、分组列表、系统材料）
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

// MARK: - 更多选项底部 Sheet（iOS 风格：从底部弹出、拖拽指示器、分组列表）
struct MoreOptionsSheetView: View {
    let actions: [ActionSheetView.ActionItem]
    let onActionSelected: (ActionSheetView.ActionItem) -> Void
    let onDismiss: () -> Void
    
    private var destructiveActions: [ActionSheetView.ActionItem] {
        actions.filter { $0.isDestructive }
    }
    
    private var normalActions: [ActionSheetView.ActionItem] {
        actions.filter { !$0.isDestructive }
    }
    
    var body: some View {
        List {
            if !normalActions.isEmpty {
                Section {
                    ForEach(normalActions) { action in
                        rowButton(action: action)
                    }
                }
            }
            if !destructiveActions.isEmpty {
                Section {
                    ForEach(destructiveActions) { action in
                        rowButton(action: action)
                    }
                }
            }
            // 取消按钮放在 List 内独立 Section，保证始终在可视区域内可见
            Section {
                Button(action: onDismiss) {
                    Text("取消")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.accentColor)
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.visible)
        .background(Color(uiColor: .systemGroupedBackground))
        .presentationDetents(detents)
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(16)
    }
    
    private var detents: Set<PresentationDetent> {
        // 行数 + 取消行 + 拖拽指示器与边距，保证取消按钮不被裁掉
        let rowCount = actions.count + 1
        let height = 56 * rowCount + 80
        let clamped = min(max(height, 220), 520)
        return [.height(CGFloat(clamped))]
    }
    
    @ViewBuilder
    private func rowButton(action: ActionSheetView.ActionItem) -> some View {
        Button {
            onActionSelected(action)
            onDismiss()
        } label: {
            HStack(spacing: 12) {
                if let icon = action.icon {
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundColor(action.isDestructive ? .red : .primary)
                        .frame(width: 28, alignment: .center)
                }
                Text(action.title)
                    .font(.system(size: 17))
                    .foregroundColor(action.isDestructive ? .red : .primary)
            }
        }
    }
}
