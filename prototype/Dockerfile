FROM node:24-alpine

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8765 \
    PORT_ATTEMPTS=1 \
    MAX_REQUEST_BYTES=16384

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node server.mjs index.html dashboard.html orchestration.html README.md ./
COPY --chown=node:node assets ./assets
COPY --chown=node:node content ./content
COPY --chown=node:node docs/control/live-status.json ./docs/control/live-status.json

RUN mkdir -p /app/data && chown node:node /app/data

USER node

EXPOSE 8765
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8765/healthz >/dev/null || exit 1

CMD ["node", "server.mjs"]
