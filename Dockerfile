
# Stage 1: Build the application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run the application
FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ARG LOG_LEVEL
ENV LOG_LEVEL=${LOG_LEVEL}
ARG THROTTLER_TTL
ENV THROTTLER_TTL=${THROTTLER_TTL}
ARG UNAUTHENTICATED_THROTTLER_LIMIT
ENV UNAUTHENTICATED_THROTTLER_LIMIT=${UNAUTHENTICATED_THROTTLER_LIMIT}
ARG AUTHENTICATED_THROTTLER_LIMIT
ENV AUTHENTICATED_THROTTLER_LIMIT=${AUTHENTICATED_THROTTLER_LIMIT}

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-optional --ignore-scripts

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
