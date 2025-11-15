## 1. 架构设计

```mermaid
graph TD
    A[用户浏览器] --> B[React前端应用]
    B --> C[Supabase客户端SDK]
    C --> D[Supabase认证服务]
    C --> E[Supabase数据库]
    C --> F[Supabase存储服务]
    
    B --> G[Node.js后端API]
    G --> H[AI分析服务]
    G --> I[Redis缓存]
    G --> E
    
    subgraph "前端层"
        B
    end
    
    subgraph "后端服务层"
        G
        H
        I
    end
    
    subgraph "数据层"
        D
        E
        F
    end
    
    subgraph "外部服务"
        J[邮件服务]
        K[推送通知服务]
    end
    
    G --> J
    B --> K
```

## 2. 技术栈描述

- **前端**: React@18 + TypeScript@5 + Vite@4 + Tailwind CSS@3
- **后端**: Node.js@20 + Express@4 + TypeScript@5
- **数据库**: Supabase (PostgreSQL@15)
- **缓存**: Redis@7
- **文件存储**: Supabase Storage
- **PWA**: Workbox@7 + Service Worker
- **图表库**: Chart.js@4 + react-chartjs-2
- **UI组件**: Headless UI + Radix UI

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页，健康概览面板 |
| /login | 登录页面 |
| /register | 注册页面 |
| /record | 大便记录页面 |
| /history | 历史记录列表 |
| /analysis | 健康分析报告 |
| /profile | 个人中心 |
| /settings | 设置页面 |
| /privacy | 隐私管理 |
| /export | 数据导出 |
| /offline | 离线模式提示 |

## 4. API定义

### 4.1 认证相关API

**用户注册**
```
POST /api/auth/register
```

请求参数：
| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| email | string | 是 | 用户邮箱 |
| password | string | 是 | 密码（最少8位） |
| name | string | 是 | 用户昵称 |

响应示例：
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "token": "jwt_token"
  }
}
```

**用户登录**
```
POST /api/auth/login
```

### 4.2 记录管理API

**创建记录**
```
POST /api/records
```

请求参数：
| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| color | string | 是 | 颜色（brown/green/yellow/black/red） |
| shape | string | 是 | 形状（type1-type7） |
| frequency | number | 是 | 频率（次/天） |
| consistency | string | 是 | 粘稠度（hard/soft/watery） |
| symptoms | array | 否 | 伴随症状 |
| notes | string | 否 | 备注信息 |

**获取记录列表**
```
GET /api/records?startDate=2024-01-01&endDate=2024-01-31&page=1&limit=20
```

### 4.3 分析API

**获取健康分析**
```
GET /api/analysis?period=7d
```

响应示例：
```json
{
  "success": true,
  "data": {
    "healthScore": 85,
    "trends": {
      "colorTrend": [{"date": "2024-01-01", "score": 90}],
      "shapeTrend": [{"date": "2024-01-01", "score": 80}]
    },
    "alerts": ["颜色异常提醒"],
    "suggestions": ["增加膳食纤维摄入", "多喝水"]
  }
}
```

## 5. 服务器架构

```mermaid
graph TD
    A[客户端请求] --> B[API网关]
    B --> C[认证中间件]
    C --> D[控制器层]
    D --> E[服务层]
    E --> F[数据访问层]
    F --> G[(PostgreSQL)]
    
    E --> H[缓存层]
    H --> I[(Redis)]
    
    E --> J[外部服务]
    J --> K[邮件服务]
    J --> L[AI分析服务]
    
    subgraph 控制器层
        D1[用户控制器]
        D2[记录控制器]
        D3[分析控制器]
    end
    
    subgraph 服务层
        E1[用户服务]
        E2[记录服务]
        E3[分析服务]
        E4[通知服务]
    end
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    USER ||--o{ RECORD : creates
    USER ||--o{ ANALYSIS : has
    RECORD ||--o{ RECORD_MEDIA : contains
    USER {
        uuid id PK
        string email UK
        string password_hash
        string name
        string avatar_url
        date birth_date
        string gender
        float height
        float weight
        string plan
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    RECORD {
        uuid id PK
        uuid user_id FK
        date record_date
        string color
        string shape
        number frequency
        string consistency
        json symptoms
        string notes
        number health_score
        timestamp created_at
        timestamp updated_at
    }
    RECORD_MEDIA {
        uuid id PK
        uuid record_id FK
        string media_url
        string media_type
        json analysis_result
        timestamp created_at
    }
    ANALYSIS {
        uuid id PK
        uuid user_id FK
        string analysis_type
        json analysis_data
        json suggestions
        timestamp created_at
    }
```

### 6.2 数据定义语言

**用户表**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    height FLOAT CHECK (height > 0),
    weight FLOAT CHECK (weight > 0),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

**记录表**
```sql
CREATE TABLE records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    color VARCHAR(20) NOT NULL CHECK (color IN ('brown', 'green', 'yellow', 'black', 'red', 'other')),
    shape VARCHAR(20) NOT NULL CHECK (shape IN ('type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7')),
    frequency INTEGER NOT NULL CHECK (frequency > 0),
    consistency VARCHAR(20) NOT NULL CHECK (consistency IN ('hard', 'soft', 'watery', 'normal')),
    symptoms JSONB DEFAULT '[]',
    notes TEXT,
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, record_date)
);

-- 创建索引
CREATE INDEX idx_records_user_id ON records(user_id);
CREATE INDEX idx_records_record_date ON records(record_date DESC);
CREATE INDEX idx_records_created_at ON records(created_at DESC);
```

### 6.3 Supabase权限设置

```sql
-- 基本访问权限（匿名用户）
GRANT SELECT ON users TO anon;
GRANT SELECT ON records TO anon;

-- 认证用户完整权限
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT ALL PRIVILEGES ON records TO authenticated;
GRANT ALL PRIVILEGES ON record_media TO authenticated;
GRANT ALL PRIVILEGES ON analysis TO authenticated;

-- 行级安全策略（RLS）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的数据
CREATE POLICY "用户只能查看自己的信息" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "用户只能查看自己的记录" ON records
    FOR ALL USING (auth.uid() = user_id);
```

## 7. 安全架构

### 7.1 认证与授权
- **JWT令牌**：使用Supabase内置JWT认证，令牌有效期24小时
- **刷新机制**：自动刷新令牌，确保用户体验连续性
- **权限控制**：基于角色的访问控制（RBAC），用户只能访问自己的数据
- **API限流**：每用户每分钟最多100次请求

### 7.2 数据加密
- **传输加密**：所有API通信使用HTTPS/TLS 1.3
- **存储加密**：敏感数据使用AES-256加密存储
- **密码安全**：使用bcrypt哈希，盐值随机生成

### 7.3 隐私保护
- **数据匿名化**：分析数据时去除个人标识信息
- **GDPR合规**：支持用户数据导出、删除、修改权利
- **审计日志**：记录所有数据访问和修改操作
- **数据保留**：用户可设置数据自动删除周期

## 8. PWA技术实现

### 8.1 Service Worker配置
```javascript
// service-worker.js
const CACHE_NAME = 'poop-recorder-v1';
const urlsToCache = [
  '/',
  '/offline',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// 安装事件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 网络请求拦截
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        return caches.match('/offline');
      })
  );
});
```

### 8.2 离线存储策略
- **IndexedDB**：存储用户记录数据，支持离线查看和编辑
- **本地缓存**：静态资源和最近数据本地缓存
- **同步机制**：网络恢复后自动同步离线数据
- **冲突解决**：基于时间戳的乐观锁机制

## 9. 部署架构

### 9.1 容器化部署
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### 9.2 扩展性设计
- **水平扩展**：无状态服务设计，支持多实例部署
- **负载均衡**：使用Nginx进行请求分发
- **数据库连接池**：支持高并发数据库访问
- **CDN加速**：静态资源使用CDN分发

### 9.3 监控与日志
- **应用监控**：集成Sentry进行错误追踪
- **性能监控**：使用New Relic监控API响应时间
- **日志收集**：结构化日志，支持ELK分析
- **健康检查**：定期健康检查和自动恢复
## 10. 部署步骤（PostgreSQL + Node.js）

- 前置准备：安装 Docker、Node.js 20+、npm，并准备一个可用的 PostgreSQL（建议 15+）。
- 数据库部署（可选：Docker Compose）：
  - 创建 `docker-compose.yml` 并启动数据库：
    ```yaml
    version: '3.9'
    services:
      db:
        image: postgres:15
        environment:
          POSTGRES_USER: poop
          POSTGRES_PASSWORD: poop_pass
          POSTGRES_DB: poop_recorder
        ports:
          - '5432:5432'
        volumes:
          - pgdata:/var/lib/postgresql/data
    volumes:
      pgdata:
    ```
    - 启动：`docker compose up -d`

- 配置环境变量：
  - 在后端根目录创建 `.env`（不要提交到版本库）：
    ```
    DATABASE_URL=postgresql://poop:poop_pass@localhost:5432/poop_recorder?schema=public
    ```
- 生成 Prisma 客户端：
  - `cd backend && npm install && npm run prisma:generate`
- 初始化数据库（二选一）：
  - 使用下方“数据库SQL”通过 `psql` 执行建库与建表
  - 或后续引入 `prisma migrate dev` 管理迁移
- 启动服务：
  - 后端：`cd backend && npm run dev`
  - 前端：`cd frontend && npm run dev`，在 `http://localhost:5173/` 访问

## 11. 数据库手工SQL（PostgreSQL）

- 连接数据库并创建扩展（如需）：
  ```sql
  -- Windows/Linux 下，使用 psql 连接：
  -- psql -h localhost -U poop -d poop_recorder
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  ```

- 枚举类型：
  ```sql
  CREATE TYPE "Color" AS ENUM ('brown','dark_brown','yellow','green','black','red');
  CREATE TYPE "Volume" AS ENUM ('small','medium','large');
  CREATE TYPE "AlertType" AS ENUM ('constipation','diarrhea','custom');
  ```

- 用户与设备：
  ```sql
  CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE "Device" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "deviceFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_device_user ON "Device"("userId");
  ```

- 排便记录：
  ```sql
  CREATE TABLE "StoolEntry" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "timestampMinute" TIMESTAMPTZ NOT NULL,
    "bristolType" INT NOT NULL CHECK ("bristolType" BETWEEN 1 AND 7),
    "smellScore" INT NOT NULL CHECK ("smellScore" BETWEEN 1 AND 5),
    "color" "Color" NOT NULL,
    "volume" "Volume" NOT NULL,
    "symptoms" TEXT[] NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "version" INT NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_stool_user ON "StoolEntry"("userId");
  CREATE INDEX IF NOT EXISTS idx_stool_time ON "StoolEntry"("timestampMinute");
  ```

- 饮食记录与分析缓存：
  ```sql
  CREATE TABLE "DietLog" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "items" JSONB NOT NULL,
    "tags" TEXT[] NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_diet_user_time ON "DietLog"("userId","timestamp");

  CREATE TABLE "AnalyticsCache" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "period" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_analytics_user_period ON "AnalyticsCache"("userId","period");
  ```

- 预警与隐私请求：
  ```sql
  CREATE TABLE "Alert" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "type" "AlertType" NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredAt" TIMESTAMPTZ NOT NULL,
    "metadata" JSONB NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_alert_user_type ON "Alert"("userId","type");

  CREATE TABLE "PrivacyRequest" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "processedAt" TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_privacy_user_status ON "PrivacyRequest"("userId","status");
  ```

- 说明：
  - Prisma 默认使用 CamelCase 表名（需使用引号）。若希望使用 snake_case，请在 Prisma 模型中通过 `@@map` 和 `@map` 映射。
  - 主键采用 `TEXT` 以兼容 Prisma 的 `cuid()`。如偏好 `UUID`，可在模型中调整为 `@default(uuid())` 并在 SQL 使用 `UUID` 类型。

## 12. 生产部署建议

- 使用 `Dockerfile` 构建后端镜像，并在 `docker-compose` 中联动数据库与后端。
- 通过反向代理（Nginx）发布前端静态资源与后端 API，启用 TLS。
- 配置连接池（Prisma 使用 `pg` 驱动），并设置合理的 `DATABASE_URL` 参数（如 `connection_limit`）。
- 开启备份（每日快照 + WAL 日志），并计划 PITR 恢复流程。
