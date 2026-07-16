FROM node:20-alpine

# Install python and build tools for better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV PORT=3001
ENV DATA_DIR=/persistent/data
ENV UPLOAD_DIR=/persistent/uploads

EXPOSE 3001

CMD ["npm", "start"]
