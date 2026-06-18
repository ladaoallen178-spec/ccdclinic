FROM rust:latest AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() { }" > src/main.rs
RUN cargo build --release || true

COPY . .
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin backend

FROM debian:stable-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/backend /usr/local/bin/backend

ENV RUST_LOG=info\
    PORT=8000

EXPOSE 8000

CMD ["backend"]
