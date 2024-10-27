# pomodoro
一个简单的VUE3番茄钟应用

# 文件说明

1. 后端 (server/)
   - main.go: 后端文件，包括数据模型、API处理和数据库操作
   - go.mod: go项目配置文件
   - pomodoro.db: SQLite数据库文件

2. 前端 (client/)
   - src/: 源代码目录
     - components/: 可复用组件
     - stores/: Pinia 状态管理
     - views/: 页面级组件
     - utils/: 工具函数
   - vite.config.js: Vite打包和开发服务器配置
   - tailwind.config.js: TailwindCSS样式配置
   - postcss.config.js: CSS处理配置

# 开发命令

后端:
```bash
cd server
go run main.go    # 开发模式运行
go build main.go  # 构建
```

前端:
```bash
cd client
npm install  # 安装依赖
npm run dev  # 开发模式运行
npm run build # 构建生产版本
```

# 服务端口
前端是Vite默认的5173端口

后端为3000端口