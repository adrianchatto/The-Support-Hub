FROM node:25-alpine AS build

WORKDIR /app

# Force development mode so devDependencies are installed (vite, typescript, etc.)
ENV NODE_ENV=development

# VITE_API_URL is intentionally empty — the browser uses same-origin paths
# and Nginx proxies /api/ to the internal api container.
# Override this build arg only if the API lives on a different origin.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
# Build the Vite app — BASE URL is hardcoded to "" (same-origin, Nginx proxies /api/)
RUN npm run build

FROM nginx:1.29-alpine

COPY --from=build /app/dist /usr/share/nginx/html
# Replace default Nginx config with our proxy+SPA config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

