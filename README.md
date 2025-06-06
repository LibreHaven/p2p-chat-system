# P2P加密聊天系统

这是一个基于WebRTC的点对点加密聊天系统，支持两个用户之间的安全通信。

## 功能特点

- 点对点连接，无需中央服务器存储消息
- 端到端加密，确保通信安全（可选择开启或关闭）
- 简洁的用户界面
- 实时消息传递
- 支持自定义用户ID
- 支持文件传输（图片、视频和其他文件类型）
- 文件传输进度实时显示
- 支持加密和非加密模式的文件传输
- 心跳检测，自动检测连接状态
- 连接断开后自动重连尝试
- 文件预览功能
- 加密就绪确认机制，确保双方可以安全通信

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

1. 第一个用户创建一个Peer ID（可以输入自定义ID或使用随机生成的ID）
2. 将此ID分享给第二个用户
3. 第二个用户使用此ID连接到第一个用户
4. 连接建立后，双方可以开始聊天

### 加密通信

系统默认为每次会话启用加密功能，但用户可以选择禁用加密。当看到"加密通道已建立，可以安全地发送消息"的提示时，即可开始发送加密消息。加密状态会在聊天界面上方显示。

### 文件传输

1. 点击文件、图片或视频按钮选择要发送的文件
2. 系统会自动处理文件并显示预览（如果是图片或视频）
3. 点击"发送文件"按钮开始传输
4. 传输过程中会显示进度条
5. 接收方可以预览或下载接收到的文件

## 技术架构

- **前端框架**: React 18.2.0
- **架构模式**: Container/UI分离 + 自定义Hooks
- **状态管理**: Zustand (轻量级状态管理)
- **UI组件库**: Ant Design 5.25.4
- **点对点通信**: PeerJS 1.5.4 (基于WebRTC)
- **加密**: Web Crypto API (ECDH密钥交换和AES-GCM加密)
- **样式**: Styled Components 6.1.16
- **文件传输**: 二进制数据分块传输 (16KB/块)
- **构建工具**: Webpack 5.98.0 + Babel 7.26.10

## 文件结构

```
p2p-chat-system/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/              # 基础UI组件
│   │   ├── ui/                  # 纯UI组件
│   │   │   ├── ConnectionScreenUI.js  # 连接界面UI
│   │   │   ├── ChatScreenUI.js        # 聊天界面UI
│   │   │   ├── ErrorScreenUI.js       # 错误界面UI
│   │   │   ├── MessageBubbleUI.js     # 消息气泡UI
│   │   │   ├── MessageComposerUI.js   # 消息输入UI
│   │   │   ├── FilePreviewUI.js       # 文件预览UI
│   │   │   └── FileMessageUI.js       # 文件消息UI
│   │   ├── ErrorBoundary.js     # 错误边界组件
│   │   ├── MessageBubble.js     # 消息气泡组件
│   │   ├── MessageComposer.js   # 消息输入组件
│   │   ├── StatusIndicator.js   # 状态指示器组件
│   │   ├── CopyableId.js        # 可复制ID组件
│   │   └── Toast.js             # 提示消息组件
│   ├── containers/              # 容器组件
│   │   ├── ConnectionContainer.js   # 连接管理容器
│   │   ├── ChatScreenContainer.js   # 聊天界面容器
│   │   └── ErrorScreenContainer.js  # 错误处理容器
│   ├── hooks/                   # 自定义Hooks
│   │   ├── useConnection.js     # 连接管理Hook
│   │   ├── useChatSession.js    # 聊天会话Hook
│   │   └── useFileTransfer.js   # 文件传输Hook
│   ├── services/                # 核心服务
│   │   ├── encryptionService.js # 加密服务
│   │   ├── peerService.js       # 点对点连接服务
│   │   └── messageService.js    # 消息处理服务
│   ├── store/                   # 状态管理
│   │   └── index.js             # Zustand状态管理
│   ├── config/                  # 配置管理
│   │   └── index.js             # 应用配置
│   ├── utils/                   # 工具函数
│   │   ├── constants.js         # 应用常量
│   │   ├── validation.js        # 数据验证
│   │   ├── devTools.js          # 开发工具
│   │   └── index.js             # 工具函数导出
│   ├── styles/
│   │   └── global.css           # 全局样式
│   ├── App.js                   # 应用主组件
│   └── index.js                 # 应用入口
├── docs/
│   ├── ARCHITECTURE.md          # 架构说明文档
│   ├── GROUP_CHAT_DESIGN.md     # 群聊设计文档
│   └── P2P_聊天系统_设计文档_v1.0.0_20250320.md
├── package.json
└── webpack.config.js
```

## 架构特点

### 现代化架构模式
- **Container/UI分离**: 业务逻辑与UI展示分离，提高代码可维护性
- **自定义Hooks**: 封装复杂业务逻辑，实现逻辑复用
- **Zustand状态管理**: 轻量级状态管理，支持DevTools调试
- **多服务器重试**: 自动切换PeerJS服务器，提高连接成功率

### 安全考虑
- 使用Web Crypto API的ECDH密钥交换和AES-GCM加密
- 密钥仅存储在内存中，会话结束后自动清除
- 没有消息会被保存到服务器
- 文件传输时对每个块单独加密，确保大文件传输的安全性
- 心跳检测确保连接状态实时监控
- 加密就绪确认机制确保双方都准备好进行加密通信
- ErrorBoundary错误边界捕获组件错误

## 已知限制

- 目前仅支持两人之间的通信（架构已支持群聊扩展）
- 不支持离线消息（可通过IndexedDB扩展）
- 在某些网络环境下可能需要TURN服务器辅助连接
- 大文件传输可能受到浏览器内存限制
- 需要在HTTPS环境下运行才能使用Web Crypto API

## 扩展能力

系统采用模块化架构，支持以下功能扩展：
- **群聊功能**: 基于Zustand store扩展群组管理
- **音视频通话**: 使用自定义Hooks封装MediaStream
- **离线消息**: 通过IndexedDB实现本地存储
- **主题系统**: 基于Ant Design的主题定制
- **国际化**: 多语言界面支持

## 贡献

欢迎提交问题报告和改进建议。

## 许可

MIT
