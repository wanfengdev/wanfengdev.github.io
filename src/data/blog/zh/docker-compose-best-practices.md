---
title: "2026 年的 Docker Compose：真正重要的最佳实践"
description: 不止于基础的 docker-compose up。生产级配置、secrets、healthcheck、profiles 和多阶段构建，这些才是真正拉开差距的地方。
pubDatetime: 2026-02-05T10:00:00Z
tags:
  - docker
  - devops
  - containers
  - backend
draft: false
---

`docker-compose up` 是你学会的第一条命令。而接下来的东西——网络、secrets、healthcheck、面向不同环境的 profiles——才是一份"能跑"的配置和一份生产就绪的配置之间的分水岭。

## 干净的基础结构

```yaml file=compose.yml
name: my-app

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production # multi-stage target // [!code highlight]
    environment:
      NODE_ENV: production
    env_file: .env.production # never hardcode credentials // [!code highlight]
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy # wait for DB to be ready // [!code highlight]
    restart: unless-stopped

  db:
    image: postgres:17-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## 多阶段构建：体积更小，安全性更高

生产用的 Dockerfile 绝不应该包含开发工具：

```dockerfile file=Dockerfile
# Stage 1: dependencies and build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                    # [!code highlight]
COPY . .
RUN npm run build

# Stage 2: minimal final image
FROM node:22-alpine AS production  # [!code ++]
WORKDIR /app                       # [!code ++]
                                   # [!code ++]
# Only copy what's necessary       # [!code ++]
COPY --from=builder /app/dist ./dist  # [!code ++]
COPY --from=builder /app/node_modules ./node_modules  # [!code ++]
                                   # [!code ++]
USER node                          # do not run as root // [!code ++]
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

镜像体积的差距可以从 **600 MB → 80 MB**。

## 用 profiles 区分不同环境

借助 `profiles`，你可以按场景启用服务，而不必维护多份 Compose 文件：

```yaml file=compose.yml
services:
  api:
    # no profile = always active
    build: .

  adminer:
    image: adminer
    profiles: [dev, debug] # only in dev // [!code highlight]
    ports:
      - "8080:8080"

  prometheus:
    image: prom/prometheus
    profiles: [monitoring] # only when you need it // [!code highlight]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

```bash
# Only bring up API + DB
docker compose up

# Bring up with dev tools
docker compose --profile dev up

# Entire monitoring stack
docker compose --profile monitoring up
```

## 真正有效的 healthcheck

基础的 `depends_on` 只等容器**启动**，并不等服务**就绪**。这个差别很关键：

```yaml file=compose.yml
services:
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s # initial grace period // [!code highlight]

  worker:
    build: .
    depends_on:
      redis:
        condition: service_healthy # wait for green healthcheck // [!code highlight]
```

## 网络：默认隔离

每个 `compose.yml` 都会创建自己的网络。要让彼此独立的栈相互通信：

```yaml file=compose.yml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true # no internet access // [!code highlight]

services:
  nginx:
    networks: [frontend, backend] # the only one touching both networks

  api:
    networks: [backend] # isolated from the outside // [!code highlight]

  db:
    networks: [backend] # ditto
```

## 上生产前的检查清单

- [ ] 敏感变量放在 `secrets` 或仓库之外的 `.env` 中
- [ ] 启用多阶段构建
- [ ] 所有关键服务都配置 `restart: unless-stopped`
- [ ] healthcheck 配置了合适的 `start_period`
- [ ] `depends_on` 搭配 `condition: service_healthy`
- [ ] 容器内使用非 root 用户（`USER node`、`USER app`）
- [ ] 持久化数据使用具名 volume（生产环境不用 bind mount）
- [ ] 根据容器内存配置 `--max-old-space-size`

> 教程里的 `compose.yml` 和生产级的 `compose.yml`，差别不在行数多少——而在于你是否清楚哪里可能出问题，并提前做好了应对。
