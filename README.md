# OpenDig - DNS查询工具

基于 dig 工具的 DNS 查询 Web 界面，提供简洁的 Web UI 和 RESTful API。

## 功能特性

- 🌐 友好的 Web 界面进行 DNS 查询
- 🔧 支持多种 DNS 记录类型（A, AAAA, CNAME, MX, NS, TXT, SOA, PTR, SRV）
- 🎯 可指定自定义 DNS 服务器
- 📊 详细的查询结果展示
- 🚀 RESTful API 接口
- ⚙️ 灵活的 dig 工具路径配置
- 🌍 支持多子网查询，覆盖全球主要地区

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

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd open-dig
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
复制 `.env.example` 文件为 `.env.local` 并配置：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，设置您的 dig 工具路径：

```bash
# Windows 示例
BIND_PATH=D:\bind9\bin\dig.exe

# Linux 示例  
BIND_PATH=/usr/bin/dig

# macOS 示例
BIND_PATH=/usr/local/bin/dig
```

### 4. 启动应用
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

启动后访问 [http://localhost:3000](http://localhost:3000)

## 配置说明

### 环境变量配置

创建 `.env.local` 文件并配置以下变量：

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `BIND_PATH` | 是 | dig工具的完整路径 | `D:\bind9\bin\dig.exe` |
| `DEFAULT_DNS` | 否 | 默认DNS服务器 | `223.5.5.5` |
| `DEBUG` | 否 | 调试模式 | `true` |

#### Windows 路径配置

**推荐路径格式：**
```bash
# 使用完整绝对路径
BIND_PATH=D:\bind9\bin\dig.exe

# 如果路径包含空格，使用引号
BIND_PATH="C:\Program Files\ISC BIND 9\bin\dig.exe"
```

**常见安装位置：**
- BIND 9 官方安装：`C:\Program Files\ISC BIND 9\bin\dig.exe`
- 手动安装：`D:\bind9\bin\dig.exe`
- Chocolatey 安装：`C:\ProgramData\chocolatey\bin\dig.exe`

#### Linux/macOS 路径配置

```bash
# 系统默认位置
BIND_PATH=/usr/bin/dig

# Homebrew 安装 (macOS)
BIND_PATH=/usr/local/bin/dig

# 如果 dig 在 PATH 中
BIND_PATH=dig
```


### 调试模式

启用调试模式以获取详细的执行信息：

1. 在 `.env.local` 中设置 `DEBUG=true`
2. 重启应用程序
3. 查看控制台输出，包含：
   - 执行的 dig 命令
   - 解析结果详情
   - 错误诊断信息

## API 接口

### POST /api/dig

执行 DNS 查询

**请求体:**
```json
{
  "domain": "example.com",
  "recordType": "A",        // 可选，默认为 "A"
  "subnet": "1.2.3.0/24"   // 可选，指定子网
}
```

**响应（成功）:**
```json
{
  "success": true,
  "data": {
    "successfulResults": [
      {
        "subnetInfo": {
          "country": "中国",
          "region": "华东",
          "province": "上海",
          "isp": "电信",
          "subnet": "1.2.3.0/24"
        },
        "result": {
          "output": ";; dig example.com A +subnet=1.2.3.0/24 @223.5.5.5\n...",
          "parsed": {
            "status": "SUCCESS",
            "answer": [...],
            "header": {...}
          }
        },
        "success": true
      }
    ],
    "failedResults": [],
    "totalQueries": 1,
    "successCount": 1,
    "failureCount": 0
  }
}
```

**响应（失败）:**
```json
{
  "code": "InvalidParameters",
  "message": "参数验证失败",
  "errors": ["Domain parameter is required"]
}
```

### GET /api/status

获取系统状态和 dig 工具信息

**响应:**
```json
{
  "success": true,
  "data": {
    "dig": {
      "available": true,
      "path": "D:\\bind9\\bin\\dig.exe",
      "version": "DiG 9.18.12"
    },
    "platform": "win32",
    "debug": false
  }
}
```

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── dig/          # DNS查询API
│   │   └── status/       # 状态检查API
│   ├── layout.tsx        # 应用布局
│   └── page.tsx          # 主页面
├── components/
│   └── ui/               # UI组件库
├── lib/
│   ├── dig-service.ts    # dig服务逻辑
│   ├── dig-map.ts        # 子网映射配置
│   ├── validation.ts     # 参数验证
│   └── utils.ts          # 工具函数
└── types/
    └── dig.ts           # 类型定义
```

## 开发

### 可用脚本

```bash
# 开发模式运行
npm run dev

# 生产环境构建
npm run build

# 生产环境运行
npm start

# 代码格式化
npm run format

# 代码检查
npm run lint

# 运行测试
npm run test

# 安全检查
npm run check-security
```

### 故障排除

#### 常见问题

1. **"Dig tool not available" 错误**
   - 检查 `BIND_PATH` 环境变量是否正确
   - 确认 dig.exe 文件存在且可执行
   - 在 Windows 上确保路径包含 `.exe` 扩展名

2. **"Invalid option: +json" 错误**
   - 这是正常现象，程序会自动切换到兼容模式
   - 老版本 dig 工具不支持 JSON 输出，但仍能正常工作

3. **权限错误**
   - 确保应用程序有权限执行 dig 工具
   - 在 Linux/macOS 上检查文件权限

#### 调试步骤

1. 启用调试模式：`DEBUG=true`
2. 查看控制台输出
3. 访问 `/api/status` 检查 dig 工具状态
4. 检查环境变量配置

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v0.1.0
- 初始版本发布
- 支持基本 DNS 查询功能
- 支持多子网查询
- 提供 Web UI 和 RESTful API