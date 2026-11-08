# FlowForge AI — Deployment & Production Operations Guide

## 1. Production Architecture Overview

In production, FlowForge AI runs as three primary service units plus managed data infrastructure:
1. **API Tier**: FastAPI instances running under `gunicorn` with `uvicorn.workers.UvicornWorker`.
2. **Worker Tier**: Celery worker processes consuming tasks from Redis.
3. **Frontend Tier**: Vite static bundle served via NGINX or static CDN (Cloudflare / CloudFront).
4. **Data Infrastructure**: Managed PostgreSQL (v16+) and Managed Redis (Upstash / AWS ElastiCache).

```mermaid
flowchart TD
    Internet((Internet / HTTPS)) --> CDN[Cloudflare CDN / Reverse Proxy]
    
    subgraph FrontendHosting["Frontend Static Hosting"]
        StaticNginx[NGINX Static Host<br/>Serves Studio & Portal SPA]
    end
    
    subgraph APITier["FastAPI Stateless Cluster"]
        API1[FastAPI Gunicorn Pod 1]
        API2[FastAPI Gunicorn Pod 2]
    end
    
    subgraph WorkerTier["Celery Distributed Workers"]
        Worker1[Celery Worker Pod 1]
        Worker2[Celery Worker Pod 2]
    end
    
    subgraph ManagedData["Managed Cloud Persistence"]
        RedisCluster[(Managed Redis Broker TLS)]
        RDS[(AWS Aurora / Managed PostgreSQL)]
    end

    Internet -->|Static Assets| CDN --> StaticNginx
    Internet -->|/api/*| CDN --> API1 & API2
    
    API1 & API2 --> RedisCluster
    API1 & API2 --> RDS
    
    Worker1 & Worker2 --> RedisCluster
    Worker1 & Worker2 --> RDS
```

---

## 2. Docker & Containerization

### Dockerfile (Backend)
```dockerfile
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: flowforge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:postgrespassword@db:5432/flowforge
      REDIS_URL: redis://redis:6379/0
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    depends_on:
      - db
      - redis

  celery_worker:
    build:
      context: ./backend
    command: celery -A app.core.celery_app.celery worker --loglevel=info --concurrency=4
    environment:
      DATABASE_URL: postgresql://postgres:postgrespassword@db:5432/flowforge
      REDIS_URL: redis://redis:6379/0
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    depends_on:
      - db
      - redis

volumes:
  pgdata:
```

---

## 3. Environment Variables Reference

| Variable | Description | Sample Production Value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db.internal:5432/flowforge?sslmode=require` |
| `REDIS_URL` | Celery broker URL | `rediss://default:token@cluster.upstash.io:6379` |
| `GEMINI_API_KEY` | Google AI Studio Key | `AIzaSy...` |
| `JWT_SECRET_KEY` | Secret for signing tokens | `super-secret-random-hex-key` |
| `JWT_ALGORITHM` | Algorithm for JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session validity | `1440` (24 hours) |
| `CORS_ORIGINS` | Allowed frontend domains | `https://studio.flowforge.ai,https://portal.flowforge.ai` |
