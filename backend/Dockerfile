FROM rust:latest AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo "fn main() { }" > src/main.rs
RUN cargo build --release || true

COPY backend/ .
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin backend

FROM debian:stable-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/backend /usr/local/bin/backend

ENV RUST_LOG=info

EXPOSE 8001

CMD ["backend"]
