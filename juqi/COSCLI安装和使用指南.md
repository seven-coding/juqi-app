# 腾讯云 COSCLI 工具安装和使用指南

## 📦 安装 COSCLI

### macOS 安装方法

#### 方法一：使用 Homebrew（推荐）

```bash
# 安装 Homebrew（如果还没有安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 COSCLI
brew install coscli
```

#### 方法二：手动下载安装

1. **下载 COSCLI**
   ```bash
   # 创建目录
   mkdir -p ~/coscli
   cd ~/coscli
   
   # 下载 macOS 版本
   wget https://github.com/tencentyun/coscli/releases/latest/download/coscli-darwin
   
   # 或者使用 curl
   curl -L https://github.com/tencentyun/coscli/releases/latest/download/coscli-darwin -o coscli
   ```

2. **设置执行权限**
   ```bash
   chmod +x coscli
   ```

3. **移动到系统路径（可选）**
   ```bash
   sudo mv coscli /usr/local/bin/coscli
   ```

4. **验证安装**
   ```bash
   coscli --version
   ```

### Linux 安装方法

```bash
# 下载 Linux 版本
wget https://github.com/tencentyun/coscli/releases/latest/download/coscli-linux

# 设置执行权限
chmod +x coscli-linux

# 移动到系统路径
sudo mv coscli-linux /usr/local/bin/coscli

# 验证安装
coscli --version
```

### Windows 安装方法

1. **下载 Windows 版本**
   - 访问：https://github.com/tencentyun/coscli/releases/latest
   - 下载 `coscli-windows.exe`

2. **重命名并添加到 PATH**
   - 将文件重命名为 `coscli.exe`
   - 添加到系统 PATH 环境变量中

## ⚙️ 配置 COSCLI

### 初始化配置

```bash
coscli config
```

配置过程中需要输入以下信息：

1. **Secret ID**：腾讯云 API 密钥 ID
   - 获取方式：https://console.cloud.tencent.com/cam/capi
   - 登录腾讯云控制台 → 访问管理 → API 密钥管理

2. **Secret Key**：腾讯云 API 密钥 Key
   - 同上，在 API 密钥管理页面获取

3. **存储桶别名**：可以自定义，如 `juqi-static`
   - 存储桶名称：`a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640`
   - 存储桶地域：`ap-shanghai`
   - 存储桶别名：`juqi-static`（可自定义）

### 配置示例

```
Secret ID: YOUR_SECRET_ID
Secret Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
存储桶名称: a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640
存储桶地域: ap-shanghai
存储桶别名: juqi-static
```

## 🔧 使用 COSCLI 修改 Content-Type

### 方法一：使用 cp 命令复制并替换元数据

```bash
coscli cp \
  cos://juqi-static/.well-known/apple-app-site-association \
  cos://juqi-static/.well-known/apple-app-site-association \
  --metadata-directive REPLACE \
  --content-type application/json
```

### 方法二：使用 update 命令更新元数据

```bash
coscli update \
  cos://juqi-static/.well-known/apple-app-site-association \
  --content-type application/json
```

### 方法三：直接指定存储桶信息（无需配置）

```bash
coscli cp \
  cos://a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640/.well-known/apple-app-site-association \
  cos://a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640/.well-known/apple-app-site-association \
  --region ap-shanghai \
  --secret-id YOUR_SECRET_ID \
  --secret-key YOUR_SECRET_KEY \
  --metadata-directive REPLACE \
  --content-type application/json
```

## ✅ 验证修改结果

修改后，验证 Content-Type 是否正确：

```bash
# 查看文件信息
coscli stat cos://juqi-static/.well-known/apple-app-site-association

# 或者使用 curl 验证
curl -I https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association
```

应该看到 `Content-Type: application/json`

## 📝 完整操作步骤（macOS）

### 1. 安装 COSCLI

```bash
# 使用 Homebrew 安装（推荐）
brew install coscli

# 或者手动安装
mkdir -p ~/coscli && cd ~/coscli
curl -L https://github.com/tencentyun/coscli/releases/latest/download/coscli-darwin -o coscli
chmod +x coscli
sudo mv coscli /usr/local/bin/coscli
```

### 2. 配置 COSCLI

```bash
coscli config
```

输入以下信息：
- Secret ID：从腾讯云控制台获取
- Secret Key：从腾讯云控制台获取
- 存储桶名称：`a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640`
- 存储桶地域：`ap-shanghai`
- 存储桶别名：`juqi-static`（可自定义）

### 3. 修改 Content-Type

```bash
coscli cp \
  cos://juqi-static/.well-known/apple-app-site-association \
  cos://juqi-static/.well-known/apple-app-site-association \
  --metadata-directive REPLACE \
  --content-type application/json
```

### 4. 验证结果

```bash
curl -I https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association | grep -i content-type
```

应该看到：`content-type: application/json`

## 🔑 获取腾讯云 API 密钥

1. **访问腾讯云控制台**
   - https://console.cloud.tencent.com/cam/capi

2. **创建 API 密钥**
   - 点击"新建密钥"
   - 记录 Secret ID 和 Secret Key

3. **安全提示**
   - ⚠️ 不要将密钥提交到代码仓库
   - ⚠️ 不要分享给他人
   - ⚠️ 定期轮换密钥

## 🛠️ 其他常用命令

### 列出文件

```bash
coscli ls cos://juqi-static/.well-known/
```

### 上传文件

```bash
coscli cp local-file.txt cos://juqi-static/path/to/file.txt
```

### 下载文件

```bash
coscli cp cos://juqi-static/path/to/file.txt ./local-file.txt
```

### 删除文件

```bash
coscli rm cos://juqi-static/path/to/file.txt
```

### 查看文件信息

```bash
coscli stat cos://juqi-static/path/to/file.txt
```

## 📚 参考链接

- **COSCLI GitHub**: https://github.com/tencentyun/coscli
- **COSCLI 文档**: https://cloud.tencent.com/document/product/436/63143
- **腾讯云 API 密钥管理**: https://console.cloud.tencent.com/cam/capi

## ⚠️ 注意事项

1. **权限要求**：确保 API 密钥有 COS 存储桶的读写权限
2. **地域设置**：确保存储桶地域配置正确（`ap-shanghai`）
3. **CDN 缓存**：修改后可能需要等待几分钟让 CDN 缓存刷新
4. **文件路径**：确保文件路径正确（`.well-known/apple-app-site-association`）
