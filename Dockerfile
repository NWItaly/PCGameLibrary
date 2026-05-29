FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install

EXPOSE 4200

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "500"]
