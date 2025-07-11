'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Search, Upload, Play, Pause, Square, Eye, Wifi, WifiOff, ChevronDown, Home, MapPin, HelpCircle } from 'lucide-react';

/**
 * Utility function to parse query parameters from URL
 * Extracts robot configuration from URL search parameters
 * @returns {Object} Parsed parameters object
 */
const getQueryParams = () => {
  if (typeof window === 'undefined') return {};
  
  const searchParams = new URLSearchParams(window.location.search);
  const params = {};
  
  if (searchParams.has('hostIP')) params.robotName = searchParams.get('hostIP');
  if (searchParams.has('pollCycle')) {
    const poll = parseInt(searchParams.get('pollCycle'), 10);
    if (!isNaN(poll) && poll > 0) params.pollCycle = poll;
  }
  if (searchParams.has('wledEnabled')) {
    params.wledEnabled = searchParams.get('wledEnabled').toLowerCase() === 'true';
  }
  if (searchParams.has('wledAddress')) params.wledAddress = searchParams.get('wledAddress');
  
  return params;
};

/**
 * Main SandBot Dashboard Component
 * Provides robot control interface with status monitoring, file management,
 * pattern simulation, and configuration options
 */
export default function SandBotDashboard() {
  // =====================================
  // STATE MANAGEMENT
  // =====================================
  
  // Robot connection and status
  const [robotName, setRobotName] = useState('');
  const [pollCycle, setPollCycle] = useState(10);
  const [connected, setConnected] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // Robot configuration for time calculations
  const [robotConfig, setRobotConfig] = useState({
    axis0: { maxSpeed: 10, maxVal: 100 }, // Default: 200mm diameter (100mm radius)
    axis1: { maxSpeed: 10, maxVal: 100 }
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('configuration');
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [robotSettingsVisible, setRobotSettingsVisible] = useState(false);
  const [showSetHomeTooltip, setShowSetHomeTooltip] = useState(false);
  
  // File management
  const [fileSystem, setFileSystem] = useState({ fsName: '', files: [] });
  const [fileSearch, setFileSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteFileSheetOpen, setDeleteFileSheetOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Pattern simulation
  const [progress, setProgress] = useState(100);
  const [coordinates, setCoordinates] = useState([]);
  const [loadedFileName, setLoadedFileName] = useState('');
  
  // File history tracking
  const [fileHistory, setFileHistory] = useState([]);
  const [previousQueueStatus, setPreviousQueueStatus] = useState(0);
  const [filePlayStartTime, setFilePlayStartTime] = useState(null);
  
  // Control interface selection
  const [controlMode, setControlMode] = useState('disabled'); // 'disabled', 'wled', 'legacy', 'cnc'
  const [wledAddress, setWledAddress] = useState('');
  
  // WiFi configuration
  const [wifiConfigOpen, setWifiConfigOpen] = useState(false);
  const [wifiConfig, setWifiConfig] = useState({ wifi: 'yes', WiFiSSID: '', WiFiPW: '', WiFiHostname: '' });
  const [wifiConfigLoading, setWifiConfigLoading] = useState(false);
  const [wifiFileExists, setWifiFileExists] = useState(false);
  
  // Refs for canvas and polling
  const canvasRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const initialFetchDone = useRef(false);

  // =====================================
  // UTILITY FUNCTIONS
  // =====================================

useEffect(() => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;
  
  const params = getQueryParams();
  
  // Apply query parameters to state if they exist
  if (params.robotName) setRobotName(params.robotName);
  if (params.pollCycle) setPollCycle(params.pollCycle);
  if (params.wledEnabled !== undefined) setControlMode(params.wledEnabled ? 'wled' : 'disabled');
  if (params.wledAddress) setWledAddress(params.wledAddress);
  
}, []);
  
// Start polling when robotName and pollCycle are set
useEffect(() => {
  if (robotName) {
    // If wLED address is not set but wLED is enabled, update the wLED address
    if (controlMode === 'wled' && !wledAddress) {
      setWledAddress(robotName);
    }
    
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Start polling
    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, pollCycle * 1000);
    
    // File list will be fetched automatically when connection is established
  }
  
  return () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };
}, [robotName, pollCycle, controlMode]);
  
// Handle tab switching when control mode is disabled
useEffect(() => {
  if (controlMode === 'disabled' && activeTab === 'control') {
    setActiveTab('configuration');
  }
}, [controlMode, activeTab]);

// Reset initial fetch flag when robot name changes
useEffect(() => {
  initialFetchDone.current = false;
}, [robotName]);

  // Update simulator drawing when needed
  useEffect(() => {
    if (activeTab === 'simulator' && coordinates.length > 0) {
      drawSimulation();
    }
  }, [activeTab, progress, coordinates]);
  
const updateUrlWithSettings = () => {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  
  // Only add parameters that have values
  if (robotName) {
    url.searchParams.set('hostIP', robotName);
  } else {
    url.searchParams.delete('hostIP');
  }
  
  if (pollCycle !== 10) {
    url.searchParams.set('pollCycle', pollCycle.toString());
  } else {
    url.searchParams.delete('pollCycle');
  }
  
  if (controlMode !== 'disabled') {
    url.searchParams.set('wledEnabled', 'true');
  } else {
    url.searchParams.delete('wledEnabled');
  }
  
  if (wledAddress && wledAddress !== robotName) {
    url.searchParams.set('wledAddress', wledAddress);
  } else {
    url.searchParams.delete('wledAddress');
  }
  
  // Update browser URL without reloading
  window.history.replaceState({}, '', url);
};

  // =====================================
  // FILE HISTORY MANAGEMENT
  // =====================================

  /**
   * Add file to history buffer when played
   * @param {string} fileName - Name of the file to add to history
   * @param {Date} playStartTime - When the file was started (optional)
   */
  const addToHistory = (fileName, playStartTime = null) => {
    if (!fileName) return;
    
    const historyEntry = {
      fileName,
      playTimestamp: playStartTime ? playStartTime.toLocaleString() : new Date().toLocaleString(),
      id: Date.now() + Math.random() // Unique ID to handle duplicates
    };
    
    setFileHistory(prev => {
      // Add new entry at the beginning, keeping all duplicates
      return [historyEntry, ...prev];
    });
  };

  /**
   * Poll robot status and update connection state
   * Fetches current robot status including position, queue, and pause state
   */
  const pollStatus = async () => {
    if (!robotName || isPolling) return;
    
    setIsPolling(true);
    const wasConnected = connected;
    
    try {
      const response = await fetch(`http://${robotName}/status`);
      const data = await response.json();
      
      // No automatic history updates on completion
      
      // Update states
      setStatusData(data);
      setPreviousQueueStatus(data.Qd || 0);
      setConnected(true);
      
      // Fetch initial data only on first successful connection
      if (!wasConnected && !initialFetchDone.current) {
        initialFetchDone.current = true;
        fetchSettings();
        fetchFileList();
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      setConnected(false);
    } finally {
      setIsPolling(false);
    }
  };
  
  // Fetch settings from robot
  const fetchSettings = async () => {
    if (!robotName) return;
    
    try {
      const response = await fetch(`http://${robotName}/getsettings`);
      const data = await response.json();
      setSettingsData(data);
      
      // Extract robot configuration for time calculations
      if (data && data.robotConfig && data.robotConfig.robotType === 'SandTableScara') {
        const axis0 = data.robotConfig.robotGeom?.axis0;
        const axis1 = data.robotConfig.robotGeom?.axis1;
        
        const newConfig = {
          axis0: {
            maxSpeed: axis0?.maxSpeed || 10,
            maxVal: axis0?.maxVal || 100
          },
          axis1: {
            maxSpeed: axis1?.maxSpeed || 10,
            maxVal: axis1?.maxVal || 100
          }
        };
        setRobotConfig(newConfig);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };
  
  // Fetch file list from robot
  const fetchFileList = async () => {
    if (!robotName) return;
    
    try {
      const response = await fetch(`http://${robotName}/filelist/`);
      const data = await response.json();
      
      if (data.rslt === 'ok') {
        const filteredFiles = data.files.filter(file => !file.name.startsWith('.'));

        setFileSystem({
          fsName: data.fsName,
          files: filteredFiles
        });
      }
    } catch (error) {
      console.error('Error fetching file list:', error);
    }
  };
  
  // Function to handle file deletion
  const deleteFile = async (fsName, fileName) => {
    if (!robotName) return;
    
    try {
      const response = await fetch(`http://${robotName}/deleteFile/${fsName}/${fileName}`);
      const data = await response.json();
      
      if (data.rslt === 'ok') {
        alert(`File ${fileName} deleted successfully`);
        // Reset selected file and close the confirmation
        setSelectedFile(null);
        setShowDeleteConfirmation(false);
        // Refresh file list
        fetchFileList();
      } else {
        alert(`Failed to delete file: ${data.rslt || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file');
    }
  };

  // Play file on robot
  const playFile = async (fsName, fileName) => {
    if (!robotName) return;
    
    try {
      await fetch(`http://${robotName}/playFile/${fsName}/${fileName}`);
      
      // Add current file to history immediately when played
      const playTime = new Date();
      addToHistory(fileName, playTime);
      
      setLoadedFileName(fileName);
      setFilePlayStartTime(playTime);
    } catch (error) {
      console.error('Error playing file:', error);
    }
  };
  
  // Save to robot
  const uploadToRobot = async () => {
    if (!robotName || coordinates.length === 0 || !loadedFileName) return;
    
    try {
      // Convert coordinates back to file content
      const fileContent = coordinates
        .map(coord => `${coord.theta} ${coord.rho}`)
        .join('\n');
      
      // Create a file object from the content
      const file = new File([fileContent], loadedFileName, {
        type: 'text/plain',
      });
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to robot
      const response = await fetch(`http://${robotName}/uploadtofileman`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        alert('File uploaded successfully');
        // Refresh file list to show the new file
        fetchFileList();
      } else {
        alert('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    }
  };

  // Preview file in simulator
  const previewFile = async (fsName, fileName) => {
    if (!robotName) return;
    
    try {
      const response = await fetch(`http://${robotName}/files/${fsName}/${fileName}`);
      const content = await response.text();
      const parsedCoordinates = parseFile(content);
      setCoordinates(parsedCoordinates);
      setLoadedFileName(fileName);
      setActiveTab('simulator');
      setProgress(100); // Set to 100% to show full pattern initially
    } catch (error) {
      console.error('Error previewing file:', error);
    }
  };
  
  // Handle play/pause button press
  const handlePlayPause = async () => {
    if (!robotName || !loadedFileName) return;
    
    try {
      // Check if paused (pause=1)
      if (statusData && statusData.pause === 1) {
        await fetch(`http://${robotName}/exec/resume`);
      } 
      // Check if something is queued (Qd >= 1)
      else if (statusData && statusData.Qd >= 1) {
        await fetch(`http://${robotName}/exec/pause`);
      } 
      // Nothing running, start playing
      else {
        await fetch(`http://${robotName}/exec/play`);
      }
      
      // Poll status immediately to update UI
      setTimeout(pollStatus, 500);
    } catch (error) {
      console.error('Error with play/pause:', error);
    }
  };
  
  // Handle stop button press
  const handleStop = async () => {
    if (!robotName) return;
    
    try {
      await fetch(`http://${robotName}/exec/stop`);
      // Poll status immediately to update UI
      setTimeout(pollStatus, 500);
    } catch (error) {
      console.error('Error stopping:', error);
    }
  };
  
  // Handle home button press
  const handleHome = async () => {
    if (!robotName) return;
    
    try {
      await fetch(`http://${robotName}/exec/G28`);
      // Poll status immediately to update UI
      setTimeout(pollStatus, 500);
    } catch (error) {
      console.error('Error homing:', error);
    }
  };
  
  // Handle set home button press
  const handleSetHome = async () => {
    if (!robotName) return;
    
    try {
      await fetch(`http://${robotName}/exec/G92 X0 Y0`);
      // Poll status immediately to update UI
      setTimeout(pollStatus, 500);
    } catch (error) {
      console.error('Error setting home:', error);
    }
  };
  
  // WiFi Configuration Functions
  const fetchWifiConfig = async () => {
    if (!robotName) return;
    
    setWifiConfigLoading(true);
    try {
      const response = await fetch(`http://${robotName}/files/sd/.network`);
      if (response.ok) {
        const content = await response.text();
        const config = JSON.parse(content);
        setWifiFileExists(true);
        setWifiConfig({
          wifi: config.wifi || 'yes',
          WiFiSSID: config.WiFiSSID || '',
          WiFiPW: config.WiFiPW || '',
          WiFiHostname: config.WiFiHostname || ''
        });
      } else {
        // File doesn't exist, use default config
        setWifiFileExists(false);
        setWifiConfig({ wifi: 'yes', WiFiSSID: '', WiFiPW: '', WiFiHostname: '' });
      }
    } catch (error) {
      console.error('Error fetching WiFi config:', error);
      setWifiFileExists(false);
      setWifiConfig({ wifi: 'yes', WiFiSSID: '', WiFiPW: '', WiFiHostname: '' });
    }
    setWifiConfigLoading(false);
  };

  const saveWifiConfig = async () => {
    if (!robotName) return;
    
    setWifiConfigLoading(true);
    try {
      let configToSave;
      
      if (wifiConfig.wifi === 'ap') {
        // For access point mode, only save the wifi key
        configToSave = { wifi: 'ap' };
      } else {
        // For 'yes' mode, save all fields
        configToSave = {
          wifi: 'yes',
          WiFiSSID: wifiConfig.WiFiSSID,
          WiFiPW: wifiConfig.WiFiPW,
          WiFiHostname: wifiConfig.WiFiHostname
        };
      }
      
      const configContent = JSON.stringify(configToSave);
      const file = new File([configContent], '.network', {
        type: 'application/json',
      });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`http://${robotName}/uploadtofileman`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        alert('WiFi configuration saved successfully');
        setWifiFileExists(true);
        setWifiConfigOpen(false);
      } else {
        alert('Failed to save WiFi configuration');
      }
    } catch (error) {
      console.error('Error saving WiFi config:', error);
      alert('Error saving WiFi configuration');
    }
    setWifiConfigLoading(false);
  };

  const deleteWifiConfig = async () => {
    if (!robotName) return;
    
    if (!window.confirm('Are you sure you want to delete the WiFi configuration?')) {
      return;
    }
    
    setWifiConfigLoading(true);
    try {
      const response = await fetch(`http://${robotName}/deleteFile/sd/.network`);
      const data = await response.json();
      
      if (data.rslt === 'ok') {
        alert('WiFi configuration deleted successfully');
        setWifiConfig({ wifi: 'yes', WiFiSSID: '', WiFiPW: '', WiFiHostname: '' });
        setWifiFileExists(false);
        setWifiConfigOpen(false);
      } else {
        alert(`Failed to delete WiFi configuration: ${data.rslt || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting WiFi config:', error);
      alert('Error deleting WiFi configuration');
    }
    setWifiConfigLoading(false);
  };

  const openWifiConfig = () => {
    setWifiConfigOpen(true);
    fetchWifiConfig();
  };

  // Get current robot status for header display
  const getCurrentStatus = () => {
    if (!connected || !statusData) return 'offline';
    
    // Check if robot is actively running commands
    if (statusData.Qd > 0) {
      return statusData.pause === 1 ? 'paused' : 'doodling';
    }
    
    // Robot is connected but not running anything
    return 'idle';
  };

  // Check if firmware version is >= 2.030.000
  const isFirmwareVersionSupported = () => {
    if (!statusData || !statusData.espV) return false;
    
    try {
      // Parse version string (e.g., "2.030.000" or "2.030.001")
      const versionStr = statusData.espV.toString();
      const versionParts = versionStr.split('.');
      
      if (versionParts.length < 3) return false;
      
      const major = parseInt(versionParts[0], 10) || 0;
      const minor = parseInt(versionParts[1], 10) || 0;
      const patch = parseInt(versionParts[2], 10) || 0;
      
      // Check if version >= 2.030.000
      if (major > 2) return true;
      if (major === 2 && minor > 30) return true;
      if (major === 2 && minor === 30 && patch >= 0) return true;
      
      return false;
    } catch (error) {
      console.error('Error parsing firmware version:', error);
      return false;
    }
  };

  // Calculate estimated drawing time for pattern
  const calculateDrawingTime = () => {
    if (!coordinates || coordinates.length < 2) return 0;
    
    // Use robot config when connected, fallback to defaults when offline
    const maxRadius = Math.max(robotConfig.axis0.maxVal, robotConfig.axis1.maxVal);
    const avgSpeed = (robotConfig.axis0.maxSpeed + robotConfig.axis1.maxSpeed) / 2;
    
    let totalDistance = 0;
    
    // Calculate distance between consecutive points
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      
      // Convert polar to cartesian coordinates (normalized 0-1 to actual mm)
      const prevX = prev.rho * maxRadius * Math.cos(prev.theta);
      const prevY = prev.rho * maxRadius * Math.sin(prev.theta);
      const currX = curr.rho * maxRadius * Math.cos(curr.theta);
      const currY = curr.rho * maxRadius * Math.sin(curr.theta);
      
      // Calculate Euclidean distance between points
      const deltaX = currX - prevX;
      const deltaY = currY - prevY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      totalDistance += distance;
    }
    
    // Calculate time in seconds (distance / speed)
    const timeSeconds = totalDistance / avgSpeed;
    
    return timeSeconds;
  };

  // Format time duration for display
  const formatDrawingTime = (seconds) => {
    if (!seconds || seconds < 0) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // File upload function for .seq and .thr files
  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.seq,.thr';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file || !robotName) return;
      
      setUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`http://${robotName}/uploadtofileman`, {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          alert(`File ${file.name} uploaded successfully`);
          // Refresh file list to show the new file
          fetchFileList();
        } else {
          alert('Failed to upload file');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Error uploading file');
      }
      setUploadingFile(false);
    };
    input.click();
  };

  // Save gallery to playlist function
  const handleSaveGalleryToPlaylist = async () => {
    if (!robotName || fileHistory.length === 0) return;
    
    // Prompt user for filename
    const filename = prompt('Enter filename for the playlist (without extension):');
    if (!filename) return;
    
    // Ensure filename ends with .seq
    const finalFilename = filename.endsWith('.seq') ? filename : `${filename}.seq`;
    
    try {
      // Create playlist content from gallery (reverse order, just filenames)
      const playlistContent = fileHistory
        .slice() // Create a copy to avoid mutating original
        .reverse() // Reverse the order
        .map(entry => entry.fileName) // Extract just the filename
        .join('\n'); // Join with newlines
      
      // Create a file object from the content
      const file = new File([playlistContent], finalFilename, {
        type: 'text/plain',
      });
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to robot
      const response = await fetch(`http://${robotName}/uploadtofileman`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        alert(`Playlist ${finalFilename} created and uploaded successfully`);
        // Refresh file list to show the new file
        fetchFileList();
      } else {
        alert('Failed to upload playlist');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('Error creating playlist');
    }
  };
  
  // Parse .thr file content
  const parseFile = (content) => {
    const lines = content.split('\n');
    return lines.map(line => {
      const [theta, rho] = line.split(' ').map(Number);
      return { theta, rho };
    }).filter(coord => !isNaN(coord.theta) && !isNaN(coord.rho));
  };
  
  // Draw simulation based on coordinates
  const drawSimulation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 10;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();
    
    if (coordinates.length === 0) return;
    
    const coordinatesToDraw = coordinates.slice(0, Math.floor(coordinates.length * progress / 100));
    
    ctx.beginPath();
    coordinatesToDraw.forEach((coord, index) => {
      const x = centerX + coord.rho * maxRadius * Math.cos(coord.theta);
      const y = centerY + coord.rho * maxRadius * Math.sin(coord.theta);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.strokeStyle = '#0F5F91';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  
  // Handle file upload for simulator
  const handleSimulatorFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const parsedCoordinates = parseFile(content);
        setCoordinates(parsedCoordinates);
        setLoadedFileName(file.name);
        setProgress(100); // Set to 100% to show full pattern initially
      };
      reader.readAsText(file);
    }
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Filter files based on search term
  const filteredFiles = fileSystem.files
    .filter(file => file.name.toLowerCase().includes(fileSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Determine which icon to show for play/pause button
  const isPlayingIcon = statusData && statusData.pause === 1 ? <Play size={20} /> : <Pause size={20} />;
  
  // Check if play/pause button should be disabled
  const isPlayPauseDisabled = !loadedFileName || !connected;

  return (
    <div className="container mx-auto p-4 bg-[#f9f5f1] min-h-screen">
      {/* Header section */}
      <div className="flex items-center mb-6">
        <h1 className="text-3xl font-bold text-[#5c4033] flex-1">
          sandBot dashboard : <span className="font-normal text-blue-600">{getCurrentStatus()}</span>
        </h1>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="icon"
            disabled={isPlayPauseDisabled}
            onClick={handlePlayPause}
            className={`h-10 w-10 rounded-full ${isPlayPauseDisabled ? 'opacity-50' : 'hover:bg-[#e6d8cc]'}`}
            title={statusData?.pause === 1 ? "Resume" : "Pause"}
          >
            {isPlayingIcon}
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            disabled={!connected}
            onClick={handleStop}
            className={`h-10 w-10 rounded-full ${!connected ? 'opacity-50' : 'hover:bg-[#e6d8cc]'}`}
            title="Stop"
          >
            <Square size={20} />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2 flex-1 justify-end">
          {connected ? (
            <div className="flex items-center text-green-600">
              <Wifi className="mr-1" size={20} />
              <span>Connected to {robotName}</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <WifiOff className="mr-1" size={20} />
              <span>Disconnected</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList className={`grid w-full ${controlMode !== 'disabled' ? 'grid-cols-4' : 'grid-cols-3'} bg-[#e6d8cc]`}>
		  <TabsTrigger value="status">Status</TabsTrigger>
		  <TabsTrigger value="simulator">Pattern Simulator</TabsTrigger>
		  {controlMode !== 'disabled' && <TabsTrigger value="control">{controlMode === 'wled' ? 'wLED Control' : controlMode === 'legacy' ? 'Sand UI' : 'CNC Control'}</TabsTrigger>}
		  <TabsTrigger value="configuration">Configuration</TabsTrigger>
	   </TabsList> 
            {/* Status Tab */}
            <TabsContent value="status">
              <Card className="bg-white">
                <CardContent>
                  {statusData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#f5efe9] p-4 rounded-md shadow-sm">
                          <h3 className="text-lg font-medium text-[#5c4033]">Position</h3>
                          <div className="mt-2">
                            <p><strong>X:</strong> {statusData.XYZ ? statusData.XYZ[0].toFixed(2) : 'N/A'}</p>
                            <p><strong>Y:</strong> {statusData.XYZ ? statusData.XYZ[1].toFixed(2) : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="bg-[#f5efe9] p-4 rounded-md shadow-sm">
                          <h3 className="text-lg font-medium text-[#5c4033]">Active File</h3>
                          <div className="mt-2">
                            <p>{loadedFileName || 'No file loaded'}</p>
                            {loadedFileName && coordinates.length > 0 && (
                              <p className="text-sm text-gray-600 mt-1">
                                Drawing estimate: {formatDrawingTime(calculateDrawingTime())}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Collapsible open={historyVisible} onOpenChange={setHistoryVisible}>
                        <CollapsibleTrigger className="flex items-center w-full bg-[#e6d8cc] p-2 rounded-md">
                          <span className="flex-1 text-left font-medium">Gallery ({fileHistory.length})</span>
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveGalleryToPlaylist();
                            }}
                            disabled={fileHistory.length < 2 || !connected}
                            className="mr-2 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-6"
                          >
                            Save gallery to playlist
                          </Button>
                          <ChevronDown className={`transform transition-transform ${historyVisible ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 bg-[#f5efe9] p-4 rounded-md shadow-sm">
                          {fileHistory.length === 0 ? (
                            <p className="text-gray-500 text-sm">No files played yet</p>
                          ) : (
                            <div className="space-y-2">
                              {fileHistory.map((entry) => (
                                <div key={entry.id} className="flex justify-between items-center p-2 bg-white rounded-md">
                                  <div className="flex-1">
                                    <span className="font-medium">{entry.fileName}</span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Played: {entry.playTimestamp}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                      
                      <Collapsible open={advancedVisible} onOpenChange={setAdvancedVisible}>
                        <CollapsibleTrigger className="flex items-center w-full bg-[#e6d8cc] p-2 rounded-md">
                          <span className="flex-1 text-left font-medium">Advanced Details</span>
                          <ChevronDown className={`transform transition-transform ${advancedVisible ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 bg-[#f5efe9] p-4 rounded-md shadow-sm">
                          <div className="grid grid-cols-2 gap-y-2">
                            <p><strong>WiFi IP:</strong> {statusData.wifiIP || 'N/A'}</p>
                            <p><strong>SSID:</strong> {statusData.ssid || 'N/A'}</p>
                            <p><strong>MAC:</strong> {statusData.MAC || 'N/A'}</p>
                            <p><strong>Firmware Version:</strong> {statusData.espV || 'N/A'}</p>
                            <p><strong>Date/Time:</strong> {statusData.tod || 'N/A'}</p>
                            <p><strong>Queue Count:</strong> {statusData.Qd}</p>
                            <p><strong>Paused:</strong> {statusData.pause === 1 ? 'Yes' : 'No'}</p>
                            <p><strong>Homed:</strong> {statusData.Hmd === 1 ? 'Yes' : 'No'}</p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  ) : (
                    <p>No status data available. Please ensure the robot is connected.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Simulator Tab */}
            <TabsContent value="simulator">
              <Card className="bg-white">
                <CardContent>
                  <div className="mb-4 flex items-center space-x-4">
                    <label htmlFor="file-upload" className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center">
                      <Upload className="mr-2" size={18} />
                      <span>draw file</span>
                    </label>
                    <input id="file-upload" type="file" className="hidden" onChange={handleSimulatorFileUpload} accept=".thr" />
                    
                    {coordinates.length > 0 && (
                      <Button 
                        onClick={uploadToRobot}
                        disabled={!robotName || !connected}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
                      >
                        <Upload className="mr-2" size={18} />
                        <span>save to robot</span>
                      </Button>
                    )}
                    
                    {/* Slider on same row */}
                    {coordinates.length > 0 && (
                      <div className="flex items-center flex-1">
                        <span className="mr-2 text-sm">0%</span>
                        <Slider
                          value={[progress]}
                          onValueChange={(value) => setProgress(value[0])}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="ml-2 text-sm">100%</span>
                      </div>
                    )}
                  </div>

                  {loadedFileName && (
                    <div className="mt-2 text-sm text-gray-600 flex justify-between items-center">
                      <span className="text-left truncate flex-1">
                        Loaded: {loadedFileName}
                      </span>
                      <span className="text-center flex-1">
                        Drawing estimate: {formatDrawingTime(calculateDrawingTime())}
                      </span>
                      <span className="text-right text-xs flex-1">
                        Speed @ {Math.round((robotConfig.axis0.maxSpeed + robotConfig.axis1.maxSpeed) / 2)}mm/s • ⌀{Math.max(robotConfig.axis0.maxVal, robotConfig.axis1.maxVal) * 2}mm
                        {connected ? 
                          <span className="text-green-600 ml-1">✓</span> : 
                          <span className="text-orange-600 ml-1">○</span>
                        }
                      </span>
                    </div>
                  )}
                    
                  <div className="flex justify-center">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={500}
                      className="w-full max-w-lg h-auto bg-white rounded-lg shadow-inner border border-gray-200"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

{/* Control Tab */}
<TabsContent value="control">
  <Card className="bg-white">
    <CardContent>
      {controlMode !== 'disabled' ? (
        wledAddress || robotName ? (
          <div className="w-full">
            <div className="aspect-video w-full">
              <iframe 
                src={`http://${controlMode === 'wled' ? (wledAddress || robotName) : robotName}${controlMode === 'wled' ? '' : controlMode === 'cnc' ? '/cnc.html' : controlMode === 'legacy' ? '/sand.html' : ''}`} 
                className="w-full h-full border-none rounded-md"
                title={`${controlMode === 'wled' ? 'wLED' : controlMode === 'legacy' ? 'Legacy' : 'CNC'} Control Interface`}
              />
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Controlling {controlMode === 'wled' ? 'wLED' : controlMode === 'legacy' ? 'Legacy Interface' : 'CNC Interface'} at: {controlMode === 'wled' ? (wledAddress || robotName) : robotName}
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <HelpCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700">
              Please enter a Robot IP in the Configuration tab
            </p>
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <WifiOff size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700">
            Control Interface is disabled
          </p>
          <p className="text-gray-500">
            Enable it in the Configuration tab to control your devices
          </p>
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

{/* Configuration Tab */}
<TabsContent value="configuration">
  <Card className="bg-white">
    <CardContent>
      <div className="space-y-6">
        {/* Configuration and homing controls */}
        <div className="grid grid-cols-2 gap-6">
          {/* Robot Configuration */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Robot Name/IP</label>
              <div className="flex mt-1">
                <Input
                  value={robotName}
                  onChange={e => {
 		    setRobotName(e.target.value);
		  }}
		  onBlur={updateUrlWithSettings}
                  placeholder="Enter robot IP or hostname"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Poll Cycle</label>
              <div className="flex mt-1 items-center">
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={pollCycle}
                  onChange={e => setPollCycle(parseInt(e.target.value, 10))}
                  className="w-24"
                />
                <span className="ml-2">seconds</span>
              </div>
            </div>
          </div>
          
          {/* Homing Controls */}
          <div className="bg-[#f5efe9] p-4 rounded-md shadow-sm text-center">
            <h3 className="text-lg font-medium text-[#5c4033] mb-3">Homing Controls</h3>
            <div className="flex justify-center space-x-4">
              <div className="relative">
                <Button 
                  onClick={handleSetHome}
                  disabled={!connected}
                  className="bg-[#5c4033] hover:bg-[#4a3328] flex items-center"
                  onMouseEnter={() => setShowSetHomeTooltip(true)}
                  onMouseLeave={() => setShowSetHomeTooltip(false)}
                >
                  <MapPin className="mr-2" size={18} />
                  Set Home
                </Button>
                {showSetHomeTooltip && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50">
                    Force the robot's current XY arm positions
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-t-gray-800 border-l-transparent border-r-transparent"></div>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handleHome}
                disabled={!connected}
                className="bg-[#5c4033] hover:bg-[#4a3328] flex items-center"
              >
                <Home className="mr-2" size={18} />
                {statusData && statusData.Hmd === 1 ? 'reHome' : 'Home'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* wLED Controls and additional settings */}
        <div className="grid grid-cols-2 gap-6">
          {/* Additional Robot Settings */}
          <div className="space-y-4">
            <Button 
              onClick={fetchSettings}
              disabled={!robotName}
              className="bg-[#5c4033] hover:bg-[#4a3328]"
            >
              Robot Settings
            </Button>
            
            {settingsData && (
              <Collapsible open={robotSettingsVisible} onOpenChange={setRobotSettingsVisible} className="mt-4">
                <CollapsibleTrigger className="flex items-center w-full bg-[#e6d8cc] p-2 rounded-md">
                  <span className="flex-1 text-left font-medium">Robot Configuration</span>
                  <ChevronDown className={`transform transition-transform ${robotSettingsVisible ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 bg-[#f5efe9] p-4 rounded-md shadow-sm overflow-auto max-h-96">
                  <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(settingsData, null, 2)}</pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
          
          {/* Control Interface Selection */}
          <div className="bg-[#f5efe9] p-4 rounded-md shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Control Interface</label>
                <div className="flex mt-2 gap-2">
                  <button
                    onClick={() => setControlMode('disabled')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      controlMode === 'disabled'
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Disabled
                  </button>
                  <button
                    onClick={() => setControlMode('wled')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      controlMode === 'wled'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    wLED
                  </button>
                  <button
                    onClick={() => setControlMode('legacy')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      controlMode === 'legacy'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Legacy
                  </button>
                  <button
                    onClick={() => setControlMode('cnc')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      controlMode === 'cnc'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    CNC
                  </button>
                </div>
              </div>

              {controlMode === 'wled' && (
                <div>
                  <label className="text-sm font-medium">wLED IP/Hostname</label>
                  <div className="flex mt-1">
                    <Input
                      value={wledAddress}
                      onChange={e => {
                        const newAddress = e.target.value;
                        setWledAddress(newAddress);
                      }}
                      placeholder="Enter wLED IP or hostname"
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* File Management section */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-lg font-medium text-[#5c4033] mb-3">File Management</h3>
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={() => setDeleteFileSheetOpen(true)}
              disabled={!connected}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete File
            </Button>
            <Button 
              onClick={handleFileUpload}
              disabled={!connected || uploadingFile}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <Upload size={16} />
              {uploadingFile ? 'Uploading...' : 'Upload Playlist'}
            </Button>
            {isFirmwareVersionSupported() && (
              <Button 
                onClick={openWifiConfig}
                disabled={!connected}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Wifi size={16} />
                Network Config
              </Button>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>

            {/* Delete File Sheet */}
            <Sheet open={deleteFileSheetOpen} onOpenChange={setDeleteFileSheetOpen}>
              <SheetContent side="right" className="w-[40%] bg-[#f5efe9]">
                <SheetHeader>
                  <SheetTitle>Delete File (.thr/.seq)</SheetTitle>
                </SheetHeader>
                
                <div className="mt-0 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search files..."
                      className="pl-8"
                      value={fileSearch}
                      onChange={e => setFileSearch(e.target.value)}
                    />
                    <div className="absolute right-2 top-2.5 text-xs text-gray-500">
                      {filteredFiles.length}/{fileSystem.files.length}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={fetchFileList}
                    className="bg-[#5c4033] hover:bg-[#4a3328] w-full"
                  >
                    Refresh File List
                  </Button>
                  
                  {filteredFiles.length > 0 ? (
                    <div className="overflow-y-auto h-[calc(100vh-240px)] pb-20">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[70%]">Filename</TableHead>
                            <TableHead className="w-[30%]">Size</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFiles.map((file, index) => (
                            <TableRow 
                              key={index}
                              className={`cursor-pointer ${selectedFile?.name === file.name ? 'bg-red-100' : ''}`}
                              onClick={() => setSelectedFile(file)}
                            >
                              <TableCell className="font-medium truncate max-w-[250px]" title={file.name}>
                                {file.name}
                              </TableCell>
                              <TableCell>{formatFileSize(file.size)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">
                      {fileSystem.files.length === 0 ? 'No files available' : 'No matching files'}
                    </p>
                  )}
                  
                  {/* Bottom action area with delete button */}
                  <div className="absolute bottom-0 left-0 right-0 px-6 py-3 bg-[#f5efe9] border-t border-gray-200 z-10 w-full">
                    {selectedFile && (
                      <div className="flex justify-between items-center bg-white p-3 rounded shadow-md">
                        <div className="truncate max-w-[70%] font-medium" title={selectedFile.name}>
                          {selectedFile.name}
                        </div>
                        <div className="flex space-x-3">
                          <Button 
                            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
                            onClick={() => setShowDeleteConfirmation(true)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Delete Confirmation Dialog */}
            {showDeleteConfirmation && selectedFile && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
                  <p className="mb-6">
                    Are you sure you want to delete the file: <span className="font-bold">{selectedFile.name}</span>?
                    <br/>
        This action cannot be undone.
      </p>
      <div className="flex justify-end space-x-3">
        <Button 
          variant="outline" 
          onClick={() => setShowDeleteConfirmation(false)}
        >
          Cancel
        </Button>
        <Button 
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={() => deleteFile(fileSystem.fsName, selectedFile.name)}
        >
          Confirm Delete
        </Button>
      </div>
    </div>
  </div>
)}

            {/* WiFi Configuration Sheet */}
            <Sheet open={wifiConfigOpen} onOpenChange={setWifiConfigOpen}>
              <SheetContent side="right" className="w-[40%] bg-[#f5efe9] flex flex-col">
                <SheetHeader className="px-6 pt-6 flex-shrink-0">
                  <SheetTitle className="flex items-center gap-2">
                    <Wifi size={20} />
                    Network Configuration
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <div className="space-y-6">
                  {wifiConfigLoading ? (
                    <div className="text-center py-8">
                      <p>Loading network configuration...</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Network mode:
                        </label>
                        <div className="flex gap-6 p-4 bg-gray-50 rounded-lg">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="wifiMode"
                              value="yes"
                              checked={wifiConfig.wifi === 'yes'}
                              onChange={(e) => setWifiConfig(prev => ({ ...prev, wifi: e.target.value }))}
                              className="mr-3 w-4 h-4"
                            />
                            <span className="text-sm font-medium">Client Mode</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="wifiMode"
                              value="ap"
                              checked={wifiConfig.wifi === 'ap'}
                              onChange={(e) => setWifiConfig(prev => ({ ...prev, wifi: e.target.value }))}
                              className="mr-3 w-4 h-4"
                            />
                            <span className="text-sm font-medium">Access Point</span>
                          </label>
                        </div>
                      </div>
                      
                      {wifiConfig.wifi === 'yes' && (
                        <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Network SSID
                            </label>
                            <Input
                              value={wifiConfig.WiFiSSID}
                              onChange={(e) => setWifiConfig(prev => ({ ...prev, WiFiSSID: e.target.value }))}
                              placeholder="Enter WiFi network name"
                              className="w-full"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Network Password
                            </label>
                            <Input
                              type="password"
                              value={wifiConfig.WiFiPW}
                              onChange={(e) => setWifiConfig(prev => ({ ...prev, WiFiPW: e.target.value }))}
                              placeholder="Enter WiFi password"
                              className="w-full"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Device Hostname
                            </label>
                            <Input
                              value={wifiConfig.WiFiHostname}
                              onChange={(e) => setWifiConfig(prev => ({ ...prev, WiFiHostname: e.target.value }))}
                              placeholder="Enter device hostname (optional)"
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-4 border-t border-gray-300">
                        <div className="flex gap-3">
                          <Button 
                            onClick={saveWifiConfig}
                            disabled={wifiConfigLoading || (wifiConfig.wifi === 'yes' && !wifiConfig.WiFiSSID)}
                            className={`flex-1 ${
                              wifiConfig.wifi === 'ap' || (wifiConfig.wifi === 'yes' && wifiConfig.WiFiSSID)
                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg ring-2 ring-green-300'
                                : 'bg-gray-400 text-gray-200'
                            }`}
                          >
                            Save Config
                          </Button>
                          <Button 
                            onClick={deleteWifiConfig}
                            disabled={wifiConfigLoading || !wifiFileExists}
                            className={`flex-1 ${
                              wifiFileExists
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg ring-2 ring-red-300'
                                : 'bg-gray-400 text-gray-200'
                            }`}
                          >
                            Delete Config
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 leading-relaxed">
                          <strong>Network Modes:</strong><br/>
                          • <strong>Client Mode:</strong> Connect to existing WiFi network<br/>
                          • <strong>Access Point:</strong> Device creates its own WiFi network<br/><br/>
                          <strong>Note:</strong> Changes will be saved to the .network file on the SD card. 
                          The device will need to be restarted to apply new network settings.
                        </p>
                      </div>
                    </>
                  )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

</Tabs>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button className="bg-[#0047AB] hover:bg-[#4169E1] h-16">Patterns</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[40%] bg-[#f5efe9]">
            <SheetHeader>
              <SheetTitle>File Manager</SheetTitle>
            </SheetHeader>
            
            <div className="mt-0 space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search files..."
                  className="pl-8"
                  value={fileSearch}
                  onChange={e => setFileSearch(e.target.value)}
                />
                <div className="absolute right-2 top-2.5 text-xs text-gray-500">
                  {filteredFiles.length}/{fileSystem.files.length}
                </div>
              </div>
              
              <Button 
                onClick={fetchFileList}
                className="bg-[#5c4033] hover:bg-[#4a3328] w-full"
              >
                Refresh File List
              </Button>
              
              {filteredFiles.length > 0 ? (
                <div className="overflow-y-auto h-[calc(100vh-240px)] pb-20">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70%]">Filename</TableHead>
                        <TableHead className="w-[30%]">Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file, index) => (
                        <TableRow 
                          key={index}
                          className={`cursor-pointer ${selectedFile?.name === file.name ? 'bg-blue-100' : ''}`}
                          onClick={() => setSelectedFile(file)}
                        >
                          <TableCell className="font-medium truncate max-w-[250px]" title={file.name}>
                            {file.name}
                          </TableCell>
                          <TableCell>{formatFileSize(file.size)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">
                  {fileSystem.files.length === 0 ? 'No files available' : 'No matching files'}
                </p>
              )}
              
              {/* File action controls at bottom of sheet */}
              <div className="absolute bottom-0 left-0 right-0 px-6 py-3 bg-[#f5efe9] border-t border-gray-200 z-10 w-full">
                {selectedFile && (
                  <div className="flex justify-between items-center bg-white p-3 rounded shadow-md">
                    <div className="truncate max-w-[60%] font-medium" title={selectedFile.name}>
                      {selectedFile.name}
                    </div>
                    <div className="flex space-x-3">
                      {/* Only show Preview button for .thr files */}
                      {selectedFile.name.toLowerCase().endsWith('.thr') && (
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-1"
                          onClick={() => previewFile(fileSystem.fsName, selectedFile.name)}
                        >
                          <Eye size={16} />
                          Preview
                        </Button>
                      )}
                      {/* Show Preview button for .seq files */}
                      {selectedFile.name.toLowerCase().endsWith('.seq') && (
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-1"
                          onClick={() => window.open(`http://${robotName}/files/${fileSystem.fsName}/${selectedFile.name}`, '_blank')}
                        >
                          <Eye size={16} />
                          Preview
                        </Button>
                      )}
                      <Button 
                        className="bg-[#5c4033] hover:bg-[#4a3328] flex items-center gap-1"
                        onClick={() => playFile(fileSystem.fsName, selectedFile.name)}
                      >
                        <Play size={16} />
                        Play
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
