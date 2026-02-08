//
//  DiscoverView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct DiscoverView: View {
    var body: some View {
        ZStack {
            Color(hex: "#000000")
                .ignoresSafeArea()
            
            VStack {
                Text("发现")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
            }
        }
    }
}
