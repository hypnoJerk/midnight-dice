FROM node:18-alpine

WORKDIR /app

# Copy server package details
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Expose server port
EXPOSE 3001

CMD ["npm", "run", "dev"]
