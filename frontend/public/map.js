// Variabili globali
let currentCampaignId = sessionStorage.getItem('current_campaign_id') || localStorage.getItem('current_campaign_id') || '2';
let currentMapId = sessionStorage.getItem('current_map_id') || localStorage.getItem('current_map_id') || '19'; // Default map ID per test

// Gestione sistema di tab e strumenti
document.addEventListener('DOMContentLoaded', function() {
    // Verifica campaign ID
    const urlParams = new URLSearchParams(window.location.search);
    const campaignIdFromUrl = urlParams.get('campaign_id');
    const campaignIdFromStorage = localStorage.getItem('current_campaign_id') || sessionStorage.getItem('current_campaign_id');
    
    if (campaignIdFromUrl) {
        currentCampaignId = parseInt(campaignIdFromUrl);
        localStorage.setItem('current_campaign_id', campaignIdFromUrl);
    } else if (campaignIdFromStorage) {
        currentCampaignId = parseInt(campaignIdFromStorage);
    } else {
        console.error('No campaign ID found in storage, redirecting to campaigns page');
        window.location.href = '/campaigns';
        return;
    }
    
    initializeTabs();
    initializeToolbar();
    initializeZoomControls();
    initializeDrawingControls();
    initializeLightingControls();
    initializeGridControls();
    initializePanelControls();
    // initializeAssetManagement() viene già chiamato in initializePanelControls()
    
    // Inizializzazione zoom display
    const zoomDisplay = document.getElementById('zoomDisplayVertical');
    if (zoomDisplay) {
        zoomDisplay.textContent = `${zoomLevel}%`;
    }
    
    console.log('Interfaccia toolbar inizializzata');
});

// Variabili globali
let currentTool = 'select';
let currentLayer = 'token';
let zoomLevel = 100;
let currentTab = 'tools';

// Variabili per drag and drop
let draggedAsset = null;
let isDragging = false;
let currentToken = null;
let startX = 0;
let startY = 0;

// Variabili per zoom e pan
let scale = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let lastPanPoint = { x: 0, y: 0 };

// Inizializzazione sistema di tab
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
     });
}

// Cambio tab
function switchTab(tabId) {
    // Rimuovi classe active da tutti i tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Rimuovi classe active da tutti i tab panel
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Aggiungi classe active al tab button selezionato
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Aggiungi classe active al tab panel selezionato
    const activePanel = document.getElementById(`${tabId}-panel`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
    
    currentTab = tabId;
}

// Inizializzazione toolbar strumenti
function initializeToolbar() {
    const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
    const layerButtons = document.querySelectorAll('.tool-btn[data-layer]');
    
    // Gestione strumenti
    toolButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tool = this.getAttribute('data-tool');
            selectTool(tool, this);
        });
    });
    
    // Gestione layer
    layerButtons.forEach(button => {
        button.addEventListener('click', function() {
            const layer = this.getAttribute('data-layer');
            selectLayer(layer, this);
        });
    });
    
    // Inizializza toggle toolbar
    initializeToolbarToggle();
    
    // Inizializza gestione espansioni gruppi
    initializeGroupExpansions();
}

// Gestione espansioni gruppi
function initializeGroupExpansions() {
    const expandedButtons = document.querySelectorAll('.tool-group-expanded .tool-btn');
    
    expandedButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tool = this.getAttribute('data-tool');
            const layer = this.getAttribute('data-layer');
            
            if (tool) {
                selectTool(tool, this);
            } else if (layer) {
                selectLayer(layer, this);
            }
        });
    });
}

// Inizializzazione toggle toolbar
function initializeToolbarToggle() {
    const toolbar = document.getElementById('leftToolbar');
    const toggleBtn = document.getElementById('toolbarToggle');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (toggleBtn && toolbar) {
        toggleBtn.addEventListener('click', function() {
            toolbar.classList.toggle('expanded');
            
            // Aggiorna l'icona
            if (toolbar.classList.contains('expanded')) {
                toggleIcon.className = 'fas fa-chevron-left';
            } else {
                toggleIcon.className = 'fas fa-chevron-right';
            }
        });
    }
}

// Selezione strumento
function selectTool(tool, buttonElement) {
    // Gestione speciale per azioni immediate
    if (tool === 'clear-tokens') {
        // Chiama la funzione per eliminare tutti i token
        if (typeof clearAllTokens === 'function') {
            clearAllTokens();
        } else {
            console.error('clearAllTokens function not found');
        }
        return; // Non cambiare lo strumento attivo
    }
    
    // Rimuovi classe active da tutti i bottoni strumento (esclusi layer)
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Aggiungi classe active a tutti i bottoni con lo stesso strumento
    document.querySelectorAll(`[data-tool="${tool}"]`).forEach(btn => {
        btn.classList.add('active');
    });
    
    currentTool = tool;
    
    // Cambia il cursore in base allo strumento
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
        switch(tool) {
            case 'select':
                gameCanvas.style.cursor = 'default';
                break;
            case 'pan':
                gameCanvas.style.cursor = 'grab';
                break;
            case 'freehand':
            case 'shapes':
            case 'polygon':
            case 'text':
                gameCanvas.style.cursor = 'crosshair';
                break;
            case 'zoom':
                gameCanvas.style.cursor = 'zoom-in';
                break;
            case 'ruler':
                gameCanvas.style.cursor = 'crosshair';
                break;
            case 'eraser':
                gameCanvas.style.cursor = 'crosshair';
                break;
            default:
                gameCanvas.style.cursor = 'default';
        }
    }
    
    console.log(`Strumento selezionato: ${tool}`);
}

// Selezione layer
function selectLayer(layer, buttonElement) {
    // Rimuovi classe active da tutti i bottoni layer
    document.querySelectorAll('.tool-btn[data-layer]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Aggiungi classe active a tutti i bottoni con lo stesso layer
    document.querySelectorAll(`[data-layer="${layer}"]`).forEach(btn => {
        btn.classList.add('active');
    });
    
    // Imposta il layer corrente
    currentLayer = layer;
    
    console.log(`Layer selezionato: ${layer}`);
}

// Inizializzazione controlli zoom
function initializeZoomControls() {
    const zoomInBtn = document.getElementById('zoomInVertical');
    const zoomOutBtn = document.getElementById('zoomOutVertical');
    const zoomResetBtn = document.getElementById('zoomResetVertical');
    const zoomSlider = document.getElementById('zoomSlider');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            scale = Math.min(4, scale * 1.2);
            updateCanvasTransform();
            updateZoomDisplay();
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            scale = Math.max(0.25, scale / 1.2);
            updateCanvasTransform();
            updateZoomDisplay();
        });
    }
    
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', function() {
            scale = 1;
            panX = 0;
            panY = 0;
            updateCanvasTransform();
            updateZoomDisplay();
        });
    }
    
    if (zoomSlider) {
        zoomSlider.addEventListener('input', function() {
            const newScale = parseInt(this.value) / 100;
            scale = Math.max(0.25, Math.min(4, newScale));
            updateCanvasTransform();
            updateZoomDisplay();
        });
    }
    
    // Inizializza pulsante Back to Campaign
    const backBtn = document.getElementById('backToCampaign');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = '/campaigns';
        });
    }
}

// Aggiornamento zoom (legacy - mantenuto per compatibilità)
function updateZoom() {
    const zoomDisplay = document.getElementById('zoomDisplayVertical');
    const zoomSlider = document.getElementById('zoomSlider');
    
    if (zoomDisplay) {
        zoomDisplay.textContent = `${zoomLevel}%`;
    }
    
    if (zoomSlider) {
        zoomSlider.value = zoomLevel;
    }
    
    // Usa le nuove funzioni
    scale = zoomLevel / 100;
    updateCanvasTransform();
    
    console.log(`Zoom aggiornato: ${zoomLevel}%`);
}

// Inizializzazione controlli disegno
function initializeDrawingControls() {
    const drawColor = document.getElementById('drawColor');
    const brushSize = document.getElementById('brushSize');
    const brushSizeDisplay = document.getElementById('brushSizeDisplay');
    
    if (drawColor) {
        drawColor.addEventListener('change', function() {
            console.log(`Colore disegno cambiato: ${this.value}`);
        });
    }
    
    if (brushSize && brushSizeDisplay) {
        brushSize.addEventListener('input', function() {
            brushSizeDisplay.textContent = `${this.value}px`;
            console.log(`Dimensione pennello: ${this.value}px`);
        });
    }
}

// Inizializzazione controlli illuminazione
function initializeLightingControls() {
    const lightRadius = document.getElementById('lightRadius');
    const lightRadiusDisplay = document.getElementById('lightRadiusDisplay');
    const lightIntensity = document.getElementById('lightIntensity');
    const lightIntensityDisplay = document.getElementById('lightIntensityDisplay');
    
    if (lightRadius && lightRadiusDisplay) {
        lightRadius.addEventListener('input', function() {
            lightRadiusDisplay.textContent = `${this.value}ft`;
            console.log(`Raggio luce: ${this.value}ft`);
        });
    }
    
    if (lightIntensity && lightIntensityDisplay) {
        lightIntensity.addEventListener('input', function() {
            lightIntensityDisplay.textContent = `${this.value}%`;
            console.log(`Intensità luce: ${this.value}%`);
        });
    }
}

// Inizializzazione controlli griglia
function initializeGridControls() {
    const toggleGrid = document.getElementById('toggleGrid');
    const gridSize = document.getElementById('gridSize');
    const gridSizeDisplay = document.getElementById('gridSizeDisplay');
    const toggleSnap = document.getElementById('toggleSnap');
    
    let gridVisible = true;
    let snapEnabled = false;
    
    if (toggleGrid) {
        toggleGrid.addEventListener('click', function() {
            gridVisible = !gridVisible;
            this.classList.toggle('active', gridVisible);
            console.log(`Griglia ${gridVisible ? 'mostrata' : 'nascosta'}`);
        });
    }
    
    if (gridSize && gridSizeDisplay) {
        gridSize.addEventListener('input', function() {
            gridSizeDisplay.textContent = `${this.value}px`;
            console.log(`Dimensione griglia: ${this.value}px`);
        });
    }
    
    if (toggleSnap) {
        toggleSnap.addEventListener('click', function() {
            snapEnabled = !snapEnabled;
            this.classList.toggle('active', snapEnabled);
            console.log(`Snap alla griglia ${snapEnabled ? 'abilitato' : 'disabilitato'}`);
        });
    }
}

// Inizializzazione controlli pannelli
function initializePanelControls() {
    const toggleLayers = document.getElementById('toggleLayers');
    const toggleAudio = document.getElementById('toggleAudio');
    const layersPanel = document.getElementById('layersPanel');
    const audioPanel = document.getElementById('audioPanel');
    const closeLayersPanel = document.getElementById('closeLayersPanel');
    const closeAudioPanel = document.getElementById('closeAudioPanel');
    
    if (toggleLayers && layersPanel) {
        toggleLayers.addEventListener('click', function() {
            const isVisible = layersPanel.style.display !== 'none';
            layersPanel.style.display = isVisible ? 'none' : 'block';
            this.classList.toggle('active', !isVisible);
        });
    }
    
    if (toggleAudio && audioPanel) {
        toggleAudio.addEventListener('click', function() {
            const isVisible = audioPanel.style.display !== 'none';
            audioPanel.style.display = isVisible ? 'none' : 'block';
            this.classList.toggle('active', !isVisible);
        });
    }
    
    if (closeLayersPanel && layersPanel) {
        closeLayersPanel.addEventListener('click', function() {
            layersPanel.style.display = 'none';
            const toggleBtn = document.getElementById('toggleLayers');
            if (toggleBtn) toggleBtn.classList.remove('active');
        });
    }
    
    if (closeAudioPanel && audioPanel) {
        closeAudioPanel.addEventListener('click', function() {
            audioPanel.style.display = 'none';
            const toggleBtn = document.getElementById('toggleAudio');
            if (toggleBtn) toggleBtn.classList.remove('active');
        });
    }
    
    // Gestione elementi layer
    const layerItems = document.querySelectorAll('.layer-item');
    layerItems.forEach(item => {
        const checkbox = item.querySelector('.layer-visible');
        const lockBtn = item.querySelector('.layer-lock');
        
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                console.log(`Layer ${item.textContent.trim()} visibility: ${this.checked}`);
            });
        }
        
        if (lockBtn) {
            lockBtn.addEventListener('click', function() {
                this.classList.toggle('locked');
                const icon = this.querySelector('i');
                if (this.classList.contains('locked')) {
                    icon.className = 'fas fa-lock';
                } else {
                    icon.className = 'fas fa-unlock';
                }
                console.log(`Layer ${item.textContent.trim()} locked: ${this.classList.contains('locked')}`);
            });
        }
        
        item.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox' && !e.target.closest('.layer-lock')) {
                layerItems.forEach(li => li.classList.remove('selected'));
                this.classList.add('selected');
                console.log(`Selected layer: ${this.textContent.trim()}`);
            }
        });
    });
    
    // Gestione controlli audio
    const playBtns = document.querySelectorAll('.play-btn');
    const volumeSliders = document.querySelectorAll('.volume-slider');
    const masterVolumeSlider = document.getElementById('masterVolume');
    const masterVolumeDisplay = document.getElementById('masterVolumeDisplay');
    
    playBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            if (icon.classList.contains('fa-play')) {
                icon.className = 'fas fa-pause';
                console.log('Playing audio');
            } else {
                icon.className = 'fas fa-play';
                console.log('Pausing audio');
            }
        });
    });
    
    volumeSliders.forEach(slider => {
        const display = slider.nextElementSibling;
        slider.addEventListener('input', function() {
            if (display) {
                display.textContent = this.value + '%';
            }
            console.log(`Volume set to: ${this.value}%`);
        });
    });
    
    if (masterVolumeSlider && masterVolumeDisplay) {
        masterVolumeSlider.addEventListener('input', function() {
            masterVolumeDisplay.textContent = this.value + '%';
            console.log(`Master volume set to: ${this.value}%`);
        });
    }
    
    // Gestione effetti sonori
    const soundEffects = document.querySelectorAll('.sound-effect');
    soundEffects.forEach(effect => {
        effect.addEventListener('click', function() {
            console.log(`Playing sound effect: ${this.textContent}`);
            // Qui si può aggiungere la logica per riprodurre l'effetto sonoro
        });
    });
    
    // === GESTIONE SIDEBAR ROLL20 ===
    
    // Gestione tab della sidebar
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    sidebarTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Rimuovi classe active da tutti i tab
            sidebarTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Aggiungi classe active al tab selezionato
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            console.log(`Switched to tab: ${targetTab}`);
        });
    });
    
    // Gestione Asset categories
    const assetCategories = document.querySelectorAll('.category-btn');
    assetCategories.forEach(category => {
        category.addEventListener('click', function() {
            assetCategories.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const categoryType = this.getAttribute('data-category');
            console.log(`Asset category selected: ${categoryType}`);
            filterAssetsByCategory(categoryType);
        });
    });
    
    // Inizializza gestione asset
    initializeAssetManagement();
    
    // Gestione Journal categories
    const journalCategories = document.querySelectorAll('.journal-category');
    journalCategories.forEach(category => {
        category.addEventListener('click', function() {
            journalCategories.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const categoryType = this.getAttribute('data-category');
            console.log(`Journal category selected: ${categoryType}`);
            // Qui si può filtrare il contenuto del journal
        });
    });
    
    // Gestione Compendium categories
    const compendiumCategories = document.querySelectorAll('.compendium-category');
    compendiumCategories.forEach(category => {
        category.addEventListener('click', function() {
            compendiumCategories.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const categoryType = this.getAttribute('data-category');
            console.log(`Compendium category selected: ${categoryType}`);
            // Qui si può filtrare il contenuto del compendium
        });
    });
    
    // Gestione drag and drop per art items
    const artItems = document.querySelectorAll('.art-item');
    artItems.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            const tokenType = this.getAttribute('data-token');
            e.dataTransfer.setData('text/plain', tokenType);
            console.log(`Dragging token: ${tokenType}`);
        });
    });
    
    // Gestione controlli journal
    const journalItems = document.querySelectorAll('.journal-item');
    journalItems.forEach(item => {
        const showBtn = item.querySelector('.show-players');
        const editBtn = item.querySelector('.edit-journal');
        
        if (showBtn) {
            showBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('active');
                const itemName = item.querySelector('span').textContent;
                console.log(`Toggle show to players: ${itemName}`);
            });
        }
        
        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const itemName = item.querySelector('span').textContent;
                console.log(`Edit journal item: ${itemName}`);
            });
        }
        
        item.addEventListener('click', function() {
            journalItems.forEach(ji => ji.classList.remove('selected'));
            this.classList.add('selected');
            const itemName = this.querySelector('span').textContent;
            console.log(`Selected journal item: ${itemName}`);
        });
    });
    
    // Gestione Jukebox
    const playAllBtn = document.querySelector('.play-all-btn');
    const stopAllBtn = document.querySelector('.stop-all-btn');
    const trackPlayBtns = document.querySelectorAll('.play-track');
    const trackVolumes = document.querySelectorAll('.track-volume');
    const loopBtns = document.querySelectorAll('.loop-track');
    
    if (playAllBtn) {
        playAllBtn.addEventListener('click', function() {
            console.log('Playing all tracks');
        });
    }
    
    if (stopAllBtn) {
        stopAllBtn.addEventListener('click', function() {
            console.log('Stopping all tracks');
        });
    }
    
    trackPlayBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            const trackName = this.closest('.jukebox-track').querySelector('.track-name').textContent;
            
            if (icon.classList.contains('fa-play')) {
                icon.className = 'fas fa-pause';
                console.log(`Playing track: ${trackName}`);
            } else {
                icon.className = 'fas fa-play';
                console.log(`Pausing track: ${trackName}`);
            }
        });
    });
    
    trackVolumes.forEach(slider => {
        slider.addEventListener('input', function() {
            const trackName = this.closest('.jukebox-track').querySelector('.track-name').textContent;
            console.log(`Track ${trackName} volume: ${this.value}%`);
        });
    });
    
    loopBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            const trackName = this.closest('.jukebox-track').querySelector('.track-name').textContent;
            console.log(`Track ${trackName} loop: ${this.classList.contains('active')}`);
        });
    });
    
    // Gestione ricerca
    const searchInputs = document.querySelectorAll('#artSearch, #journalSearch, #compendiumSearch');
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tabType = this.id.replace('Search', '');
            console.log(`Searching in ${tabType}: ${searchTerm}`);
            // Qui si può implementare la logica di ricerca
        });
    });
    
    // Gestione chat
    const chatInput = document.getElementById('chatInput');
    const chatAsSelect = document.getElementById('chatAsSelect');
    const whisperBtn = document.querySelector('.whisper-btn');
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const message = this.value.trim();
                const chatAs = chatAsSelect ? chatAsSelect.value : 'player';
                
                if (message) {
                    console.log(`Sending message as ${chatAs}: ${message}`);
                    // Qui si può aggiungere il messaggio alla chat
                    this.value = '';
                }
            }
        });
    }
    
    if (whisperBtn) {
        whisperBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            console.log(`Whisper mode: ${this.classList.contains('active')}`);
        });
    }
    
    // Gestione settings
    const settingsInputs = document.querySelectorAll('.settings-section input');
    settingsInputs.forEach(input => {
        if (input.type === 'range') {
            input.addEventListener('input', function() {
                const label = this.closest('.setting-item').querySelector('label').textContent;
                console.log(`Setting ${label}: ${this.value}`);
            });
        } else if (input.type === 'checkbox') {
            input.addEventListener('change', function() {
                const label = this.closest('.setting-item').querySelector('label').textContent;
                console.log(`Setting ${label}: ${this.checked}`);
            });
        }
    });
}
;


// === GESTIONE ASSET ===

// Variabili globali per gli asset
let allAssets = [];
let filteredAssets = [];
let currentAssetCategory = 'all';

// Esponi allAssets come variabile globale per map.ejs
window.allAssets = allAssets;
// currentCampaignId è già dichiarato all'inizio del file

// Inizializzazione gestione asset
function initializeAssetManagement() {
    console.log('Inizializzazione gestione asset...');
    
    // Event listeners per i controlli
    const refreshBtn = document.getElementById('refreshAssets');
    const uploadBtn = document.getElementById('uploadAsset');
    const searchInput = document.getElementById('assetSearchInput');
    const searchBtn = document.getElementById('assetSearchBtn');
    const categorySelect = document.getElementById('assetCategorySelect');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAssets);
    }
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', showUploadDialog);
        // Disabilita inizialmente il pulsante dato che la categoria predefinita è 'all'
        uploadBtn.disabled = true;
        uploadBtn.style.opacity = '0.5';
        uploadBtn.style.cursor = 'not-allowed';
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchAssets, 300));
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchAssets);
    }
    
    // Event listener per il menu a tendina delle categorie
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            filterAssetsByCategory(this.value);
        });
    }
    
    // Carica gli asset iniziali
    loadAssets();
    
    // Inizializza gestione drop sul canvas
    initializeCanvasDrop();
    
    // Inizializza gestione pan e zoom sul canvas
    initializeCanvasPanZoom();
}

// Carica gli asset dalla campagna
async function loadAssets() {
    console.log('Caricamento asset per campagna:', currentCampaignId);
    
    const loadingEl = document.getElementById('assetLoading');
    const gridEl = document.getElementById('assetGrid');
    const emptyEl = document.getElementById('assetEmpty');
    
    // Mostra loading
    if (loadingEl) loadingEl.style.display = 'block';
    if (gridEl) gridEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
    
    try {
        const url = `/api/assets?campaign_id=${currentCampaignId}`;
        console.log(`[DEBUG] Chiamando endpoint: ${url}`);
        const response = await fetch(url);
        console.log(`[DEBUG] Response status: ${response.status}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
            allAssets = data.assets || [];
            window.allAssets = allAssets; // Sincronizza con la variabile globale
            console.log(`Caricati ${allAssets.length} asset`);
            
            // Applica il filtro corrente
            filterAssetsByCategory(currentAssetCategory);
        } else {
            console.error('Errore nel caricamento asset:', data.error);
            showAssetError('Errore nel caricamento degli asset');
        }
    } catch (error) {
        console.error('Errore nella richiesta asset:', error);
        showAssetError('Errore di connessione');
    } finally {
        // Nascondi loading
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

// Filtra gli asset per categoria
function filterAssetsByCategory(category) {
    currentAssetCategory = category;
    
    if (category === 'all') {
        filteredAssets = [...allAssets];
    } else {
        filteredAssets = allAssets.filter(asset => asset.category === category);
    }
    
    // Applica anche il filtro di ricerca se presente
    const searchTerm = document.getElementById('assetSearchInput')?.value.trim();
    if (searchTerm) {
        filteredAssets = filteredAssets.filter(asset => 
            asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }
    
    // Disabilita/abilita il pulsante "Carica Asset" in base alla categoria
    const uploadBtn = document.getElementById('uploadAsset');
    if (uploadBtn) {
        if (category === 'all') {
            uploadBtn.disabled = true;
            uploadBtn.style.opacity = '0.5';
            uploadBtn.style.cursor = 'not-allowed';
        } else {
            uploadBtn.disabled = false;
            uploadBtn.style.opacity = '1';
            uploadBtn.style.cursor = 'pointer';
        }
    }
    
    renderAssets();
}

// Cerca negli asset
function searchAssets() {
    const searchTerm = document.getElementById('assetSearchInput')?.value.trim();
    
    if (!searchTerm) {
        filterAssetsByCategory(currentAssetCategory);
        return;
    }
    
    filteredAssets = allAssets.filter(asset => {
        const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = currentAssetCategory === 'all' || asset.category === currentAssetCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    renderAssets();
}

// Renderizza gli asset nella griglia
function renderAssets() {
    const gridEl = document.getElementById('assetGrid');
    const emptyEl = document.getElementById('assetEmpty');
    
    if (!gridEl) return;
    
    if (filteredAssets.length === 0) {
        gridEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    gridEl.style.display = 'grid';
    
    gridEl.innerHTML = '';
    
    filteredAssets.forEach(asset => {
        const assetEl = createAssetElement(asset);
        gridEl.appendChild(assetEl);
    });
}

// Crea un elemento asset
function createAssetElement(asset) {
    const assetEl = document.createElement('div');
    assetEl.className = 'asset-item';
    assetEl.setAttribute('data-asset-id', asset.id);
    assetEl.setAttribute('data-asset-type', asset.category);
    assetEl.setAttribute('draggable', 'true');
    
    // Determina il tipo di preview
    let previewContent = '';
    if (asset.mime_type && asset.mime_type.startsWith('image/')) {
        previewContent = `<img src="${asset.file_url}" alt="${asset.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                         <div class="asset-fallback" style="display: none;">${asset.name.charAt(0).toUpperCase()}</div>`;
    } else {
        previewContent = `<div class="asset-fallback">${asset.name.charAt(0).toUpperCase()}</div>`;
    }
    
    assetEl.innerHTML = `
        <div class="asset-preview">
            ${previewContent}
        </div>
        <span class="asset-name" title="${asset.name}">${asset.name}</span>
        <div class="asset-actions">
            <button class="asset-action-btn" onclick="event.stopPropagation(); editAsset(${asset.id})" title="Modifica">
                <i class="fas fa-edit"></i>
            </button>
            <button class="asset-action-btn" onclick="event.stopPropagation(); deleteAsset(${asset.id})" title="Elimina">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // Aggiungi drag and drop
    assetEl.addEventListener('dragstart', function(e) {
        const dragData = {
            type: 'asset',
            assetId: asset.id,
            assetData: asset
        };
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        draggedAsset = asset;
        console.log('[DEBUG] Drag started for asset:', asset.name, 'draggedAsset set to:', draggedAsset);
    });
    
    // Aggiungi evento dragend per debug
    assetEl.addEventListener('dragend', function(e) {
        console.log('[DEBUG] Drag ended for asset:', asset.name, 'draggedAsset was:', draggedAsset);
        // Non resettare draggedAsset qui, lo faremo solo dopo un drop riuscito
    });
    
    // Aggiungi click per selezione
    assetEl.addEventListener('click', function() {
        selectAsset(asset);
    });
    
    return assetEl;
}

// Seleziona un asset
function selectAsset(asset) {
    // Rimuovi selezione precedente
    document.querySelectorAll('.asset-item.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Aggiungi selezione corrente
    const assetEl = document.querySelector(`[data-asset-id="${asset.id}"]`);
    if (assetEl) {
        assetEl.classList.add('selected');
    }
    
    console.log('Asset selezionato:', asset.name);
}

// Mostra dialog di upload
function showUploadDialog() {
    // Comportamento diverso in base alla categoria selezionata
    if (currentAssetCategory === 'tokens') {
        showTokenUploadForm();
        return;
    }
    
    // Per le altre categorie, usa l'upload normale
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    
    // Imposta i tipi di file accettati in base alla categoria
    switch (currentAssetCategory) {
        case 'audio':
            fileInput.accept = 'audio/*,.mp3,.wav,.ogg,.m4a';
            break;
        case 'backgrounds':
        case 'props':
        default:
            fileInput.accept = 'image/*,.png,.jpg,.jpeg,.gif,.webp';
            break;
    }
    
    // Aggiungi l'input al documento
    document.body.appendChild(fileInput);
    
    // Event listener per quando vengono selezionati i file
    fileInput.addEventListener('change', async function(event) {
        const files = event.target.files;
        if (files.length === 0) return;
        
        for (let file of files) {
            await uploadAssetFile(file);
        }
        
        // Rimuovi l'input dal documento
        document.body.removeChild(fileInput);
        
        // Ricarica gli asset per mostrare quelli appena caricati
        loadAssets();
    });
    
    // Simula il click sull'input file
    fileInput.click();
}

// Funzione per caricare un singolo file asset
async function uploadAssetFile(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', '1'); // TODO: get from session
        formData.append('campaign_id', currentCampaignId);
        
        // Determina il tipo di upload in base alla categoria
        let uploadType;
        switch (currentAssetCategory) {
            case 'audio':
                uploadType = 'audio';
                break;
            case 'backgrounds':
                uploadType = 'background';
                break;
            case 'props':
                uploadType = 'prop';
                break;
            default:
                uploadType = 'asset';
                break;
        }
        
        formData.append('upload_type', uploadType);
        formData.append('filename', file.name);
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Errore durante l'upload: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('File caricato con successo:', result);
        
        // Ora crea il record dell'asset nel database
        await createAssetRecord(result, file);
        
    } catch (error) {
        console.error('Errore durante l\'upload del file:', error);
        showAssetError('Errore durante il caricamento del file: ' + file.name);
    }
}

// Funzione per creare il record dell'asset nel database dopo l'upload
async function createAssetRecord(uploadResult, file) {
    try {
        const assetData = {
            campaignId: currentCampaignId,
            name: file.name.split('.')[0], // Nome senza estensione
            category: currentAssetCategory === 'all' ? 'misc' : currentAssetCategory,
            fileUrl: uploadResult.fileUrl,
            fileSize: file.size,
            mimeType: file.type,
            description: '',
            tags: []
        };
        
        const response = await fetch('/api/assets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assetData)
        });
        
        if (!response.ok) {
            throw new Error(`Errore durante la creazione del record asset: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Record asset creato con successo:', result);
        
    } catch (error) {
        console.error('Errore durante la creazione del record asset:', error);
        showAssetError('File caricato ma errore nella creazione del record: ' + error.message);
    }
}

// Modifica asset
function editAsset(assetId) {
    const asset = allAssets.find(a => a.id == assetId);
    if (asset) {
        const newName = prompt('Inserisci il nuovo nome per l\'asset:', asset.name);
        if (newName && newName.trim() !== '' && newName !== asset.name) {
            updateAssetName(assetId, newName.trim());
        }
    }
}

// Aggiorna il nome dell'asset
async function updateAssetName(assetId, newName) {
    try {
        const response = await fetch(`/api/assets/${assetId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newName,
                campaign_id: currentCampaignId
            })
        });
        
        if (response.ok) {
            // Aggiorna l'asset nella lista locale
            const asset = allAssets.find(a => a.id == assetId);
            if (asset) {
                asset.name = newName;
                renderAssets(); // Ricarica la visualizzazione
            }
            console.log('Asset aggiornato con successo');
        } else {
            const errorData = await response.json();
            showAssetError('Errore durante l\'aggiornamento: ' + (errorData.message || 'Errore sconosciuto'));
        }
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dell\'asset:', error);
        showAssetError('Errore di connessione durante l\'aggiornamento');
    }
}

// Elimina asset
function deleteAsset(assetId) {
    const asset = allAssets.find(a => a.id == assetId);
    if (asset && confirm(`Sei sicuro di voler eliminare l'asset "${asset.name}"?\n\nQuesta azione non può essere annullata.`)) {
        performAssetDeletion(assetId);
    }
}

// Esegue l'eliminazione dell'asset
async function performAssetDeletion(assetId) {
    try {
        const response = await fetch(`/api/assets/${assetId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaign_id: currentCampaignId
            })
        });
        
        if (response.ok) {
            // Rimuovi l'asset dalla lista locale
            allAssets = allAssets.filter(a => a.id != assetId);
            filteredAssets = filteredAssets.filter(a => a.id != assetId);
            renderAssets(); // Ricarica la visualizzazione
            console.log('Asset eliminato con successo');
        } else {
            const errorData = await response.json();
            showAssetError('Errore durante l\'eliminazione: ' + (errorData.message || 'Errore sconosciuto'));
        }
    } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'asset:', error);
        showAssetError('Errore di connessione durante l\'eliminazione');
    }
}

// Mostra errore asset
function showAssetError(message) {
    const gridEl = document.getElementById('assetGrid');
    const emptyEl = document.getElementById('assetEmpty');
    
    if (gridEl) {
        gridEl.innerHTML = `
            <div class="asset-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn-primary" onclick="loadAssets()">Riprova</button>
            </div>
        `;
        gridEl.style.display = 'block';
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
}

// Utility function per debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// === GESTIONE DROP SUL CANVAS ===

// Inizializza gestione drop sul canvas
function initializeCanvasDrop() {
    const gameCanvas = document.getElementById('gameCanvas');
    if (!gameCanvas) {
        console.warn('Canvas di gioco non trovato');
        return;
    }
    
    // Controlla se gli event listener sono già stati aggiunti
    if (gameCanvas.hasAttribute('data-drop-initialized')) {
        console.log('[DEBUG] Drop listeners already initialized, skipping');
        return;
    }
    
    // Marca il canvas come inizializzato
    gameCanvas.setAttribute('data-drop-initialized', 'true');
    
    // Gestione dragover
    gameCanvas.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    // Gestione drop
    gameCanvas.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Previene la propagazione dell'evento
        
        console.log('[DEBUG] Drop event triggered on canvas');
        console.log('[DEBUG] Current draggedAsset:', draggedAsset);
        console.log('[DEBUG] Event dataTransfer types:', e.dataTransfer.types);
        
        // Prova a recuperare i dati dal dataTransfer se draggedAsset è null
        if (!draggedAsset && e.dataTransfer.types.includes('application/json')) {
            try {
                const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
                console.log('[DEBUG] Recovered drag data from dataTransfer:', dragData);
                if (dragData.type === 'asset' && dragData.assetData) {
                    draggedAsset = dragData.assetData;
                    console.log('[DEBUG] draggedAsset recovered from dataTransfer:', draggedAsset);
                }
            } catch (error) {
                console.error('[DEBUG] Error parsing drag data:', error);
            }
        }
        
        // Gestione drop asset
        if (draggedAsset) {
            console.log('[DEBUG] Dragged asset found:', draggedAsset);
            const rect = this.getBoundingClientRect();
            const x = (e.clientX - rect.left - panX) / scale;
            const y = (e.clientY - rect.top - panY) / scale;
            
            // Snap alla griglia
            const gridSize = 50;
            const gridX = Math.round(x / gridSize);
            const gridY = Math.round(y / gridSize);
            
            console.log(`[DEBUG] Dropping asset at grid position: (${gridX}, ${gridY})`);
            
            // Crea nuovo elemento asset sulla mappa
            createAssetOnMap(draggedAsset, gridX, gridY);
            
            // Reset draggedAsset solo dopo un drop riuscito
            const tempAsset = draggedAsset;
            draggedAsset = null;
            console.log('[DEBUG] draggedAsset reset to null after successful drop');
            
            // Previene la gestione di drop duplicati
            return false;
        } else {
            console.log('[DEBUG] No dragged asset found');
        }
    }, { once: false }); // Assicura che l'evento venga gestito ogni volta
    
    // Gestione movimento mouse per drag
    document.addEventListener('mousemove', function(e) {
        if (isDragging && currentToken) {
            const gameCanvas = document.getElementById('gameCanvas');
            const rect = gameCanvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left - panX) / scale;
            const mouseY = (e.clientY - rect.top - panY) / scale;
            
            // Calcola la nuova posizione
            const newX = mouseX - startX;
            const newY = mouseY - startY;
            
            // Snap alla griglia
            const gridSize = 50;
            const assetSize = 48;
            const offset = (gridSize - assetSize) / 2;
            
            const snappedX = Math.round(newX / gridSize) * gridSize + offset;
            const snappedY = Math.round(newY / gridSize) * gridSize + offset;
            
            currentToken.style.left = snappedX + 'px';
            currentToken.style.top = snappedY + 'px';
        }
    });
    
    // Gestione rilascio mouse
    document.addEventListener('mouseup', function() {
        if (isDragging && currentToken) {
            // Calcola le coordinate griglia dalla posizione finale
            const finalX = parseInt(currentToken.style.left);
            const finalY = parseInt(currentToken.style.top);
            const gridSize = 50;
            const tokenSize = 48;
            const offset = (gridSize - tokenSize) / 2;
            
            const gridX = Math.round((finalX - offset) / gridSize);
            const gridY = Math.round((finalY - offset) / gridSize);
            
            // Se il token ha un ID dal database, aggiorna la posizione
            const tokenId = currentToken.dataset.tokenId;
            if (tokenId) {
                updateTokenPosition(tokenId, gridX, gridY);
            }
            
            currentToken.style.zIndex = '';
            isDragging = false;
            currentToken = null;
        }
    });
    
    console.log('Gestione drop sul canvas inizializzata');
}

// === GESTIONE PAN E ZOOM CANVAS ===

// Inizializza gestione pan e zoom sul canvas
function initializeCanvasPanZoom() {
    const gameCanvas = document.getElementById('gameCanvas');
    if (!gameCanvas) {
        console.warn('Canvas di gioco non trovato per pan/zoom');
        return;
    }
    
    // Controlla se gli event listener sono già stati aggiunti
    if (gameCanvas.hasAttribute('data-panzoom-initialized')) {
        console.log('[DEBUG] Pan/Zoom listeners already initialized, skipping');
        return;
    }
    
    // Marca il canvas come inizializzato
    gameCanvas.setAttribute('data-panzoom-initialized', 'true');
    
    // Zoom con rotella del mouse (come Roll20)
    gameCanvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        const rect = gameCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calcola il punto del mouse nel sistema di coordinate del canvas
        const canvasX = (mouseX - panX) / scale;
        const canvasY = (mouseY - panY) / scale;
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.25, Math.min(4, scale * delta));
        
        // Aggiorna pan per mantenere il punto del mouse fisso
        panX = mouseX - canvasX * newScale;
        panY = mouseY - canvasY * newScale;
        
        scale = newScale;
        updateCanvasTransform();
        updateZoomDisplay();
    });
    
    // Pan con click destro o middle click (come Roll20)
    gameCanvas.addEventListener('mousedown', function(e) {
        if (e.button === 1 || e.button === 2) { // Middle click o Right click
            e.preventDefault();
            isPanning = true;
            lastPanPoint = { x: e.clientX, y: e.clientY };
            gameCanvas.style.cursor = 'grabbing';
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isPanning) {
            const deltaX = e.clientX - lastPanPoint.x;
            const deltaY = e.clientY - lastPanPoint.y;
            
            panX += deltaX;
            panY += deltaY;
            
            lastPanPoint = { x: e.clientX, y: e.clientY };
            updateCanvasTransform();
        }
    });
    
    document.addEventListener('mouseup', function() {
        isPanning = false;
        gameCanvas.style.cursor = 'default';
    });
    
    // Disabilita menu contestuale sul canvas
    gameCanvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    console.log('Gestione pan e zoom sul canvas inizializzata');
    
    // Inizializza display zoom e posizione canvas
    initializeCanvasPosition();
}

// Inizializza la posizione del canvas e il display zoom
function initializeCanvasPosition() {
    // Inizializza display zoom
    updateZoomDisplay();
    
    // Inizializza posizione canvas al centro
    setTimeout(() => {
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            const containerRect = canvasContainer.getBoundingClientRect();
            panX = (containerRect.width - 3000 * scale) / 2;
            panY = (containerRect.height - 3000 * scale) / 2;
            updateCanvasTransform();
        }
    }, 100);
}

function updateCanvasTransform() {
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
        gameCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        gameCanvas.style.transformOrigin = '0 0';
    }
}

function updateZoomDisplay() {
    const zoomPercentage = Math.round(scale * 100);
    // Aggiorna display zoom del widget
    const zoomDisplay = document.getElementById('zoomDisplay');
    if (zoomDisplay) {
        zoomDisplay.textContent = `${zoomPercentage}%`;
    }
}

// Crea asset sulla mappa
async function createAssetOnMap(asset, gridX, gridY) {
    try {
        console.log('[DEBUG] createAssetOnMap chiamata con:', { asset, gridX, gridY });
        
        const gameCanvas = document.getElementById('gameCanvas');
        if (!gameCanvas) {
            console.error('Canvas di gioco non trovato');
            return;
        }
        
        // Crea il token nel database tramite API
        const tokenData = {
            map_id: currentMapId,
            name: asset.name,
            grid_x: gridX,
            grid_y: gridY,
            asset_id: asset.id,
            properties: {
                type: 'asset',
                color: '#4834d4'
            }
        };
        
        console.log('[DEBUG] Creando token nel database:', tokenData);
        console.log('[DEBUG] URL API:', '/api/map-tokens');
        
        try {
            // Assicuriamoci che currentMapId sia un numero
            if (!currentMapId || isNaN(parseInt(currentMapId))) {
                console.error('[DEBUG] currentMapId non valido:', currentMapId);
                throw new Error('Map ID non valido');
            }
            
            // Assicuriamoci che l'URL sia corretto
            const apiUrl = '/api/map-tokens';
            console.log('[DEBUG] Chiamando API POST:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tokenData)
            });
            
            console.log('[DEBUG] Risposta API ricevuta:', { status: response.status, ok: response.ok });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[DEBUG] Errore API:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const newToken = await response.json();
            console.log('[DEBUG] Token creato nel database:', newToken);
            
            // Crea elemento token usando la stessa logica di createTokenElement
            const tokenInfo = {
                id: newToken.token_id,
                asset_id: asset.id,
                name: asset.name,
                grid_x: gridX,
                grid_y: gridY,
                properties: {}
            };
            
            // Usa createTokenElement se disponibile, altrimenti crea manualmente
            let tokenElement;
            if (typeof window.createTokenElement === 'function') {
                tokenElement = window.createTokenElement(tokenInfo);
            } else {
                // Fallback: crea elemento manualmente
                tokenElement = document.createElement('div');
                tokenElement.className = 'token npc';
                tokenElement.dataset.tokenId = newToken.token_id;
                
                const gridSize = 50;
                const tokenSize = 48;
                const offset = (gridSize - tokenSize) / 2;
                const pixelX = gridX * gridSize + offset;
                const pixelY = gridY * gridSize + offset;
                
                tokenElement.style.position = 'absolute';
                tokenElement.style.left = pixelX + 'px';
                tokenElement.style.top = pixelY + 'px';
                tokenElement.style.width = tokenSize + 'px';
                tokenElement.style.height = tokenSize + 'px';
                tokenElement.style.backgroundImage = `url(${asset.file_url})`;
                tokenElement.style.backgroundSize = 'cover';
                tokenElement.style.backgroundPosition = 'center';
                tokenElement.style.backgroundRepeat = 'no-repeat';
                tokenElement.style.border = '2px solid #fff';
                tokenElement.style.borderRadius = '4px';
                tokenElement.style.cursor = 'move';
                tokenElement.style.zIndex = '10';
                tokenElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                tokenElement.title = asset.name;
                
                // Aggiungi eventi di drag se la funzione esiste
                if (typeof window.addTokenDragEvents === 'function') {
                    window.addTokenDragEvents(tokenElement);
                }
            }
            
            gameCanvas.appendChild(tokenElement);
            
            console.log(`[DEBUG] Asset "${asset.name}" aggiunto alla mappa in posizione (${gridX}, ${gridY}) con token ID: ${newToken.token_id}`);
            
        } catch (fetchError) {
            console.error('[DEBUG] Errore durante la chiamata API:', fetchError);
            throw fetchError;
        }
        
    } catch (error) {
        console.error('[DEBUG] Errore nella creazione dell\'asset sulla mappa:', error);
        alert('Errore nella creazione del token: ' + error.message);
    }
}

// Funzione per aggiornare la posizione del token nel database
async function updateTokenPosition(tokenId, gridX, gridY) {
    try {
        console.log(`[DEBUG] updateTokenPosition chiamata con: tokenId=${tokenId}, gridX=${gridX}, gridY=${gridY}`);
        
        // Verifica che tokenId sia valido
        if (!tokenId || isNaN(parseInt(tokenId))) {
            console.error('[DEBUG] Token ID non valido:', tokenId);
            throw new Error('Token ID non valido');
        }
        
        const url = `/api/map-tokens/${tokenId}`;
        console.log(`[DEBUG] URL API: ${url}`);
        
        const requestBody = {
            x_position: gridX,
            y_position: gridY
        };
        console.log(`[DEBUG] Request body:`, requestBody);
        
        try {
            // Assicuriamoci che la richiesta venga inviata correttamente
            console.log(`[DEBUG] Inviando richiesta PUT a ${url}`);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log(`[DEBUG] Risposta API ricevuta:`, { status: response.status, ok: response.ok });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[DEBUG] Errore API:`, errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            // Prova a leggere la risposta JSON
            const result = await response.json();
            console.log(`[DEBUG] Risposta completa:`, result);
            console.log(`[DEBUG] Token ${tokenId} position updated successfully`);
            
        } catch (fetchError) {
            console.error('[DEBUG] Errore durante la chiamata API:', fetchError);
            throw fetchError;
        }
    } catch (error) {
        console.error('[DEBUG] Failed to update token position', error);
        alert('Errore nell\'aggiornamento della posizione del token: ' + error.message);
    }
}

// Aggiungi eventi di drag agli asset sulla mappa
function addAssetDragEvents(assetElement) {
    if (!assetElement) {
        console.error('Elemento asset non valido per aggiungere eventi drag');
        return;
    }
    
    assetElement.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return; // Solo click sinistro
        
        isDragging = true;
        currentToken = this;
        
        const gameCanvas = document.getElementById('gameCanvas');
        const rect = gameCanvas.getBoundingClientRect();
        
        const mouseX = (e.clientX - rect.left - panX) / scale;
        const mouseY = (e.clientY - rect.top - panY) / scale;
        
        const assetX = parseInt(this.style.left);
        const assetY = parseInt(this.style.top);
        
        startX = mouseX - assetX;
        startY = mouseY - assetY;
        
        this.style.zIndex = '1000';
        e.preventDefault();
        e.stopPropagation();
    });
}

// Token Upload Form Management
let tokenUploadForm = null;
let tokenCanvas = null;
let tokenCtx = null;
let tokenBackgroundImage = null;
let tokenBorderImage = null;
let tokenCurrentLayer = 'background';
let tokenLayers = {
    background: { x: 0, y: 0, scale: 1 },
    circle: { x: 150, y: 150, radius: 50 }
};
let availableTokenBorders = [];

function initializeTokenUpload() {
    // Verifica che tutti gli elementi necessari esistano
    const uploadFirstAssetBtn = document.getElementById('uploadFirstAsset');
    if (!uploadFirstAssetBtn) {
        console.log('uploadFirstAsset button not found, retrying in 200ms');
        setTimeout(initializeTokenUpload, 200);
        return;
    }
    
    tokenUploadForm = document.getElementById('tokenUploadForm');
    tokenCanvas = document.getElementById('tokenCanvas');
    if (tokenCanvas) {
        tokenCtx = tokenCanvas.getContext('2d');
    }
    
    // Event listeners per la form di upload token
    const closeTokenFormBtn = document.getElementById('closeTokenForm');
    const cancelTokenUploadBtn = document.getElementById('cancelTokenUpload');
    const tokenBackgroundInput = document.getElementById('tokenBackgroundImage');

    const tokenBorderGallery = document.getElementById('tokenBorderGallery');
    const tokenLayerSelect = document.getElementById('tokenLayerSelect');
    const generateTokenBtn = document.getElementById('generateTokenButton');
    const saveTokenBtn = document.getElementById('saveTokenButton');
    
    // Carica i bordi disponibili
    loadAvailableTokenBorders();
    
    uploadFirstAssetBtn.addEventListener('click', function() {
        // Mostra la form solo se siamo nella categoria tokens
        const categorySelect = document.getElementById('assetCategorySelect');
        if (categorySelect && categorySelect.value === 'tokens') {
            showTokenUploadForm();
        } else {
            // Per altre categorie, mostra il dialog di upload normale
            showUploadDialog();
        }
    });
    
    if (closeTokenFormBtn) {
        closeTokenFormBtn.addEventListener('click', hideTokenUploadForm);
    }
    
    if (cancelTokenUploadBtn) {
        cancelTokenUploadBtn.addEventListener('click', hideTokenUploadForm);
    }
    
    if (tokenBackgroundInput) {
        tokenBackgroundInput.addEventListener('change', handleTokenBackgroundUpload);
    }
    

    
    // La galleria dei bordi gestisce i click direttamente negli elementi
    
    if (tokenLayerSelect) {
        tokenLayerSelect.addEventListener('change', function(e) {
            tokenCurrentLayer = e.target.value;
            updateZoomSlider();
        });
    }
    
    if (generateTokenBtn) {
        generateTokenBtn.addEventListener('click', generateFinalToken);
    }
    
    if (saveTokenBtn) {
        saveTokenBtn.addEventListener('click', saveTokenToAssets);
    }
    
    // Event listener per chiudere la form cliccando sull'overlay
    const tokenUploadOverlay = document.getElementById('tokenUploadOverlay');
    if (tokenUploadOverlay) {
        tokenUploadOverlay.addEventListener('click', hideTokenUploadForm);
    }
    
    setupTokenCanvas();
}

function showTokenUploadForm() {
    const tokenUploadOverlay = document.getElementById('tokenUploadOverlay');
    if (tokenUploadForm && tokenUploadOverlay) {
        tokenUploadOverlay.style.display = 'block';
        tokenUploadForm.style.display = 'block';
        resetTokenForm();
    }
}

function hideTokenUploadForm() {
    const tokenUploadOverlay = document.getElementById('tokenUploadOverlay');
    if (tokenUploadForm && tokenUploadOverlay) {
        tokenUploadForm.style.display = 'none';
        tokenUploadOverlay.style.display = 'none';
        resetTokenForm();
    }
}

function resetTokenForm() {
    tokenBackgroundImage = null;
    tokenBorderImage = null;
    tokenCurrentLayer = 'background';
    tokenLayers = {
        background: { x: 0, y: 0, scale: 1 },
        circle: { x: 150, y: 150, radius: 50 }
    };
    
    const editorSection = document.getElementById('tokenEditorSection');
    const generateBtn = document.getElementById('generateTokenButton');
    const saveBtn = document.getElementById('saveTokenButton');
    const tokenBorderGallery = document.getElementById('tokenBorderGallery');
    const tokenBackgroundInput = document.getElementById('tokenBackgroundImage');
    
    if (editorSection) editorSection.style.display = 'none';
    if (generateBtn) generateBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
    
    // Rimuovi selezioni dalla galleria dei bordi
    if (tokenBorderGallery) {
        const allItems = tokenBorderGallery.querySelectorAll('.border-item');
        allItems.forEach(item => item.classList.remove('selected'));
    }
    
    if (tokenBackgroundInput) tokenBackgroundInput.value = '';
    
    if (tokenCanvas && tokenCtx) {
        tokenCtx.clearRect(0, 0, tokenCanvas.width, tokenCanvas.height);
    }
}

function handleTokenBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validazione per accettare solo file PNG
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
        alert('Solo file PNG sono consentiti.');
        event.target.value = ''; // Pulisce l\'input
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function() {
        const img = new Image();
        img.src = reader.result;
        img.onload = function() {
            tokenBackgroundImage = img;
            setupTokenCanvas();
            drawTokenCanvas();
            
            // Apri automaticamente l'anteprima quando viene caricata la prima immagine
            const editorSection = document.getElementById('tokenEditorSection');
            if (editorSection) {
                editorSection.style.display = 'block';
            }
        };
    };
    reader.readAsDataURL(file);
}



function setupTokenCanvas() {
    if (!tokenCanvas || !tokenBorderImage) return;
    
    // Imposta dimensioni fisse e quadrate del canvas per evitare stiracchiamenti
    const canvasSize = 400; // Dimensione fissa quadrata
    tokenCanvas.width = canvasSize;
    tokenCanvas.height = canvasSize;
    
    // Centra il cerchio inizialmente
    tokenLayers.circle.x = canvasSize / 2;
    tokenLayers.circle.y = canvasSize / 2;
    tokenLayers.circle.radius = canvasSize / 8;
    
    // Mostra l'editor
    const editorSection = document.getElementById('tokenEditorSection');
    const generateBtn = document.getElementById('generateTokenButton');
    
    if (editorSection) editorSection.style.display = 'block';
    if (generateBtn) generateBtn.style.display = 'inline-block';
    
    // Aggiungi event listeners per il canvas
    setupTokenCanvasEvents();
    
    // Inizializza lo slider dello zoom
    updateZoomSlider();
}

function updateZoomSlider() {
    const zoomSlider = document.getElementById('tokenZoomSlider');
    const zoomValue = document.getElementById('tokenZoomValue');
    
    if (!zoomSlider || !zoomValue) return;
    
    const layer = tokenLayers[tokenCurrentLayer];
    let currentZoom = 1;
    
    if (tokenCurrentLayer === 'background') {
        currentZoom = layer.scale;
    } else if (tokenCurrentLayer === 'circle') {
        // Per il cerchio, calcola il zoom basato sul raggio rispetto al raggio base fisso
        const baseRadius = 50; // Raggio base fisso per canvas 400x400 (400/8 = 50)
        currentZoom = layer.radius / baseRadius;
    }
    
    zoomSlider.value = currentZoom;
    zoomValue.textContent = Math.round(currentZoom * 100) + '%';
}

function setupTokenCanvasEvents() {
    if (!tokenCanvas) return;
    
    // Setup zoom slider
    const zoomSlider = document.getElementById('tokenZoomSlider');
    const zoomValue = document.getElementById('tokenZoomValue');
    
    if (zoomSlider && zoomValue) {
        zoomSlider.addEventListener('input', function(event) {
            const zoomLevel = parseFloat(event.target.value);
            const layer = tokenLayers[tokenCurrentLayer];
            
            if (tokenCurrentLayer === 'background') {
                layer.scale = zoomLevel;
            } else if (tokenCurrentLayer === 'circle') {
                // Per il cerchio, adatta il raggio in base al zoom con raggio base fisso
                const baseRadius = 50; // Raggio base fisso per canvas 400x400 (400/8 = 50)
                layer.radius = baseRadius * zoomLevel;
            }
            
            // Aggiorna il display del valore
            zoomValue.textContent = Math.round(zoomLevel * 100) + '%';
            drawTokenCanvas();
        });
    }
    
    tokenCanvas.addEventListener('mousemove', function(event) {
        if (event.buttons === 1) { // Tasto sinistro del mouse per spostare
            const layer = tokenLayers[tokenCurrentLayer];
            if (tokenCurrentLayer === 'circle') {
                layer.x += event.movementX;
                layer.y += event.movementY;
            } else if (tokenCurrentLayer === 'background') {
                layer.x += event.movementX;
                layer.y += event.movementY;
            }
            drawTokenCanvas();
        }
    });
    
    tokenCanvas.addEventListener('wheel', function(event) {
        event.preventDefault();
        const layer = tokenLayers[tokenCurrentLayer];
        const zoomSlider = document.getElementById('tokenZoomSlider');
        const zoomValue = document.getElementById('tokenZoomValue');
        
        if (tokenCurrentLayer === 'circle') {
            layer.radius += event.deltaY * -0.1;
            layer.radius = Math.max(10, layer.radius);
            
            // Sincronizza lo slider con il wheel per il cerchio
            if (zoomSlider && zoomValue) {
                const baseRadius = 50; // Raggio base fisso per canvas 400x400 (400/8 = 50)
                const zoomLevel = layer.radius / baseRadius;
                zoomSlider.value = Math.max(0.1, Math.min(zoomLevel, 3));
                zoomValue.textContent = Math.round(zoomSlider.value * 100) + '%';
            }
        } else if (tokenCurrentLayer === 'background') {
            layer.scale += event.deltaY * -0.001;
            layer.scale = Math.max(0.1, Math.min(layer.scale, 3));
            
            // Sincronizza lo slider con il wheel
            if (zoomSlider && zoomValue) {
                zoomSlider.value = layer.scale;
                zoomValue.textContent = Math.round(layer.scale * 100) + '%';
            }
        }
        drawTokenCanvas();
    });
}

function drawTokenCanvas() {
    if (!tokenCanvas || !tokenCtx || !tokenBackgroundImage || !tokenBorderImage) return;
    
    tokenCtx.clearRect(0, 0, tokenCanvas.width, tokenCanvas.height);
    
    // Disegna immagine di sfondo (livello 1)
    const bg = tokenLayers.background;
    tokenCtx.drawImage(
        tokenBackgroundImage,
        bg.x,
        bg.y,
        tokenBackgroundImage.width * bg.scale,
        tokenBackgroundImage.height * bg.scale
    );
    
    // Disegna cerchio di ritaglio (livello 3) come guida visiva
    const cir = tokenLayers.circle;
    tokenCtx.beginPath();
    tokenCtx.arc(cir.x, cir.y, cir.radius, 0, Math.PI * 2);
    tokenCtx.strokeStyle = 'red';
    tokenCtx.lineWidth = 2;
    tokenCtx.stroke();
    
    // Disegna bordo del token (livello 2) scalato alle dimensioni del canvas
    tokenCtx.drawImage(
        tokenBorderImage,
        0,
        0,
        tokenCanvas.width,
        tokenCanvas.height
    );
}

function generateFinalToken() {
    if (!tokenCanvas || !tokenCtx || !tokenBackgroundImage || !tokenBorderImage) return;
    
    const cir = tokenLayers.circle;
    
    // Crea un canvas temporaneo per il token finale
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    outputCanvas.width = tokenCanvas.width;
    outputCanvas.height = tokenCanvas.height;
    
    // Applica il ritaglio basato sul cerchio
    outputCtx.save();
    outputCtx.beginPath();
    outputCtx.arc(cir.x, cir.y, cir.radius, 0, Math.PI * 2);
    outputCtx.clip();
    
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    const bg = tokenLayers.background;
    outputCtx.drawImage(
        tokenBackgroundImage,
        bg.x,
        bg.y,
        tokenBackgroundImage.width * bg.scale,
        tokenBackgroundImage.height * bg.scale
    );
    outputCtx.restore();
    
    // Disegna il bordo sopra scalato alle dimensioni del canvas
    outputCtx.drawImage(tokenBorderImage, 0, 0, outputCanvas.width, outputCanvas.height);
    
    // Mostra il pulsante salva
    const saveBtn = document.getElementById('saveTokenButton');
    if (saveBtn) {
        saveBtn.style.display = 'inline-block';
        saveBtn.tokenDataUrl = outputCanvas.toDataURL('image/png');
    }
}

async function loadAvailableTokenBorders() {
    try {
        const response = await fetch('/api/token-borders');
        const data = await response.json();
        
        if (data.success && data.borders) {
            availableTokenBorders = data.borders;
            populateTokenBorderGallery();
        } else {
            console.error('Errore nel caricamento dei bordi:', data.error);
        }
    } catch (error) {
        console.error('Errore nella richiesta dei bordi:', error);
    }
}

function populateTokenBorderGallery() {
    const tokenBorderGallery = document.getElementById('tokenBorderGallery');
    if (!tokenBorderGallery) return;
    
    tokenBorderGallery.innerHTML = '';
    
    availableTokenBorders.forEach(border => {
        const borderItem = document.createElement('div');
        borderItem.className = 'border-item';
        borderItem.style.backgroundImage = `url('${border.url}')`;
        borderItem.dataset.url = border.url;
        borderItem.dataset.name = border.name;
        borderItem.title = border.name.replace(/\.[^/.]+$/, ''); // Rimuovi estensione
        
        borderItem.addEventListener('click', () => handleTokenBorderSelection(border.url));
        
        tokenBorderGallery.appendChild(borderItem);
    });
}

function handleTokenBorderSelection(selectedUrl) {
    const tokenBorderGallery = document.getElementById('tokenBorderGallery');
    
    if (selectedUrl) {
        // Rimuovi selezione precedente
        if (tokenBorderGallery) {
            const allItems = tokenBorderGallery.querySelectorAll('.border-item');
            allItems.forEach(item => item.classList.remove('selected'));
            
            // Aggiungi selezione al nuovo item
            const selectedItem = tokenBorderGallery.querySelector(`[data-url="${selectedUrl}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
        }
        
        // Carica l'immagine del bordo
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            tokenBorderImage = img;
            if (tokenBackgroundImage) {
                setupTokenCanvas();
                drawTokenCanvas();
            }
        };
        img.src = selectedUrl;
    } else {
        // Rimuovi tutte le selezioni
        if (tokenBorderGallery) {
            const allItems = tokenBorderGallery.querySelectorAll('.border-item');
            allItems.forEach(item => item.classList.remove('selected'));
        }
        tokenBorderImage = null;
    }
}

async function saveTokenToAssets() {
    const saveBtn = document.getElementById('saveTokenButton');
    if (!saveBtn || !saveBtn.tokenDataUrl) return;
    
    try {
        // Converti data URL in blob
        const response = await fetch(saveBtn.tokenDataUrl);
        const blob = await response.blob();
        
        // Crea FormData per l'upload
        // Recupera l'user_id dal storage
        const userId = sessionStorage.getItem('pfvtt_user_id') || localStorage.getItem('pfvtt_user_id');
        if (!userId) {
            throw new Error('User ID non trovato. Effettua nuovamente il login.');
        }
        
        const formData = new FormData();
        formData.append('file', blob, 'custom_token.png');
        formData.append('user_id', userId);
        formData.append('campaign_id', currentCampaignId);
        formData.append('upload_type', 'token');
        formData.append('category', 'tokens');
        formData.append('name', 'Custom Token ' + Date.now());
        
        // Invia al server
        const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            throw new Error(`HTTP error! status: ${uploadResponse.status}`);
        }
        
        const result = await uploadResponse.json();
        console.log('[DEBUG] Risultato upload:', result);
        console.log('[DEBUG] result.success è:', result.success);
        console.log('[DEBUG] Tipo di result.success:', typeof result.success);
        
        if (result.success) {
            console.log('Token salvato con successo:', result);
            
            // Crea il record dell'asset nel database
            const assetData = {
                campaign_id: currentCampaignId,
                name: 'Custom Token ' + Date.now(),
                category: 'tokens',
                file_url: result.url,
                file_size: result.size || 0,
                mime_type: 'image/png',
                description: 'Token personalizzato creato dall\'utente',
                tags: []
            };
            
            console.log('[DEBUG] Creando asset nel database con dati:', assetData);
             const assetResponse = await fetch('/api/assets', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify(assetData)
             });
             
             console.log('[DEBUG] Response status per POST /api/assets:', assetResponse.status);
             if (assetResponse.ok) {
                 const assetResult = await assetResponse.json();
                 console.log('Asset creato nel database:', assetResult);
             } else {
                 const errorText = await assetResponse.text();
                 console.error('Errore nella creazione dell\'asset nel database:', errorText);
             }
            
            // Chiudi la form
            hideTokenUploadForm();
            // Ricarica gli asset per mostrare il nuovo token
            loadAssets();
        } else {
            console.error('Errore nel salvataggio del token:', result.error);
            alert('Errore nel salvataggio del token: ' + (result.error || 'Errore sconosciuto'));
        }
    } catch (error) {
        console.error('Errore nel salvataggio del token:', error);
        if (error.message.includes('HTTP error')) {
            alert('Errore del server nel salvataggio del token. Verifica che il server sia attivo.');
        } else {
            alert('Errore nel salvataggio del token: ' + error.message);
        }
    }
}

// Inizializza la gestione upload token quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    // Aggiungi un piccolo ritardo per assicurarsi che tutti gli elementi siano pronti
    setTimeout(initializeTokenUpload, 100);
});