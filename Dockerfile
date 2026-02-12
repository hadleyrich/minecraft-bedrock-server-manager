FROM node:24-alpine

LABEL maintainer="Minecraft Bedrock Server Manager"
LABEL description="Web-based manager for Docker-based Minecraft Bedrock servers"

# Enable strict error handling
SHELL ["/bin/sh", "-e", "-c"]

RUN apk add --no-cache shadow su-exec

WORKDIR /app

ENV NODE_ENV=production \
    DATA_DIR=/app/minecraft-data \
    NPM_CONFIG_LOGLEVEL=warn

COPY --chown=node:node package*.json ./

RUN npm ci && \
    npm cache clean --force

COPY --chown=node:node . .

RUN npm run build:assets && \
    mkdir -p temp/addon-uploads temp/uploads minecraft-data && \
    chown -R node:node temp minecraft-data

COPY --chown=root:root docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

VOLUME ["/app/minecraft-data", "/app/temp"]

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001 || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]