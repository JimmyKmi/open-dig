# OpenDig - DNS查询工具

基于 dig 工具的 DNS 查询 Web 界面，提供简洁的 Web UI 和 RESTful API。

## 功能特性

- 🌐 友好的 Web 界面进行 DNS 查询
- 🔧 支持多种 DNS 记录类型（A, AAAA, CNAME, MX, NS, TXT, SOA, PTR, SRV）
- 🎯 可指定自定义 DNS 服务器
- 📊 详细的查询结果展示
- 🚀 RESTful API 接口
- ⚙️ 灵活的 dig 工具路径配置

## 环境要求

- Node.js 18+ 
- 系统已安装 dig 工具（bind9）

### dig 工具安装

**Windows:**
```bash
# 使用 Chocolatey
choco install bind-toolsonly

# 或下载 BIND 9 安装包
# https://www.isc.org/download/
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install dnsutils
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install bind-utils
```

**macOS:**
```bash
# 使用 Homebrew
brew install bind
```

## 配置

### 环境变量配置

创建 `.env.local` 文件并配置 dig 工具路径：

```bash
# dig工具的完整路径
# Windows示例:
BIND_PATH=C:\Program Files\ISC BIND 9\bin\dig.exe
# 或者（如果路径包含空格）:
BIND_PATH=C:\Users\jimmy\Downloads\bin\dig.exe

# Linux示例:
BIND_PATH=/usr/bin/dig

# macOS示例:
BIND_PATH=/usr/local/bin/dig

# 如果dig在系统PATH中，可以简单设置为:
BIND_PATH=dig

# 调试模式（可选）
DEBUG=true
```

#### dig 版本兼容性

本程序支持新旧两种版本的 dig 工具：

**新版本 (支持 +json)**
- 自动使用 JSON 格式输出，解析更准确
- BIND 9.16+ 版本支持

**老版本 (不支持 +json)**
- 自动回退到文本格式输出
- 使用内置解析器处理传统格式
- 支持所有版本的 dig 工具

#### Windows 特别说明

1. **路径格式**: 使用完整的绝对路径，包含 `.exe` 扩展名
2. **路径验证**: 确保文件确实存在于指定路径
3. **权限检查**: 确保应用程序有权限执行该文件
4. **调试信息**: 访问状态页面查看详细的错误信息

常见的 Windows dig 工具位置：
- BIND 9 安装后通常在: `C:\Program Files\ISC BIND 9\bin\dig.exe`
- 手动下载的版本: `C:\Users\用户名\Downloads\bin\dig.exe`

#### 故障排除

如果遇到 "Invalid option: +json" 错误：
- 这是正常现象，程序会自动切换到兼容模式
- 老版本 dig 工具不支持 JSON 输出，但仍能正常工作

#### 调试模式

启用调试模式以获取详细的执行信息：

1. 在 `.env.local` 中设置 `DEBUG=true`
2. 重启应用程序
3. 查看控制台输出，包含：
   - 执行的 dig 命令
   - 解析结果详情
   - 错误诊断信息

**启动时输出（始终显示）：**
- 系统平台信息
- dig 工具路径
- 调试模式状态

**调试模式输出（仅 DEBUG=true 时）：**
- 每次查询的具体命令
- dig 输出解析结果
- 版本切换过程

## 安装和运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 生产环境构建
npm run build

# 生产环境运行
npm start
```

启动后访问 [http://localhost:3000](http://localhost:3000)

## API 接口

### POST /api/dig

执行 DNS 查询

**请求体:**
```json
{
  "domain": "example.com",
  "recordType": "A",        // 可选，默认为 "A"
  "dnsServer": "8.8.8.8"    // 可选
}
```

**响应（成功）:**
```json
{
  "success": true,
  "data": {
    "command": "dig +json example.com A",
    "output": "...",
    "parsed": {
      "status": "SUCCESS",
      "answer": [...],
      "statistics": {
        "queryTime": "2 msec",
        "server": "192.168.1.1#53",
        "when": "Sun Sep 14 12:00:00 UTC 2025",
        "msgSize": "62"
      }
    }
  }
}
```

**响应（失败）:**
```json
{
  "code": "DomainRequired",
  "message": "Domain parameter is required"
}
```

## 项目结构

```
src/
├── app/
│   ├── api/dig/          # API 路由
│   ├── layout.tsx        # 应用布局
│   └── page.tsx          # 主页面
└── lib/
    └── dig-service.ts    # dig 服务逻辑
```

## 开发

```bash
# 代码格式化
npm run format

# 代码检查
npm run lint

# 运行测试
npm run test

# 安全检查
npm run check-security
```