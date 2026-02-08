# 修改 apple-app-site-association 文件的 Content-Type

## 问题

文件已上传，但 Content-Type 仍然是 `application/octet-stream`，导致浏览器提示下载而不是显示 JSON 内容。

## 解决方案

由于 CloudBase 工具无法直接修改文件的 Content-Type，需要通过以下方式之一来修改：

### 方法一：通过腾讯云 COS 控制台（推荐，最简单）

1. **访问腾讯云 COS 控制台**
   - 访问：https://console.cloud.tencent.com/cos
   - 找到存储桶：`a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640`

2. **找到文件**
   - 进入存储桶
   - 导航到 `.well-known/apple-app-site-association`

3. **修改元数据**
   - 点击文件右侧的"详情"或"更多"
   - 找到"元数据"或"HTTP 头"设置
   - 修改 `Content-Type` 为：`application/json`
   - 保存

### 方法二：使用 Python 脚本（需要 API 密钥）

1. **安装依赖**
   ```bash
   pip install cos-python-sdk-v5
   ```

2. **设置环境变量**
   ```bash
   export TENCENT_SECRET_ID='your_secret_id'
   export TENCENT_SECRET_KEY='your_secret_key'
   ```

3. **运行脚本**
   ```bash
   cd JUQI-APP/juqi
   python3 fix_content_type.py
   ```

### 方法三：使用腾讯云 CLI 工具

1. **安装 COSCLI**
   ```bash
   # macOS
   brew install coscli
   ```

2. **配置**
   ```bash
   coscli config
   ```

3. **修改元数据**
   ```bash
   coscli cp cos://a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640/.well-known/apple-app-site-association \
            cos://a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640/.well-known/apple-app-site-association \
            --metadata-directive REPLACE \
            --content-type application/json
   ```

## 验证

修改后，在终端执行：

```bash
curl -I https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association
```

查看响应头中的 `Content-Type`：
- ✅ 应该是 `application/json` 或 `text/plain`
- ❌ 不应该是 `application/octet-stream`

## 当前状态

- ✅ 文件已上传到：`.well-known/apple-app-site-association`
- ❌ Content-Type 仍然是：`application/octet-stream`
- ✅ 临时 JSON 文件（用于测试）：`.well-known/apple-app-site-association-temp.json` (Content-Type: `application/json`)

## 重要提示

1. **Apple 的要求**：Content-Type 必须是 `application/json` 或 `text/plain`，否则 Universal Links 可能无法正常工作
2. **文件必须无扩展名**：文件名必须是 `apple-app-site-association`（不能是 `.json`）
3. **修改后需要等待**：CDN 缓存可能需要几分钟才能刷新

## 推荐操作

**最简单的方法**：通过腾讯云 COS 控制台直接修改文件的元数据。

1. 访问：https://console.cloud.tencent.com/cos/bucket?bucket=a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640&region=ap-shanghai
2. 找到文件：`.well-known/apple-app-site-association`
3. 点击"详情" → "元数据" → 修改 `Content-Type` 为 `application/json`
4. 保存
