FROM node:22-slim AS frontend

WORKDIR /app/clinic-app

COPY clinic-app/package*.json ./
RUN npm ci

COPY clinic-app/ ./
ENV VITE_API_URL=
RUN npm run build

FROM rust:1 AS builder

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo "fn main() { }" > src/main.rs
RUN cargo build --release || true

COPY backend/ ./
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin backend

FROM debian:stable-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/backend/target/release/backend /usr/local/bin/backend
COPY --from=frontend /app/clinic-app/dist ./public

ENV RUST_LOG=info \
    PORT=8000

EXPOSE 8000

CMD ["backend"]
