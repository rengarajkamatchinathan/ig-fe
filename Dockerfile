FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy only package.json and lock file first (for layer caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Now copy the rest of the app
COPY . .

# Build your Next.js app
#RUN npm run build

EXPOSE 3000

# Start production server
CMD ["npm", "run", "dev"]
# Note: In production, you might want to use `npm start` instead of `npm run dev`
# for a more optimized server.