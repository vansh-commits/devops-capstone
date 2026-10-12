# ---- Stage 1: build static assets with Node (runs natively; output is arch-independent) ----
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: serve with unprivileged Nginx (runs as uid 101, port 8080) ----
FROM nginxinc/nginx-unprivileged:1.29-alpine
ENV BACKEND_HOST=backend:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
