# 手动安装 COSCLI 步骤（解决下载问题）

## 🔍 问题分析

从错误信息看，下载的文件可能不是正确的二进制文件。让我们手动下载并验证。

## 📝 手动安装步骤

### 步骤 1：创建目录

```bash
mkdir -p ~/coscli
cd ~/coscli
```

### 步骤 2：检测你的 Mac 架构

```bash
uname -m
```

- 如果显示 `arm64`，说明是 Apple Silicon (M1/M2/M3)
- 如果显示 `x86_64`，说明是 Intel 芯片

### 步骤 3：下载 COSCLI

根据你的架构选择对应的下载命令：

#### Apple Silicon (arm64)

```bash
curl -L -o coscli "https://github.com/tencentyun/coscli/releases/download/v0.13.0-beta/coscli-darwin-arm64"
```

#### Intel (x86_64)

```bash
curl -L -o coscli "https://github.com/tencentyun/coscli/releases/download/v0.13.0-beta/coscli-darwin"
```

### 步骤 4：验证下载的文件

```bash
# 查看文件大小（应该大于 10MB）
ls -lh coscli

# 查看文件类型（应该是 Mach-O 二进制文件）
file coscli
```

如果文件很小（比如只有几 KB），说明下载失败，可能是：
- GitHub 访问问题
- 需要代理
- 链接已失效

### 步骤 5：设置执行权限

```bash
chmod +x coscli
```

### 步骤 6：验证安装

```bash
./coscli --version
```

应该看到版本号，例如：`coscli version v0.13.0-beta`

## 🔧 如果下载失败

### 方法一：使用浏览器下载

1. 访问 GitHub Releases 页面：
   - https://github.com/tencentyun/coscli/releases/latest
   - 或直接访问：https://github.com/tencentyun/coscli/releases/tag/v0.13.0-beta

2. 根据你的 Mac 架构下载：
   - Apple Silicon: `coscli-darwin-arm64`
   - Intel: `coscli-darwin`

3. 下载后，将文件移动到 `~/coscli/` 目录：
   ```bash
   mv ~/Downloads/coscli-darwin-arm64 ~/coscli/coscli
   chmod +x ~/coscli/coscli
   ```

### 方法二：检查网络连接

```bash
# 测试 GitHub 连接
curl -I https://github.com

# 如果无法访问，可能需要配置代理或使用镜像
```

### 方法三：使用其他下载工具

```bash
# 使用 wget（如果已安装）
wget https://github.com/tencentyun/coscli/releases/download/v0.13.0-beta/coscli-darwin-arm64 -O coscli

# 或使用 aria2（如果已安装）
aria2c https://github.com/tencentyun/coscli/releases/download/v0.13.0-beta/coscli-darwin-arm64 -o coscli
```

## ✅ 安装成功后

### 1. 添加到 PATH（可选）

编辑 `~/.zshrc`：

```bash
nano ~/.zshrc
```

添加这一行：

```bash
export PATH="$HOME/coscli:$PATH"
```

保存后重新加载：

```bash
source ~/.zshrc
```

### 2. 配置 COSCLI

```bash
coscli config
```

或使用完整路径：

```bash
~/coscli/coscli config
```

### 3. 修改 Content-Type

```bash
~/coscli/coscli cp \
  cos://a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640/.well-known/apple-app-site-association \
  cos://a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640/.well-known/apple-app-site-association \
  --region ap-shanghai \
  --secret-id YOUR_SECRET_ID \
  --secret-key YOUR_SECRET_KEY \
  --metadata-directive REPLACE \
  --content-type application/json
```

## 🔗 备用下载链接

如果 GitHub 无法访问，可以尝试：

1. **腾讯云官方文档**：
   - https://cloud.tencent.com/document/product/436/63143

2. **直接下载链接**（可能需要登录 GitHub）：
   - Apple Silicon: https://github.com/tencentyun/coscli/releases/download/v0.13.0-beta/coscli-darwin-arm64
   - Intel: https://github.com/tencentyun/coscli/releases/download/v0.13.0-beta/coscli-darwin

## 📋 快速检查清单

- [ ] 创建了 `~/coscli` 目录
- [ ] 检测了 Mac 架构（`uname -m`）
- [ ] 下载了对应架构的文件
- [ ] 文件大小合理（> 10MB）
- [ ] 设置了执行权限（`chmod +x`）
- [ ] 验证了安装（`./coscli --version`）
- [ ] 配置了 COSCLI（`coscli config`）
- [ ] 修改了 Content-Type

## ⚠️ 常见问题

### 问题 1：下载的文件很小（几 KB）

**原因**：下载失败，可能是 HTML 错误页面

**解决**：
- 检查网络连接
- 使用浏览器直接下载
- 配置代理（如果需要）

### 问题 2：`command not found: #`

**原因**：脚本中的注释被当作命令执行

**解决**：直接执行命令，不要复制注释行

### 问题 3：`Permission denied`

**原因**：文件没有执行权限

**解决**：
```bash
chmod +x coscli
```

### 问题 4：`Not: command not found`

**原因**：下载的文件不是正确的二进制文件

**解决**：
- 删除错误文件：`rm coscli`
- 重新下载
- 或使用浏览器下载
