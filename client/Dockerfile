FROM node:18-alpine

WORKDIR /app

# Copy client package details
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
