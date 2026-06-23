FROM rust:1.96.0 AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml backend/Cargo.lock ./
# Create a temporary main and fetch dependencies (don't build yet) to populate the cargo registry cache
RUN mkdir src && echo "fn main() { }" > src/main.rs
# Use `cargo fetch` rather than `cargo build` to avoid compiling proc-macro crates
# with a mismatched toolchain in the cache stage.
RUN cargo fetch --locked

# Copy backend source and build
COPY backend/ .
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin backend

# Build frontend in a separate stage
FROM node:18-alpine AS node_builder
WORKDIR /app
COPY clinic-app/package*.json ./clinic-app/
COPY clinic-app/package-lock.json ./clinic-app/
COPY clinic-app/tsconfig*.json clinic-app/vite.config.ts ./clinic-app/
COPY clinic-app/src ./clinic-app/src
COPY clinic-app/public ./clinic-app/public
WORKDIR /app/clinic-app
RUN npm ci --silent && npm run build --silent

FROM debian:stable-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy backend binary
COPY --from=builder /app/target/release/backend /usr/local/bin/backend
# Copy frontend build output into a `public` folder the server can serve
COPY --from=node_builder /app/clinic-app/dist /app/public

ENV RUST_LOG=info

EXPOSE 8001

CMD ["backend"]
