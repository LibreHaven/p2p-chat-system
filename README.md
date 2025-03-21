# P2P加密聊天系统

这是一个基于WebRTC的点对点加密聊天系统，支持两个用户之间的安全通信。

## 功能特点

- 点对点连接，无需中央服务器存储消息
- 端到端加密，确保通信安全
- 简洁的用户界面
- 实时消息传递
- 支持自定义用户ID

## 安装与运行

### 前提条件

- Node.js (v14.0.0 或更高版本)
- npm (v6.0.0 或更高版本)

### 安装步骤

1. 克隆或下载本仓库
2. 进入项目目录
3. 安装依赖

```bash
npm install
```

4. 启动开发服务器

```bash
npm start
```

5. 在浏览器中访问 `http://localhost:3000`

## 使用说明

### 建立连接

1. 第一个用户创建一个Peer ID
2. 将此ID分享给第二个用户
3. 第二个用户使用此ID连接到第一个用户
4. 连接建立后，双方可以开始聊天

### 加密通信

系统会自动为每次会话生成新的加密密钥，确保通信安全。当看到"加密通道已建立，可以安全地发送消息"的提示时，即可开始发送加密消息。

## 技术架构

- **前端框架**: React
- **点对点通信**: PeerJS (基于WebRTC)
- **加密**: CryptoJS (AES-256)
- **样式**: Styled Components

## 文件结构

```
p2p-chat-system/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ChatScreen.js        # 聊天界面组件
│   │   ├── ConnectionScreen.js  # 连接界面组件
│   │   ├── ErrorScreen.js       # 错误界面组件
│   │   ├── MessageBubble.js     # 消息气泡组件
│   │   ├── MessageComposer.js   # 消息输入组件
│   │   ├── StatusIndicator.js   # 状态指示器组件
│   │   ├── CopyableId.js        # 可复制ID组件
│   │   └── Toast.js             # 提示消息组件
│   ├── services/
│   │   ├── encryptionService.js # 加密服务
│   │   ├── peerService.js       # 点对点连接服务
│   │   └── messageService.js    # 消息处理服务
│   ├── styles/
│   │   └── global.css           # 全局样式
│   ├── App.js                   # 应用主组件
│   └── index.js                 # 应用入口
├── docs/
│   └── 修复说明文档.md           # 系统修复说明文档
├── package.json
└── webpack.config.js
```

## 安全考虑

- 所有消息都使用AES-256加密
- 密钥交换使用Diffie-Hellman密钥交换的简化版本
- 密钥仅存储在会话存储中，页面关闭后自动清除
- 没有消息会被保存到服务器

## 已知限制

- 目前仅支持两人之间的通信
- 不支持文件传输
- 不支持离线消息
- 在某些网络环境下可能需要TURN服务器辅助连接

## 贡献

欢迎提交问题报告和改进建议。

## 许可

MIT
