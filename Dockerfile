
# Base image
FROM node:18-alpine as frontend-build

# Set working directory
WORKDIR /frontend

# Copy package.json and package-lock.json first
COPY Frontend/package*.json ./

# Clear npm cache and install dependencies
RUN npm cache clean --force
RUN npm install --legacy-peer-deps --verbose

# Check installed packages (optional for debugging)
RUN npm list --depth=0

# Copy the rest of the frontend code
COPY Frontend/ .

# Ensure correct file permissions (sometimes needed in Docker)
RUN chmod -R 777 /frontend

# Run the build command
RUN npm run build --verbose
