#!/bin/bash

# =====================================
# JUQI API Server 部署脚本
# 用于部署到腾讯云托管
# =====================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   JUQI API Server 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否安装了 cloudbase cli
if ! command -v tcb &> /dev/null; then
    echo -e "${RED}错误: 未安装 cloudbase cli${NC}"
    echo -e "${YELLOW}请运行: npm install -g @cloudbase/cli${NC}"
    exit 1
fi

# 检查登录状态
echo -e "${YELLOW}检查登录状态...${NC}"
if ! tcb login --status &> /dev/null; then
    echo -e "${YELLOW}请先登录...${NC}"
    tcb login
fi

# 构建项目
echo -e "${YELLOW}构建项目...${NC}"
npm run build

# 确认部署
echo ""
echo -e "${YELLOW}即将部署到测试环境 (test-juqi-3g1m5qa7cc2737a1)${NC}"
read -p "确认部署? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}部署已取消${NC}"
    exit 1
fi

# 部署
echo -e "${YELLOW}开始部署...${NC}"
tcb framework deploy

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   部署完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "API 地址: https://test-juqi-3g1m5qa7cc2737a1.ap-shanghai.tcb-api.tencentcloudapi.com/app/v2"
echo ""
