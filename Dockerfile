FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@10.4.1

COPY package.json ./
RUN pnpm install

COPY . .
RUN pnpm build

EXPOSE 3000

CMD ["sh", "-c", "node dist/migrate.js; NODE_ENV=production node dist/server.js"]
