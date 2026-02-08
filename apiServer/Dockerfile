# =====================================
# JUQI API Server - NestJS 云托管镜像
# =====================================

# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=80

# 复制 package 文件
COPY package*.json ./

# 仅安装生产依赖
RUN npm ci --omit=dev && npm cache clean --force

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 暴露端口（云托管默认使用 80）
EXPOSE 80

# 启动命令
CMD ["node", "dist/main"]
