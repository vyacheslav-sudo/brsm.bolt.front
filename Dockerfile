# build environment
FROM node:20-alpine as build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
ARG APP_ENV=production
ARG NODE_HEAP_MB=2048
ENV NODE_OPTIONS=--max-old-space-size=${NODE_HEAP_MB}
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --silent
COPY . ./
RUN if [ "$APP_ENV" = "development" ]; then npm run build:dev; else npm run build:prod; fi

# production environment
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# new
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
