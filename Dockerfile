FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@10.4.1

ENV VITE_APP_ID=muscle-plan

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm build && echo "=== Build OK ===" && ls dist/server.js dist/migrate.js dist/public/index.html

EXPOSE 3000

CMD ["sh", "-c", "node dist/migrate.js; NODE_ENV=production node dist/server.js"]
