# SandBot Dashboard

A modern, responsive web interface for controlling and monitoring SandBot robots. Built with Next.js and React, this dashboard provides comprehensive robot management capabilities including real-time status monitoring, file management, pattern simulation, and network configuration.

![SandBot Dashboard](https://img.shields.io/badge/SandBot-Dashboard-blue) ![Next.js](https://img.shields.io/badge/Next.js-15.3.1-black) ![React](https://img.shields.io/badge/React-19.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Features

### 📊 **Status Monitoring**
- **Real-time Status Display**: Live robot status in the main header (idle, doodling, paused, offline)
- **Position Tracking**: Current X/Y coordinates with precision display
- **Connection Management**: Visual connection indicators and auto-reconnection
- **Advanced Diagnostics**: WiFi IP, SSID, MAC address, firmware version, and system time

### 🎨 **Pattern Simulation & Control**
- **Interactive Canvas**: 500x500px pattern visualization with polar coordinate rendering
- **Progress Control**: Intuitive slider for viewing pattern completion percentage
- **File Loading**: Support for .thr pattern files with real-time preview
- **Play Controls**: Play, pause, and stop functionality with visual feedback

### 📁 **File Management**
- **Multi-format Support**: Handle both .thr (pattern) and .seq (playlist) files
- **Upload & Download**: Drag-and-drop file upload with progress indication
- **File Browser**: Searchable file list with size information
- **Delete Operations**: Safe file deletion with confirmation dialogs
- **Gallery History**: Track recently played files with timestamps

### ⚙️ **Configuration & Settings**
- **Robot Settings**: set robot hostName/IP, polling intervals, and homing
- **Network Configuration**: WiFi setup with client mode and access point options
- **LED Controls**: Optional wLED integration for advanced lighting effects
- **URL Parameters**: Support for configuration via query parameters

### 🌐 **Network Management**
- **WiFi Configuration**: Easy setup for both client and access point modes
- **Network File Management**: Direct access to .network configuration files
- **IP Address Display**: Real-time network status and connectivity information

## 🏗️ **Technical Architecture**

### **Built With**
- **Framework**: Next.js 15.3.1 with React 19.0.0
- **UI Components**: Radix UI primitives with Tailwind CSS
- **Icons**: Lucide React icon library
- **Styling**: Tailwind CSS with custom color scheme
- **State Management**: React hooks with organized state structure

## 📱 **User Interface**

### **Main Navigation Tabs**
1. **Status Tab**: Real-time monitoring and diagnostics
2. **Pattern Simulator**: File loading, preview, and pattern control
3. **wLED Control**: (Optional) LED lighting management
4. **Configuration**: Robot settings and network configuration

### **Key Components**
- **Header Status Bar**: Always-visible robot status with color coding
- **File Management Panel**: Centralized file operations
- **Interactive Canvas**: Pattern visualization with zoom and pan
- **Settings Panels**: Collapsible configuration sections
- **History Gallery**: Recently played files with metadata

## 🔧 **Robot Communication**

### **API Endpoints**
The dashboard communicates with SandBot robots via HTTP REST API:

- `GET /status` - Robot status and position
- `GET /settings` - Robot configuration
- `POST /uploadtofileman` - File upload
- `GET /files/{fsName}/{fileName}` - File download
- `DELETE /deleteFile/{fsName}/{fileName}` - File deletion
- `GET /playFile/{fsName}/{fileName}` - Play pattern
- `GET /exec/{command}` - Execute commands (play, pause, resume)

### **Real-time Updates**
- Configurable polling intervals (default: 10 seconds)
- Automatic reconnection on network issues
- Live status updates without page refresh

## 📋 **Installation & Setup**

For detailed installation instructions, see [INSTALL.md](./INSTALL.md)

### **Quick Start**
```bash
# Clone the repository
git clone [repository-url]
cd sandbot-dashboard

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

### **Static Deployment**
```bash
# Build static files (configured for static export)
npm run build

# Serve with any HTTP server
npx serve out/
# or
python -m http.server 3000 -d out/
```

## 🔗 **URL Parameters**

Configure the dashboard via URL parameters:

```
?hostIP=192.168.1.100&pollCycle=5&wledEnabled=true&wledAddress=192.168.1.101
```

**Supported Parameters:**
- `hostIP`: Robot IP address
- `pollCycle`: Status polling interval (seconds)
- `wledEnabled`: Enable LED controls (true/false)
- `wledAddress`: LED controller IP address


## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the SandBot community**