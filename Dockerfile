FROM node:20

WORKDIR /app

ENV VITE_APP_ID=muscle-plan

COPY package.json ./
RUN npm install --include=dev --legacy-peer-deps

COPY . .

RUN ./node_modules/.bin/vite build
RUN ./node_modules/.bin/esbuild server/_core/index.ts \
    --platform=node --packages=external --bundle --format=esm \
    --outfile=dist/server.js
RUN ./node_modules/.bin/esbuild server/migrate.ts \
    --platform=node --packages=external --bundle --format=esm \
    --outfile=dist/migrate.js

RUN ls dist/server.js dist/migrate.js dist/public/index.html && echo "BUILD OK"

EXPOSE 3000

CMD ["sh", "-c", "node dist/migrate.js; NODE_ENV=production node dist/server.js"]
