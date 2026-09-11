FROM node:22-alpine AS build

ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID
ARG VITE_API_BASE_URL

ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN test -n "$VITE_KEYCLOAK_URL" || { echo "FAIL: VITE_KEYCLOAK_URL vazia"; exit 1; } \
 && test -n "$VITE_KEYCLOAK_REALM" || { echo "FAIL: VITE_KEYCLOAK_REALM vazia"; exit 1; } \
 && test -n "$VITE_KEYCLOAK_CLIENT_ID" || { echo "FAIL: VITE_KEYCLOAK_CLIENT_ID vazia"; exit 1; } \
 && test -n "$VITE_API_BASE_URL" || { echo "FAIL: VITE_API_BASE_URL vazia"; exit 1; }

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://localhost/healthz || exit 1
