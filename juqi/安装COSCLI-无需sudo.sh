#!/bin/bash

# 腾讯云 COSCLI 安装脚本（无需 sudo）

echo "🚀 开始安装腾讯云 COSCLI 工具（无需 sudo）..."

# 创建安装目录（在用户目录下）
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 检测系统架构
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    echo "✅ 检测到 Apple Silicon (ARM64)"
    DOWNLOAD_URL="https://github.com/tencentyun/coscli/releases/latest/download/coscli-darwin-arm64"
elif [ "$ARCH" = "x86_64" ]; then
    echo "✅ 检测到 Intel (x86_64)"
    DOWNLOAD_URL="https://github.com/tencentyun/coscli/releases/latest/download/coscli-darwin"
else
    echo "❌ 不支持的架构: $ARCH"
    exit 1
fi

# 下载 COSCLI
echo "📥 正在下载 COSCLI..."
curl -L "$DOWNLOAD_URL" -o coscli

# 检查下载是否成功
if [ ! -f "coscli" ]; then
    echo "❌ 下载失败，请手动下载："
    echo "   $DOWNLOAD_URL"
    exit 1
fi

# 设置执行权限
chmod +x coscli

# 验证安装
echo "✅ 验证安装..."
./coscli --version

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ COSCLI 安装成功！"
    echo ""
    echo "📝 安装位置: $INSTALL_DIR/coscli"
    echo ""
    echo "🔧 添加到 PATH（可选）："
    echo ""
    echo "1. 编辑 ~/.zshrc 文件："
    echo "   nano ~/.zshrc"
    echo ""
    echo "2. 添加以下行："
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "3. 重新加载配置："
    echo "   source ~/.zshrc"
    echo ""
    echo "4. 或者直接使用完整路径："
    echo "   $INSTALL_DIR/coscli --version"
    echo ""
    echo "5. 配置 COSCLI："
    echo "   $INSTALL_DIR/coscli config"
    echo ""
    echo "6. 修改 Content-Type（使用完整路径）："
    echo "   $INSTALL_DIR/coscli cp \\"
    echo "     cos://a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640/.well-known/apple-app-site-association \\"
    echo "     cos://a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640/.well-known/apple-app-site-association \\"
    echo "     --region ap-shanghai \\"
    echo "     --secret-id YOUR_SECRET_ID \\"
    echo "     --secret-key YOUR_SECRET_KEY \\"
    echo "     --metadata-directive REPLACE \\"
    echo "     --content-type application/json"
else
    echo "❌ 安装验证失败"
    exit 1
fi
