FROM node:25-alpine AS build

WORKDIR /app

# Force development mode so devDependencies are installed (vite, typescript, etc.)
ENV NODE_ENV=development

# Accept VITE_API_URL as a build arg so it gets baked into the JS bundle
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.29-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

