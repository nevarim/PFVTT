// Application state management
const AppState = {
    currentTool: 'select',
    zoomLevel: 1,
    draggedToken: null,
    tokenCounter: 1,
    isDragging: false,
    showingMeasurement: false,
    measurementLine: null,
    measurementText: null,
    measurementContainer: null,
    currentToken: null,
    isPanning: false,
    panData: {
        startX: 0,
        startY: 0,
        startScrollX: 0,
        startScrollY: 0
    },
    
    // Constants
    GRID_SIZE: 50,
    METERS_PER_CELL: 1.5,
    MIN_ZOOM: 0.3,
    MAX_ZOOM: 3,
    ZOOM_FACTOR: 1.2
};

// Utility functions
const Utils = {
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
    
    sanitizeInput: (input) => {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/<[^>]*>/g, ''); // Basic XSS protection
    },
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    snapToGrid: (value) => {
        return Math.round(value / AppState.GRID_SIZE) * AppState.GRID_SIZE;
    },
    
    getGridPosition: (x, y) => {
        return {
            x: Math.floor(x / AppState.GRID_SIZE),
            y: Math.floor(y / AppState.GRID_SIZE)
        };
    },
    
    calculateDistance: (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);
        const cellDistance = pixelDistance / AppState.GRID_SIZE;
        const meterDistance = cellDistance * AppState.METERS_PER_CELL;
        return {
            pixels: pixelDistance,
            cells: cellDistance,
            meters: meterDistance
        };
    }
};

// Tool management
const ToolManager = {
    setActiveTool: (toolName) => {
        // Remove active class from all tools
        document.querySelectorAll('.tool-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected tool
        const toolButton = document.getElementById(toolName + '-tool');
        if (toolButton) {
            toolButton.classList.add('active');
        }
        
        // Update app state
        AppState.currentTool = toolName;
        
        // Clear any active measurements
        MeasurementTool.clearMeasurement();
        
        // Update cursor based on tool
        const canvas = document.getElementById('game-canvas');
        switch (toolName) {
            case 'pan':
                canvas.style.cursor = 'grab';
                break;
            case 'measure':
                canvas.style.cursor = 'crosshair';
                break;
            case 'draw':
                canvas.style.cursor = 'crosshair';
                break;
            case 'text':
                canvas.style.cursor = 'text';
                break;
            default:
                canvas.style.cursor = 'default';
        }
    }
};

// Zoom management
const ZoomManager = {
    updateZoom: (newZoom) => {
        AppState.zoomLevel = Utils.clamp(newZoom, AppState.MIN_ZOOM, AppState.MAX_ZOOM);
        
        const canvas = document.getElementById('game-canvas');
        canvas.style.transform = `scale(${AppState.zoomLevel})`;
        canvas.style.transformOrigin = '0 0';
        
        // Update zoom display
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(AppState.zoomLevel * 100) + '%';
        }
    }
};

// Measurement tool
const MeasurementTool = {
    startMeasurement: (x, y) => {
        if (AppState.currentTool !== 'measure') return;
        
        AppState.showingMeasurement = true;
        
        // Create measurement container if it doesn't exist
        if (!AppState.measurementContainer) {
            AppState.measurementContainer = document.createElement('div');
            AppState.measurementContainer.style.position = 'absolute';
            AppState.measurementContainer.style.pointerEvents = 'none';
            AppState.measurementContainer.style.zIndex = '1000';
            document.getElementById('game-canvas').appendChild(AppState.measurementContainer);
        }
        
        // Create line element
        AppState.measurementLine = document.createElement('div');
        AppState.measurementLine.style.position = 'absolute';
        AppState.measurementLine.style.background = '#ff0000';
        AppState.measurementLine.style.height = '2px';
        AppState.measurementLine.style.transformOrigin = '0 0';
        AppState.measurementLine.style.left = x + 'px';
        AppState.measurementLine.style.top = y + 'px';
        AppState.measurementContainer.appendChild(AppState.measurementLine);
        
        // Create text element
        AppState.measurementText = document.createElement('div');
        AppState.measurementText.style.position = 'absolute';
        AppState.measurementText.style.background = 'rgba(0, 0, 0, 0.8)';
        AppState.measurementText.style.color = '#fff';
        AppState.measurementText.style.padding = '4px 8px';
        AppState.measurementText.style.borderRadius = '4px';
        AppState.measurementText.style.fontSize = '12px';
        AppState.measurementText.style.whiteSpace = 'nowrap';
        AppState.measurementContainer.appendChild(AppState.measurementText);
        
        AppState.measurementStartX = x;
        AppState.measurementStartY = y;
    },
    
    updateMeasurement: (x, y) => {
        if (!AppState.showingMeasurement || !AppState.measurementLine) return;
        
        const dx = x - AppState.measurementStartX;
        const dy = y - AppState.measurementStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Update line
        AppState.measurementLine.style.width = distance + 'px';
        AppState.measurementLine.style.transform = `rotate(${angle}deg)`;
        
        // Calculate distances
        const distanceData = Utils.calculateDistance(
            AppState.measurementStartX, AppState.measurementStartY, x, y
        );
        
        // Update text
        AppState.measurementText.textContent = 
            `${distanceData.cells.toFixed(1)} cells (${distanceData.meters.toFixed(1)}m)`;
        AppState.measurementText.style.left = (x + 10) + 'px';
        AppState.measurementText.style.top = (y - 25) + 'px';
    },
    
    clearMeasurement: () => {
        if (AppState.measurementContainer) {
            AppState.measurementContainer.innerHTML = '';
        }
        AppState.showingMeasurement = false;
        AppState.measurementLine = null;
        AppState.measurementText = null;
    }
};

// Token management
const TokenManager = {
    createToken: (type, x, y, content = '') => {
        const token = document.createElement('div');
        token.className = `token ${type}`;
        token.style.left = Utils.snapToGrid(x) + 'px';
        token.style.top = Utils.snapToGrid(y) + 'px';
        token.textContent = content || type.charAt(0).toUpperCase();
        token.id = `token-${AppState.tokenCounter++}`;
        
        // Add event listeners
        token.addEventListener('mousedown', TokenManager.handleTokenMouseDown);
        token.addEventListener('contextmenu', TokenManager.handleTokenRightClick);
        
        document.getElementById('game-canvas').appendChild(token);
        return token;
    },
    
    handleTokenMouseDown: (e) => {
        if (AppState.currentTool !== 'select') return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const token = e.target;
        AppState.currentToken = token;
        AppState.isDragging = true;
        
        // Add start cell highlight
        TokenManager.addStartCellHighlight(token);
        
        const rect = token.getBoundingClientRect();
        const canvasRect = document.getElementById('game-canvas').getBoundingClientRect();
        
        AppState.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        document.addEventListener('mousemove', TokenManager.handleTokenDrag);
        document.addEventListener('mouseup', TokenManager.handleTokenDragEnd);
    },
    
    handleTokenDrag: (e) => {
        if (!AppState.isDragging || !AppState.currentToken) return;
        
        const canvasArea = document.getElementById('canvas-area');
        const canvasAreaRect = canvasArea.getBoundingClientRect();
        
        // Calculate position accounting for scroll and zoom
        const x = ((e.clientX - canvasAreaRect.left + canvasArea.scrollLeft) / AppState.zoomLevel) - AppState.dragOffset.x;
        const y = ((e.clientY - canvasAreaRect.top + canvasArea.scrollTop) / AppState.zoomLevel) - AppState.dragOffset.y;
        
        AppState.currentToken.style.left = Utils.snapToGrid(x) + 'px';
        AppState.currentToken.style.top = Utils.snapToGrid(y) + 'px';
    },
    
    handleTokenDragEnd: (e) => {
        if (AppState.isDragging) {
            AppState.isDragging = false;
            TokenManager.removeStartCellHighlight();
            
            document.removeEventListener('mousemove', TokenManager.handleTokenDrag);
            document.removeEventListener('mouseup', TokenManager.handleTokenDragEnd);
            
            AppState.currentToken = null;
        }
    },
    
    handleTokenRightClick: (e) => {
        e.preventDefault();
        // TODO: Show context menu for token options
        console.log('Token right-clicked:', e.target.id);
    },
    
    addStartCellHighlight: (token) => {
        const highlight = document.createElement('div');
        highlight.className = 'start-cell-highlight';
        highlight.id = 'start-cell-highlight';
        highlight.style.left = token.style.left;
        highlight.style.top = token.style.top;
        document.getElementById('game-canvas').appendChild(highlight);
    },
    
    removeStartCellHighlight: () => {
        const highlight = document.getElementById('start-cell-highlight');
        if (highlight) {
            highlight.remove();
        }
    }
};

// Pan tool
const PanTool = {
    startPan: (e) => {
        if (AppState.currentTool !== 'pan') return;
        
        AppState.isPanning = true;
        const canvasArea = document.getElementById('canvas-area');
        
        AppState.panData.startX = e.clientX;
        AppState.panData.startY = e.clientY;
        AppState.panData.startScrollX = canvasArea.scrollLeft;
        AppState.panData.startScrollY = canvasArea.scrollTop;
        
        document.getElementById('game-canvas').style.cursor = 'grabbing';
        
        document.addEventListener('mousemove', PanTool.handlePan);
        document.addEventListener('mouseup', PanTool.endPan);
    },
    
    handlePan: (e) => {
        if (!AppState.isPanning) return;
        
        const canvasArea = document.getElementById('canvas-area');
        const deltaX = AppState.panData.startX - e.clientX;
        const deltaY = AppState.panData.startY - e.clientY;
        
        canvasArea.scrollLeft = AppState.panData.startScrollX + deltaX;
        canvasArea.scrollTop = AppState.panData.startScrollY + deltaY;
    },
    
    endPan: () => {
        AppState.isPanning = false;
        document.getElementById('game-canvas').style.cursor = 'grab';
        
        document.removeEventListener('mousemove', PanTool.handlePan);
        document.removeEventListener('mouseup', PanTool.endPan);
    }
};

// Panel management
function showPanel(panelName) {
    // Hide all panels
    document.querySelectorAll('.token-library, .chat-panel, .journal-panel').forEach(panel => {
        panel.style.display = 'none';
        panel.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected panel
    const targetPanel = document.getElementById(panelName + '-panel');
    if (targetPanel) {
        targetPanel.style.display = panelName === 'chat' ? 'flex' : 'block';
        targetPanel.classList.add('active');
    }
    
    // Add active class to clicked tab
    event.target.classList.add('active');
}

// Chat functionality
function sendMessage() {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    
    const message = Utils.sanitizeInput(input.value);
    if (!message.trim()) return;
    
    const messageElement = document.createElement('div');
    messageElement.style.marginBottom = '8px';
    messageElement.innerHTML = `<strong>You:</strong> ${message}`;
    
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
    
    input.value = '';
}

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Map selector functionality
function toggleGameMapSelector() {
    const selector = document.getElementById('gameMapSelector');
    const isVisible = selector.style.top === '10px';
    
    if (isVisible) {
        selector.style.top = '-300px';
    } else {
        selector.style.top = '10px';
    }
}

function createNewMap() {
    const mapName = prompt('Enter map name:');
    if (mapName) {
        console.log('Creating new map:', mapName);
        // TODO: Implement map creation
    }
}

function switchToMap(mapId) {
    console.log('Switching to map:', mapId);
    // TODO: Implement map switching
}

// Zoom functions
function zoomIn() {
    ZoomManager.updateZoom(AppState.zoomLevel * AppState.ZOOM_FACTOR);
}

function zoomOut() {
    ZoomManager.updateZoom(AppState.zoomLevel / AppState.ZOOM_FACTOR);
}

function resetZoom() {
    ZoomManager.updateZoom(1);
}

// Event listeners setup
document.addEventListener('DOMContentLoaded', () => {
    // Tool button event listeners
    document.querySelectorAll('.tool-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const toolName = e.target.closest('.tool-button').id.replace('-tool', '');
            ToolManager.setActiveTool(toolName);
        });
    });
    
    // Canvas event listeners
    const canvas = document.getElementById('game-canvas');
    
    canvas.addEventListener('mousedown', (e) => {
        const canvasArea = document.getElementById('canvas-area');
        const canvasAreaRect = canvasArea.getBoundingClientRect();
        
        // Calculate position accounting for scroll and zoom
        const x = ((e.clientX - canvasAreaRect.left + canvasArea.scrollLeft) / AppState.zoomLevel);
        const y = ((e.clientY - canvasAreaRect.top + canvasArea.scrollTop) / AppState.zoomLevel);
        
        switch (AppState.currentTool) {
            case 'measure':
                MeasurementTool.startMeasurement(x, y);
                break;
            case 'pan':
                PanTool.startPan(e);
                break;
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (AppState.currentTool === 'measure' && AppState.showingMeasurement) {
            const canvasArea = document.getElementById('canvas-area');
            const canvasAreaRect = canvasArea.getBoundingClientRect();
            
            // Calculate position accounting for scroll and zoom
            const x = ((e.clientX - canvasAreaRect.left + canvasArea.scrollLeft) / AppState.zoomLevel);
            const y = ((e.clientY - canvasAreaRect.top + canvasArea.scrollTop) / AppState.zoomLevel);
            MeasurementTool.updateMeasurement(x, y);
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        if (AppState.currentTool === 'measure') {
            MeasurementTool.clearMeasurement();
        }
    });
    
    // Library token drag and drop
    document.querySelectorAll('.library-token').forEach(token => {
        token.addEventListener('dragstart', (e) => {
            AppState.draggedToken = {
                type: e.target.dataset.type,
                content: e.target.textContent
            };
        });
    });
    
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (AppState.draggedToken) {
            const canvasArea = document.getElementById('canvas-area');
            const canvasAreaRect = canvasArea.getBoundingClientRect();
            
            // Calculate position accounting for scroll and zoom
            const x = ((e.clientX - canvasAreaRect.left + canvasArea.scrollLeft) / AppState.zoomLevel);
            const y = ((e.clientY - canvasAreaRect.top + canvasArea.scrollTop) / AppState.zoomLevel);
            
            TokenManager.createToken(
                AppState.draggedToken.type,
                x - 24, // Center the token
                y - 24,
                AppState.draggedToken.content
            );
            
            AppState.draggedToken = null;
        }
    });
    
    // Zoom with mouse wheel
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    });
    
    // Initialize zoom display
    ZoomManager.updateZoom(1);
});
