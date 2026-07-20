# syntax=docker/dockerfile:1

# ── Сборка фронтенда ────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_* подставляются в бандл на этапе сборки (build args)
ARG VITE_VK_APP_ID=
ARG VITE_VK_REDIRECT_URI=http://localhost/auth/callback
ARG VITE_DEV_AUTH=false
RUN npm run build

# ── Статическая раздача через nginx ────────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
