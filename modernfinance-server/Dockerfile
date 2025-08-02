# Use official Swift image
FROM swift:5.9-jammy as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    zlib1g-dev \
    libcurl4-openssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY Package.* ./

# Resolve dependencies
RUN swift package resolve

# Copy source code
COPY . .

# Build release version
RUN swift build -c release --product Run

# Runtime stage
FROM swift:5.9-jammy-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd --user-group --create-home --system vapor

WORKDIR /app

# Copy built executable
COPY --from=builder /app/.build/release/Run /app/Run

# Copy any static resources
COPY --from=builder /app/Public /app/Public 2>/dev/null || true

# Ensure executable permissions
RUN chmod +x /app/Run && chown -R vapor:vapor /app

USER vapor

# Expose port
EXPOSE 8080

# Start the app
CMD ["./Run", "serve", "--env", "production", "--hostname", "0.0.0.0", "--port", "8080"]