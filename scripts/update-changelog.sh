#!/bin/bash

# CHANGELOG 更新辅助脚本
# 此脚本帮助开发者快速更新 CHANGELOG.md

CHANGELOG_FILE="CHANGELOG.md"
TEMPLATE_FILE="docs/CHANGELOG模板.md"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}     JUQI App - CHANGELOG 更新助手${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# 检查 CHANGELOG.md 是否存在
if [ ! -f "$CHANGELOG_FILE" ]; then
    echo -e "${RED}错误: $CHANGELOG_FILE 文件不存在${NC}"
    exit 1
fi

echo -e "${GREEN}当前 CHANGELOG 状态:${NC}"
echo ""

# 显示 Unreleased 部分
echo -e "${YELLOW}[未发布 / Unreleased] 部分内容:${NC}"
sed -n '/## \[未发布/,/^## \[/p' "$CHANGELOG_FILE" | head -n -1
echo ""

echo -e "${BLUE}==================================================${NC}"
echo ""
echo -e "${YELLOW}请选择操作:${NC}"
echo "1) 查看模板和更新指南"
echo "2) 打开 CHANGELOG.md 进行编辑"
echo "3) 验证 CHANGELOG.md 格式"
echo "4) 显示最近的提交信息（用于参考）"
echo "5) 退出"
echo ""
read -p "请选择 (1-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}查看模板和更新指南...${NC}"
        if [ -f "$TEMPLATE_FILE" ]; then
            cat "$TEMPLATE_FILE"
        else
            echo -e "${RED}错误: 模板文件不存在${NC}"
        fi
        ;;
    2)
        echo ""
        echo -e "${GREEN}打开 CHANGELOG.md 进行编辑...${NC}"
        ${EDITOR:-vim} "$CHANGELOG_FILE"
        ;;
    3)
        echo ""
        echo -e "${GREEN}验证 CHANGELOG.md 格式...${NC}"
        
        # 检查必需的部分
        if ! grep -q "## \[未发布 / Unreleased\]" "$CHANGELOG_FILE"; then
            echo -e "${RED}✗ 缺少 [未发布 / Unreleased] 部分${NC}"
        else
            echo -e "${GREEN}✓ 包含 [未发布 / Unreleased] 部分${NC}"
        fi
        
        # 检查变更类型标题
        types=("### 新增 (Added)" "### 变更 (Changed)" "### 修复 (Fixed)")
        for type in "${types[@]}"; do
            if grep -q "$type" "$CHANGELOG_FILE"; then
                echo -e "${GREEN}✓ 包含 $type 部分${NC}"
            fi
        done
        
        echo ""
        echo -e "${GREEN}格式验证完成${NC}"
        ;;
    4)
        echo ""
        echo -e "${GREEN}最近的 Git 提交记录:${NC}"
        echo ""
        git log --oneline -10 --no-decorate
        echo ""
        echo -e "${YELLOW}提示: 这些提交信息可以帮助你回忆做了哪些更改${NC}"
        ;;
    5)
        echo ""
        echo -e "${GREEN}退出${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}无效的选择${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}完成!${NC}"
echo ""
echo -e "${YELLOW}提醒:${NC}"
echo "  • 每次提交代码前都应更新 CHANGELOG.md"
echo "  • 在 [未发布 / Unreleased] 部分添加变更"
echo "  • 使用清晰简洁的中英文双语描述"
echo "  • 按变更类型分类: 新增/变更/修复等"
echo ""
echo -e "${BLUE}==================================================${NC}"
