FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY schema.sql ./schema.sql
COPY src ./src
RUN mkdir -p /data/media && chown -R node:node /app /data/media
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
