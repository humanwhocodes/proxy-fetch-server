# Use Node.js 22 as the base image (full image for better compatibility)
FROM node:22

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source files and TypeScript configuration
COPY src/ ./src/
COPY tsconfig.json ./

# Build the project
RUN npm run build

# Expose the default port
EXPOSE 8080

# Set environment variables with defaults (can be overridden at runtime)
ENV PORT=8080

# Run the server using npx (as specified in requirements)
CMD ["npx", "@humanwhocodes/proxy-fetch-server"]
