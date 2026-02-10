# JUQI App API Server (v2版本)

## 项目说明

这是JUQI iOS App的独立API服务，v2版本，与小程序API服务完全隔离。

## 环境变量配置

### 必需的环境变量

创建 `.env` 文件（不要提交到仓库）：

```bash
# 运行环境
NODE_ENV=development  # development | test | production

# 云开发凭证（用于调用云函数）
CLOUD_BASE_ID=你的SecretId
CLOUD_BASE_KEY=你的SecretKey

# 云开发环境ID
# 测试环境
TCB_ENV_TEST=test-juqi-3g1m5qa7cc2737a1
# 生产环境
TCB_ENV_PROD=prod-juqi-7glu2m8qfa31e13f

# 服务端口
PORT=9999
```

### 环境变量说明

- `NODE_ENV`: 运行环境，决定使用哪个云开发环境
  - `development` 或 `test`: 使用测试环境
  - `production`: 使用生产环境

- `CLOUD_BASE_ID` / `CLOUD_BASE_KEY`: 云开发API密钥
  - 从腾讯云控制台 → 访问管理 → API密钥管理获取

- `TCB_ENV_TEST`: 测试云开发环境ID
- `TCB_ENV_PROD`: 生产云开发环境ID

## 开发

```bash
# 安装依赖
npm install

# 开发模式（自动重启）
npm run start:dev

# 构建
npm run build

# 生产模式
npm run start:prod
```

## 部署

### 云托管部署

1. 构建项目：`npm run build`
2. **在云托管服务中配置环境变量**（必做，否则登录等接口会报 500）
   - 打开 [云开发控制台](https://console.cloud.tencent.com/tcb) → 云托管 → 找到 apiServer 对应服务
   - 编辑服务 → 配置 → 环境变量，新增：
     - `CLOUD_BASE_ID` = 腾讯云「访问管理 → [API 密钥管理](https://console.cloud.tencent.com/cam/capi)」中的 **SecretId**
     - `CLOUD_BASE_KEY` = 上述密钥对应的 **SecretKey**
   - 必须使用 **SecretId/SecretKey**，不能使用云开发 API Key（JWT），否则会报错：`The SecretId doesn't exist or the token parameter in the temporary key is missing`
3. 上传构建后的代码（包含 `dist` 目录）
4. 配置启动命令：`node dist/main.js`
5. 修改环境变量后需重新发布版本或重启服务使配置生效

## API接口

### 统一入口

- 路径: `/app/v2/api`
- 方法: `POST`
- 请求体:
```json
{
  "operation": "appLogin",
  "data": {...},
  "token": "..."
}
```

注意：`source='v2'` 参数会自动添加，无需手动传递。

## 注意事项

1. `.env` 文件包含敏感信息，不要提交到代码仓库
2. 确保环境变量正确配置，否则服务无法启动
3. 测试和生产环境使用不同的云开发环境，确保数据隔离
