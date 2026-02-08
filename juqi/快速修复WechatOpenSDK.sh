#!/bin/bash

# 快速修复 WechatOpenSDK 模块导入错误

echo "🔧 开始修复 WechatOpenSDK 模块导入问题..."

# 设置编码
export LANG=en_US.UTF-8

# 进入项目目录
cd "$(dirname "$0")"

# 1. 确保 modulemap 存在
echo "📝 检查并创建 modulemap..."
mkdir -p Pods/Headers/Public/WechatOpenSDK

cat > Pods/Headers/Public/WechatOpenSDK/module.modulemap << 'EOF'
framework module WechatOpenSDK {
    umbrella header "WXApi.h"
    export *
    module * { export * }
    
    link "WechatOpenSDK"
    link "c++"
    link "sqlite3.0"
    link "z"
    link framework "CoreGraphics"
    link framework "Security"
    link framework "UIKit"
    link framework "WebKit"
}
EOF

echo "✅ modulemap 已创建"

# 2. 重新安装 Pods
echo "📦 重新安装 CocoaPods 依赖..."
pod install

if [ $? -eq 0 ]; then
    echo "✅ Pods 安装成功"
else
    echo "⚠️  Pod install 遇到问题，但 modulemap 已创建"
fi

# 3. 清理 Xcode 缓存
echo "🧹 清理建议："
echo "   1. 在 Xcode 中：Product → Clean Build Folder (Shift+Cmd+K)"
echo "   2. 关闭 Xcode"
echo "   3. 删除 DerivedData：rm -rf ~/Library/Developer/Xcode/DerivedData/juqi-*"
echo "   4. 重新打开 juqi.xcworkspace（不是 .xcodeproj！）"
echo "   5. 重新构建项目"

echo ""
echo "✨ 修复完成！请按照上述步骤操作。"
