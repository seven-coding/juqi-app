import SwiftUI

struct EmojiPickerView: View {
    @Binding var isPresented: Bool
    let onEmojiSelected: (String) -> Void
    
    @State private var selectedCategoryIndex: Int = 1 // 默认为表情
    
    // 业内通用分类与数据结构
    struct EmojiGroup: Identifiable {
        let id = UUID()
        let name: String
        let icon: String
        let emojis: [String]
    }
    
    private let emojiGroups: [EmojiGroup] = [
        EmojiGroup(name: "最近", icon: "clock", emojis: ["😭", "😮", "🤡", "🍑", "🎉", "🔥", "✨", "💯", "❤️", "👍"]),
        EmojiGroup(name: "表情", icon: "face.smiling", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠"]),
        EmojiGroup(name: "动物", icon: "dog", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊"]),
        EmojiGroup(name: "自然", icon: "leaf", emojis: ["🌵", "🎄", "🌲", "🌳", "🌴", "🌱", "🌿", "☘️", "🍀", "🎍", "🪴", "🎋", "🍃", "🍂", "🍁", "🍄", "🐚", "🌾", "💐", "🌷", "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "🌞", "🌝", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔", "🌙", "🌎", "🌍", "🌏", "🪐", "💫", "⭐️", "🌟", "✨", "⚡️", "☄️", "💥", "🔥", "🌪", "🌈", "☀️", "🌤", "⛅️", "🌥", "☁️", "🌦", "🌧", "⛈", "🌩", "🌨", "❄️", "☃️", "⛄️", "🌬", "💨", "💧", "💦", "☔️", "☂️", "🌊", "🌫"])
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // 表情滚动区域
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // 只显示当前选中的分类内容
                        VStack(alignment: .leading, spacing: 12) {
                            Text(emojiGroups[selectedCategoryIndex].name)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white.opacity(0.5))
                            
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 6), spacing: 12) {
                                ForEach(emojiGroups[selectedCategoryIndex].emojis, id: \.self) { emoji in
                                    emojiButton(emoji)
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                        .id(selectedCategoryIndex)
                    }
                }
                .onChange(of: selectedCategoryIndex) { _, _ in
                    // 切换分类时回到顶部
                    withAnimation {
                        proxy.scrollTo(selectedCategoryIndex, anchor: .top)
                    }
                }
            }
            
            // 底部导航栏
            HStack(spacing: 0) {
                // 分类图标列表
                HStack(spacing: 12) {
                    ForEach(0..<emojiGroups.count, id: \.self) { index in
                        categoryIcon(systemName: emojiGroups[index].icon, index: index)
                    }
                }
                .padding(.leading, 20)
                
                Spacer()
                
                // 删除按钮
                Button(action: {
                    NotificationCenter.default.post(name: NSNotification.Name("EmojiDeleteRequested"), object: nil)
                }) {
                    Image(systemName: "delete.left.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.white.opacity(0.6))
                        .frame(width: 50, height: 36)
                        .background(Color.white.opacity(0.1))
                        .cornerRadius(8)
                }
                .padding(.trailing, 20)
            }
            .padding(.vertical, 10)
            .background(Color.black.opacity(0.3))
        }
        .background(Color(hex: "#1A1A1A"))
    }
    
    private func emojiButton(_ emoji: String) -> some View {
        Button(action: {
            onEmojiSelected(emoji)
        }) {
            Text(emoji)
                .font(.system(size: 32))
                .frame(maxWidth: .infinity)
                .aspectRatio(1, contentMode: .fit)
        }
    }
    
    private func categoryIcon(systemName: String, index: Int) -> some View {
        Button(action: { 
            withAnimation(.spring(response: 0.3)) {
                selectedCategoryIndex = index 
            }
        }) {
            Image(systemName: systemName)
                .font(.system(size: 18))
                .foregroundColor(selectedCategoryIndex == index ? .white : .white.opacity(0.3))
                .frame(width: 36, height: 36)
                .background(selectedCategoryIndex == index ? Color.white.opacity(0.1) : Color.clear)
                .cornerRadius(8)
        }
    }
}
