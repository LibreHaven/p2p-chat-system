# P2P 聊天系统

基于 WebRTC 和 PeerJS 的点对点加密聊天应用，实现完全去中心化的安全通信。

## 项目概述

本项目是一个基于 WebRTC 技术构建的点对点（P2P）聊天系统，通过 PeerJS 简化信令交换流程，实现实时文字聊天。系统采用端到端加密，确保通信内容的隐私安全。用户只需输入彼此的唯一 ID 即可发起连接，系统自动处理 NAT 穿透与连接状态管理。

### 主要特性

- **完全点对点通信**：数据直接在用户之间传输，不经过中心服务器存储
- **端到端加密**：采用 ECDH 密钥协商和 AES-256 加密，确保通信安全
- **简单易用**：用户只需输入 ID 即可建立连接，无需注册账号
- **NAT 穿透**：利用 STUN 服务器实现不同网络环境下的连接
- **响应式设计**：适配不同设备屏幕尺寸的用户界面

## 技术栈

- **前端框架**：React
- **P2P 通信**：WebRTC、PeerJS
- **加密技术**：ECDH 密钥协商、AES-256 加密
- **样式处理**：Styled Components
- **构建工具**：Webpack、Babel

## 项目结构

```
p2p-chat-system/
├── public/                 # 静态资源
│   └── index.html          # HTML 模板
├── src/                    # 源代码
│   ├── components/         # React 组件
│   │   ├── ChatScreen.js   # 聊天界面组件
│   │   ├── ConnectionScreen.js  # 连接界面组件
│   │   ├── CopyableId.js   # 可复制 ID 组件
│   │   ├── ErrorScreen.js  # 错误提示界面组件
│   │   ├── MessageBubble.js  # 消息气泡组件
│   │   ├── MessageComposer.js  # 消息输入组件
│   │   ├── StatusIndicator.js  # 状态指示器组件
│   │   └── Toast.js        # 通知提示组件
│   ├── services/           # 服务模块
│   │   ├── encryptionService.js  # 加密服务
│   │   ├── messageService.js     # 消息处理服务
│   │   └── peerService.js        # PeerJS 连接服务
│   ├── styles/             # 样式文件
│   │   └── global.css      # 全局样式
│   ├── App.js              # 应用主组件
│   └── index.js            # 应用入口
├── .babelrc                # Babel 配置
├── package.json            # 项目依赖和脚本
├── webpack.config.js       # Webpack 配置
└── README.md               # 项目说明文档
```

## 功能说明

### 用户身份与连接

- 用户可以输入 6-12 位字母数字组合的唯一 ID
- 通过输入目标用户的 ID 发起 P2P 连接
- 系统自动处理 WebRTC 连接建立，包括 SDP 信息交换和 ICE 候选收集

### 通信及安全

- 使用 WebRTC 数据通道传输文本消息
- 采用 ECDH 密钥协商生成共享密钥
- 使用 AES-256-CBC 加密所有传输数据
- 每条消息附带发送时间戳

### 连接状态管理

- 显示不同连接状态：未连接、连接中、已连接、连接失败
- 30 秒连接超时自动提示
- 提供错误原因分析和重试功能

## 安装与运行

### 前提条件

- Node.js 14.0 或更高版本
- npm 6.0 或更高版本

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/yourusername/p2p-chat-system.git
cd p2p-chat-system

# 安装依赖
npm install
```

### 开发环境运行

```bash
# 启动开发服务器
npm start
```

应用将在 http://localhost:3000 启动。

### 构建生产版本

```bash
# 构建生产版本
npm run build
```

构建后的文件将位于 `dist` 目录中。

## 部署说明

### 静态网站部署

由于应用是纯前端项目，可以部署到任何静态网站托管服务：

1. 运行 `npm run build` 生成生产版本
2. 将 `dist` 目录中的所有文件上传到静态网站托管服务
3. 配置托管服务支持 HTTPS（WebRTC 要求安全上下文）

### 本地部署

也可以使用简单的 HTTP 服务器在本地部署：

```bash
# 安装 serve 工具
npm install -g serve

# 在 dist 目录启动服务
serve -s dist
```

## 使用指南

1. 打开应用后，输入你的唯一 ID（6-12 位字母数字组合）
2. 将你的 ID 分享给想要聊天的对方
3. 输入对方的 ID 并点击"连接"按钮
4. 连接成功后，即可开始发送加密消息

## 安全注意事项

- 所有消息都经过 AES-256 加密，但 ID 是公开的
- 密钥协商过程依赖于 WebRTC 的安全通道
- 应用不存储任何聊天记录，关闭页面后所有数据将丢失

## 未来扩展

- **视频/语音通话**：利用 WebRTC 的 MediaStream 接口扩展音视频功能
- **群聊支持**：实现多用户同时通信的 Mesh 网络
- **文件传输**：添加端到端加密的文件共享功能
- **去中心化用户发现**：基于 DHT 实现无需中心服务器的用户发现

## 许可证

MIT
