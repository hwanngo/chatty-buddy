FROM node:20-alpine

# Install pnpm via corepack (runs as root before user switch)
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Install serve globally for static file hosting
RUN npm install -g serve

RUN addgroup -S appgroup && \
  adduser -S appuser -G appgroup && \
  mkdir -p /home/appuser/app && \
  chown appuser:appgroup /home/appuser/app

USER appuser
WORKDIR /home/appuser/app

COPY --chown=appuser:appgroup package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY --chown=appuser:appgroup . .
RUN pnpm build

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
