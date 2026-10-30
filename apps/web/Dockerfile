# Frontend image for ECS Fargate (alternative to S3 + CloudFront). Build from repo root:
#   docker build -f apps/web/Dockerfile -t ordershed-web .
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/web --include-workspace-root
COPY apps/web apps/web
ARG VITE_API_MODE=http
ARG VITE_API_BASE_URL
ARG VITE_ENV_LABEL=PRODUCTION
ENV VITE_API_MODE=$VITE_API_MODE VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_ENV_LABEL=$VITE_ENV_LABEL
RUN npm run build -w apps/web

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
