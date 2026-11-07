FROM node:20-bookworm-slim AS base

# Install FFmpeg & FFprobe
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package and install dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy client and build
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Copy server code
COPY server/ ./server/

# Environment
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV STORAGE_ROOT=/nas_data

EXPOSE 8080

CMD ["node", "server/src/index.js"]

