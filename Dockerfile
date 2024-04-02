FROM node:18-alpine
WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/andyrak/ws4kp
LABEL org.opencontainers.image.description="andyrak's ws4kp docker image"
LABEL org.opencontainers.image.licenses=MIT

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .
CMD ["node", "index.js"]
