//
//  ToastView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI
import Combine

struct ToastView: ViewModifier {
    @Binding var isPresented: Bool
    let message: String
    let type: ToastType
    let duration: TimeInterval
    
    enum ToastType {
        case success
        case error
        case info
        
        var icon: String {
            switch self {
            case .success:
                return "checkmark.circle.fill"
            case .error:
                return "xmark.circle.fill"
            case .info:
                return "info.circle.fill"
            }
        }
        
        var color: Color {
            switch self {
            case .success:
                return Color(hex: "#4CAF50")
            case .error:
                return Color(hex: "#F44336")
            case .info:
                return Color(hex: "#2196F3")
            }
        }
    }
    
    func body(content: Content) -> some View {
        ZStack {
            content
            
            if isPresented {
                VStack {
                    Spacer()
                    
                    HStack(spacing: 12) {
                        Image(systemName: type.icon)
                            .foregroundColor(type.color)
                            .font(.system(size: 20))
                        
                        Text(message)
                            .font(.system(size: 15))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(hex: "#1C1C1E"))
                            .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
                    )
                    .padding(.horizontal, 20)
                    .padding(.bottom, 50)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: isPresented)
        .onChange(of: isPresented) { oldValue, newValue in
            if newValue {
                DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                    withAnimation {
                        isPresented = false
                    }
                }
            }
        }
    }
}

extension View {
    func toast(isPresented: Binding<Bool>, message: String, type: ToastView.ToastType = .info, duration: TimeInterval = 2.0) -> some View {
        self.modifier(ToastView(isPresented: isPresented, message: message, type: type, duration: duration))
    }
}

// MARK: - Toast Manager
class ToastManager: ObservableObject {
    static let shared = ToastManager()
    
    @Published var isPresented = false
    @Published var message = ""
    @Published var type: ToastView.ToastType = .info
    
    private init() {}
    
    func show(message: String, type: ToastView.ToastType = .info) {
        self.message = message
        self.type = type
        withAnimation {
            isPresented = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            withAnimation {
                self.isPresented = false
            }
        }
    }
    
    func success(_ message: String) {
        show(message: message, type: .success)
    }
    
    func error(_ message: String) {
        show(message: message, type: .error)
    }
    
    func info(_ message: String) {
        show(message: message, type: .info)
    }
}
