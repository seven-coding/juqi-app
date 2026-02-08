# 修复 Info.plist 重复输出错误

## 问题描述
错误信息显示 `Info.plist` 文件被同时添加到：
1. "Copy Bundle Resources" 构建阶段（通过 PBXFileSystemSynchronizedRootGroup 自动添加）
2. "Process Info.plist File" 构建阶段（通过 INFOPLIST_FILE 配置）

这导致构建时产生重复输出文件错误。

## 已完成的修复
✅ 已将 `GENERATE_INFOPLIST_FILE` 设置为 `NO`（避免自动生成冲突）

## 需要在 Xcode 中手动完成的步骤

### 方法 1：从 Copy Bundle Resources 中移除 Info.plist（推荐）

1. **打开项目**
   - 在 Xcode 中打开 `juqi.xcodeproj`

2. **选择 Target**
   - 在项目导航器中点击项目名称（最顶部的蓝色图标）
   - 在 TARGETS 列表中选择 "juqi"

3. **打开 Build Phases**
   - 点击顶部的 "Build Phases" 标签

4. **展开 Copy Bundle Resources**
   - 找到 "Copy Bundle Resources" 部分
   - 点击左侧的三角形展开它

5. **移除 Info.plist**
   - 在列表中查找 `Info.plist`
   - 如果存在，选中它并点击上方的 "-" 按钮删除
   - 或者右键点击 `Info.plist`，选择 "Delete"

6. **清理并重新构建**
   - 按 `Shift + Cmd + K` 清理构建文件夹
   - 按 `Cmd + B` 重新构建项目

### 方法 2：将文件夹转换为普通组（更彻底）

如果方法 1 无效，或者问题反复出现，可以禁用文件系统同步：

1. **在项目导航器中**
   - 找到 `juqi` 文件夹（包含源代码的文件夹）

2. **右键点击文件夹**
   - 选择 "Convert to Group"（转换为组）

3. **确认转换**
   - 这会禁用 `PBXFileSystemSynchronizedRootGroup` 功能
   - 之后需要手动管理文件引用（添加新文件时需要手动添加到项目）

4. **清理并重新构建**
   - 按 `Shift + Cmd + K` 清理构建文件夹
   - 按 `Cmd + B` 重新构建项目

## 验证修复

构建成功后，错误信息应该消失。如果问题仍然存在：

1. 检查 "Copy Bundle Resources" 中是否还有 `Info.plist`
2. 检查项目设置中的 `INFOPLIST_FILE` 配置是否正确
3. 确保 `GENERATE_INFOPLIST_FILE` 设置为 `NO`

## 注意事项

- `Info.plist` 应该只通过 `INFOPLIST_FILE` 配置被处理，不应该出现在 "Copy Bundle Resources" 中
- 如果使用 `PBXFileSystemSynchronizedRootGroup`，某些特殊文件（如 `Info.plist`）可能需要手动排除
- 转换文件夹为组后，添加新文件时需要手动添加到项目中
