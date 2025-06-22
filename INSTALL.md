# SandBot Dashboard Installation Guide

Complete installation and deployment guide for the SandBot Dashboard. This guide covers multiple deployment methods from development to production environments.

## 📋 **Prerequisites**

### **Required Software**
- **Node.js**: Version 18.0 or higher ([Download](https://nodejs.org/))
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Git**: For cloning the repository ([Download](https://git-scm.com/))

### **Optional Tools**
- **yarn** or **pnpm**: Alternative package managers
- **VS Code**: Recommended code editor
- **Chrome DevTools**: For debugging

### **System Requirements**
- **OS**: Windows 10+, macOS 10.15+, or Linux Ubuntu 18.04+
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for project + dependencies
- **Network**: Internet connection for initial setup

## 🚀 **Installation Methods**

### **Method 1: Development Setup (Recommended)**

#### **Step 1: Clone Repository**
```bash
# Clone the repository
git clone [repository-url]
cd sandbot-dashboard

# Alternative: Download ZIP
# Download from GitHub and extract to your preferred directory
```

#### **Step 2: Install Dependencies**
```bash
# Using npm (default)
npm install

# Using yarn (alternative)
yarn install

# Using pnpm (alternative)
pnpm install
```

#### **Step 3: Run Development Server**
```bash
# Start development server
npm run dev

# Alternative package managers
yarn dev
pnpm dev
```

#### **Step 4: Access Dashboard**
- Open browser to: [http://localhost:3000](http://localhost:3000)
- The dashboard will automatically reload when you make changes

### **Method 2: Production Build**

#### **Step 1: Build Application**
```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

#### **Step 2: Access Production Version**
- Production server runs on: [http://localhost:3000](http://localhost:3000)
- Optimized for performance and smaller bundle size

### **Method 3: Static Export (Recommended for Deployment)**

#### **Step 1: Configure Next.js for Static Export**
Create or update `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
```

#### **Step 2: Build and Export**
```bash
# Build and export static files
npm run build

# Files will be generated in the 'out' directory
ls out/
```

#### **Step 3: Serve Static Files**

**Option A: Using Node.js serve**
```bash
# Install serve globally
npm install -g serve

# Serve the static files
serve out/ -p 3000

# Access at http://localhost:3000
```

**Option B: Using Python HTTP Server**
```bash
# Python 3
python -m http.server 3000 --directory out

# Python 2 (legacy)
cd out && python -m SimpleHTTPServer 3000
```

**Option C: Using PHP Built-in Server**
```bash
cd out
php -S localhost:3000
```

## 🌐 **Deployment Options**

### **Static Hosting Services**

### **Docker Deployment**

#### **Create Dockerfile**
```dockerfile
# Use Node.js Alpine image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### **Create nginx.conf**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        # Proxy to robot API if needed
        proxy_pass http://robot-ip:port/;
    }
}
```

#### **Build and Run Docker Container**
```bash
# Build Docker image
docker build -t sandbot-dashboard .

# Run container
docker run -p 8080:80 sandbot-dashboard

# Access at http://localhost:8080
```

### **Traditional Web Server Deployment**

#### **Apache HTTP Server**
1. Build static files: `npm run build`
2. Copy `out/` contents to `/var/www/html/`
3. Configure virtual host if needed
4. Restart Apache service

#### **Nginx**
1. Build static files: `npm run build`
2. Copy `out/` contents to `/var/www/html/`
3. Update nginx configuration
4. Reload nginx configuration

## ⚙️ **Configuration**

### **Environment Variables**
Create `.env.local` file in project root:
```bash
# Default robot IP (optional)
NEXT_PUBLIC_DEFAULT_ROBOT_IP=192.168.1.100

# Default polling interval (optional)
NEXT_PUBLIC_DEFAULT_POLL_CYCLE=10

# Enable wLED by default (optional)
NEXT_PUBLIC_DEFAULT_WLED_ENABLED=false
```

### **Robot Network Configuration**
Ensure your SandBot robot is accessible:
- Robot should be on same network as dashboard
- CORS should be configured if needed


### **Performance Optimization**

## 📱 **Mobile & Tablet Setup**

### **Progressive Web App (PWA)**
The dashboard supports PWA features:
- Add to home screen on mobile devices
- Offline capability for basic functions
- Touch-optimized interface
