import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import fs from 'fs';
import multer from 'multer';
import FormData from 'form-data';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = parseInt(process.env.FRONTEND_PORT || '3000');
const BACKEND_URL = `http://${process.env.SERVER_HOST || 'localhost'}:${process.env.SERVER_PORT || 8080}`;
const upload = multer();
// Logging functionality
const LOG_FILE = path.join(__dirname, '..', 'frontend.log');
function initializeLogging() {
    // Clear the log file on startup
    fs.writeFileSync(LOG_FILE, '');
    console.log('Frontend log file initialized and cleared');
}
function writeLog(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
}
// Initialize logging
initializeLogging();
writeLog('PFVTT frontend started');
console.log(`[FRONTEND] Starting on port ${PORT}`);
console.log(`[FRONTEND] Backend URL: ${BACKEND_URL}`);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Serve static files from public directory (compiled TypeScript files)
app.use('/public', express.static(path.join(__dirname, 'public')));
// Serve original static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, '..', 'public')));
// Serve images from backend/images directory
app.use('/backend/images', express.static(path.join(__dirname, '..', '..', 'backend', 'images')));
app.use('/images', express.static(path.join(__dirname, '..', '..', 'backend', 'images')));
let loggedIn = false;
app.get('/', (req, res) => {
    if (loggedIn) {
        res.redirect('/campaigns');
    }
    else {
        res.redirect('/login');
    }
});
app.get('/login', (req, res) => {
    res.render('login', { error: null, register: false });
});
app.get('/register', (req, res) => {
    res.render('login', { error: null, register: true });
});
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const response = await axios.post(`${BACKEND_URL}/login`, { username, password }, {
            headers: { 'Content-Type': 'application/json' }
        });
        if ((req.headers['content-type'] && req.headers['content-type'].includes('application/json')) ||
            (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
            req.xhr) {
            // AJAX/JS login: respond with JSON
            if (response.data.success) {
                loggedIn = true;
            }
            return res.json(response.data);
        }
        if (response.data.success) {
            // Traditional form: redirect to map
            loggedIn = true;
            return res.redirect('/map');
        }
        else {
            return res.render('login', { error: response.data.error || 'Login failed', register: false });
        }
    }
    catch (err) {
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            return res.json({ success: false, error: 'Backend error' });
        }
        return res.render('login', { error: 'Backend error', register: false });
    }
});
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const response = await axios.post(`${BACKEND_URL}/register`, { username, password }, {
            headers: { 'Content-Type': 'application/json' }
        });
        if ((req.headers['content-type'] && req.headers['content-type'].includes('application/json')) ||
            (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
            req.xhr) {
            // AJAX/JS register: respond with JSON
            if (response.data.success) {
                loggedIn = true;
            }
            return res.json(response.data);
        }
        if (response.data.success) {
            loggedIn = true;
            return res.redirect('/login');
        }
        else {
            return res.render('login', { error: response.data.message, register: true });
        }
    }
    catch (err) {
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            return res.json({ success: false, error: 'Backend error' });
        }
        res.render('login', { error: 'Backend error', register: true });
    }
});
app.get('/campaigns', (req, res) => {
    if (!loggedIn) {
        return res.redirect('/login');
    }
    res.render('campaigns');
});
app.get('/actors', (req, res) => {
    if (!loggedIn) {
        return res.redirect('/login');
    }
    res.render('actors');
});
app.get('/scenes', (req, res) => {
    if (!loggedIn) {
        return res.redirect('/login');
    }
    res.render('scenes');
});
app.get('/journals', (req, res) => {
    if (!loggedIn) {
        return res.redirect('/login');
    }
    res.render('journals');
});
app.get('/permissions', (req, res) => {
    if (!loggedIn) {
        return res.redirect('/login');
    }
    res.render('permissions');
});
app.get('/map', (req, res) => {
    if (!loggedIn) {
        return res.redirect('/login');
    }
    res.render('map', {
        FRONTEND_PORT: PORT,
        BACKEND_URL: BACKEND_URL
    });
});
app.get('/api/map', async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/map`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch map data' });
    }
});
// Maps API proxies
app.get('/api/maps', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/maps`;
        if (req.query.campaign_id) {
            url += `?campaign_id=${encodeURIComponent(req.query.campaign_id)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch maps' });
    }
});
app.get('/api/maps/:id', async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/maps/${req.params.id}`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch map' });
    }
});
app.post('/api/maps', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/maps`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create map' });
    }
});
app.put('/api/maps/:id', async (req, res) => {
    try {
        const response = await axios.put(`${BACKEND_URL}/api/maps/${req.params.id}`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update map' });
    }
});
app.delete('/api/maps/:id', async (req, res) => {
    try {
        const response = await axios.delete(`${BACKEND_URL}/api/maps/${req.params.id}`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete map' });
    }
});
// === TOKEN SHEETS API PROXY ===
app.get('/api/token-sheets', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/token-sheets`;
        if (req.query.map_id) {
            url += `?map_id=${encodeURIComponent(req.query.map_id)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch token sheets' });
    }
});
app.get('/api/token-sheets/:id', async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/token-sheets/${req.params.id}`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch token sheet' });
    }
});
app.post('/api/token-sheets', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/token-sheets`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create token sheet' });
    }
});
app.put('/api/token-sheets/:id', async (req, res) => {
    try {
        const response = await axios.put(`${BACKEND_URL}/api/token-sheets/${req.params.id}`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update token sheet' });
    }
});
app.delete('/api/token-sheets/:id', async (req, res) => {
    try {
        const response = await axios.delete(`${BACKEND_URL}/api/token-sheets/${req.params.id}`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete token sheet' });
    }
});
app.post('/api/token-sheets/auto-create', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/token-sheets/auto-create`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to auto-create token sheet' });
    }
});
// Scenes API proxies
app.get('/api/scenes', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/scenes`;
        if (req.query.campaign_id) {
            url += `?campaign_id=${encodeURIComponent(req.query.campaign_id)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch scenes' });
    }
});
app.post('/api/scenes', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/scenes`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create scene' });
    }
});
app.put('/api/scenes/:id', async (req, res) => {
    try {
        const response = await axios.put(`${BACKEND_URL}/api/scenes/${req.params.id}`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update scene' });
    }
});
app.delete('/api/scenes/:id', async (req, res) => {
    try {
        const response = await axios.delete(`${BACKEND_URL}/api/scenes/${req.params.id}`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete scene' });
    }
});
// Proxy GET and POST requests for campaigns to the Dart backend
app.get('/api/campaigns', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/campaigns`;
        if (req.query.username) {
            url += `?username=${encodeURIComponent(req.query.username)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});
// Get single campaign
app.get('/api/campaigns/:id', async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/campaigns/${req.params.id}`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
});
app.post('/api/campaigns', async (req, res) => {
    const logMsg = `Received POST /api/campaigns at frontend proxy: ${JSON.stringify(req.body)}\n`;
    fs.appendFileSync('frontend.log', logMsg);
    try {
        const response = await axios.post(`${BACKEND_URL}/api/campaigns`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});
app.post('/api/campaigns/edit', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/campaigns/edit`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to edit campaign' });
    }
});
app.post('/campaigns/delete', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/campaigns/delete`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete campaign' });
    }
});
app.get('/api/rules', async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/rules`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch rules from backend' });
    }
});
app.get('/api/user_id', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/user_id`;
        if (req.query.username) {
            url += `?username=${encodeURIComponent(req.query.username)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch user_id from backend' });
    }
});
// === GAME SYSTEMS API PROXY ===
app.get('/api/game-systems', async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/game-systems`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch game systems' });
    }
});
app.get('/api/game-systems/:folder', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/game-systems/${req.params.folder}`;
        if (req.query.type) {
            url += `?type=${encodeURIComponent(req.query.type)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch game system data' });
    }
});
app.post('/api/rules', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/rules`, req.body, { headers: { 'Content-Type': 'application/json' } });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to add rule' });
    }
});
app.put('/api/rules', async (req, res) => {
    try {
        const response = await axios.put(`${BACKEND_URL}/api/rules`, req.body, { headers: { 'Content-Type': 'application/json' } });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update rule' });
    }
});
app.delete('/api/rules', async (req, res) => {
    try {
        const response = await axios.delete(`${BACKEND_URL}/api/rules`, { data: req.body, headers: { 'Content-Type': 'application/json' } });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete rule' });
    }
});
app.get('/rules', (req, res) => {
    if (!loggedIn) {
        return res.redirect('/login');
    }
    res.render('rules');
});
app.post('/api/reset_password', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/reset_password`, req.body, { headers: { 'Content-Type': 'application/json' } });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to request password reset' });
    }
});
app.post('/logout', (req, res) => {
    loggedIn = false;
    res.json({ success: true });
});
// Debug endpoint to check session status
app.get('/api/debug/session', (req, res) => {
    res.json({
        loggedIn: loggedIn,
        timestamp: new Date().toISOString()
    });
});
// Debug log endpoint
app.post('/api/debug_log', (req, res) => {
    console.log('DEBUG LOG:', req.body);
    res.json({ success: true });
});
// Proxy for map layer APIs
app.get('/api/map-tokens', async (req, res) => {
    const startTime = Date.now();
    try {
        // Validate map_id parameter
        const mapId = req.query.map_id;
        if (!mapId) {
            writeLog(`[FRONTEND PROXY] GET /api/map-tokens - ERROR: Missing map_id parameter`);
            res.status(400).json({ success: false, error: 'Missing map_id parameter' });
            return;
        }
        if (typeof mapId !== 'string' || !/^\d+$/.test(mapId)) {
            writeLog(`[FRONTEND PROXY] GET /api/map-tokens - ERROR: Invalid map_id format: ${mapId}`);
            res.status(400).json({ success: false, error: 'Invalid map_id format. Must be numeric.' });
            return;
        }
        const url = `${BACKEND_URL}/api/map-tokens?map_id=${encodeURIComponent(mapId)}`;
        writeLog(`[FRONTEND PROXY] GET /api/map-tokens - URL: ${url}`);
        console.log(`[FRONTEND PROXY] GET /api/map-tokens - URL: ${url}`);
        // Add timeout and retry logic
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await axios.get(url, {
                    timeout: 30000, // 30 second timeout
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const duration = Date.now() - startTime;
                writeLog(`[FRONTEND PROXY] GET /api/map-tokens - Success (${duration}ms, attempt ${attempt}): ${JSON.stringify(response.data)}`);
                console.log(`[FRONTEND PROXY] GET /api/map-tokens - Success (${duration}ms):`, response.data);
                // Validate response structure
                if (!response.data || typeof response.data.success !== 'boolean') {
                    throw new Error('Invalid response structure from backend');
                }
                res.json(response.data);
                return;
            }
            catch (attemptError) {
                lastError = attemptError;
                writeLog(`[FRONTEND PROXY] GET /api/map-tokens - Attempt ${attempt} failed: ${attemptError.message}`);
                if (attempt < 3 && (attemptError.code === 'ECONNRESET' || attemptError.code === 'ETIMEDOUT')) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                    continue;
                }
                break;
            }
        }
        throw lastError;
    }
    catch (err) {
        const duration = Date.now() - startTime;
        writeLog(`[FRONTEND PROXY] GET /api/map-tokens - Error (${duration}ms): ${err.message}`);
        console.error(`[FRONTEND PROXY] GET /api/map-tokens - Error:`, err.message);
        if (err.response) {
            writeLog(`[FRONTEND PROXY] GET /api/map-tokens - Backend error: ${JSON.stringify(err.response.data)}`);
            console.error(`[FRONTEND PROXY] GET /api/map-tokens - Backend error:`, err.response.data);
            res.status(err.response.status).json(err.response.data);
        }
        else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
            res.status(504).json({ success: false, error: 'Backend service timeout' });
        }
        else {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
});
app.post('/api/map-tokens', async (req, res) => {
    const startTime = Date.now();
    writeLog(`[FRONTEND PROXY] POST /api/map-tokens - Request received`);
    writeLog(`[FRONTEND PROXY] POST /api/map-tokens - Request body: ${JSON.stringify(req.body)}`);
    console.log(`[FRONTEND PROXY] POST /api/map-tokens - Request received`);
    console.log(`[FRONTEND PROXY] POST /api/map-tokens - Request body:`, req.body);
    try {
        // Validate required fields
        const { map_id, asset_id, grid_x, grid_y } = req.body;
        if (!map_id || !asset_id || grid_x === undefined || grid_y === undefined) {
            writeLog(`[FRONTEND PROXY] POST /api/map-tokens - ERROR: Missing required fields`);
            res.status(400).json({
                success: false,
                error: 'Missing required fields: map_id, asset_id, grid_x, grid_y'
            });
            return;
        }
        // Validate field types
        if (isNaN(parseInt(map_id)) || isNaN(parseInt(asset_id))) {
            writeLog(`[FRONTEND PROXY] POST /api/map-tokens - ERROR: Invalid field types`);
            res.status(400).json({
                success: false,
                error: 'map_id and asset_id must be numeric'
            });
            return;
        }
        const backendUrl = `${BACKEND_URL}/api/map-tokens`;
        writeLog(`[FRONTEND PROXY] POST /api/map-tokens - Sending to backend: ${backendUrl}`);
        console.log(`[FRONTEND PROXY] POST /api/map-tokens - Sending to backend: ${backendUrl}`);
        // Add timeout and retry logic
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await axios.post(backendUrl, req.body, {
                    timeout: 30000, // 30 second timeout
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const duration = Date.now() - startTime;
                writeLog(`[FRONTEND PROXY] POST /api/map-tokens - Backend response (${duration}ms, attempt ${attempt}): ${JSON.stringify(response.data)}`);
                console.log(`[FRONTEND PROXY] POST /api/map-tokens - Backend response (${duration}ms):`, response.data);
                // Validate response structure
                if (!response.data || typeof response.data.success !== 'boolean') {
                    throw new Error('Invalid response structure from backend');
                }
                res.json(response.data);
                return;
            }
            catch (attemptError) {
                lastError = attemptError;
                writeLog(`[FRONTEND PROXY] POST /api/map-tokens - Attempt ${attempt} failed: ${attemptError.message}`);
                if (attempt < 3 && (attemptError.code === 'ECONNRESET' || attemptError.code === 'ETIMEDOUT')) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                    continue;
                }
                break;
            }
        }
        throw lastError;
    }
    catch (err) {
        const duration = Date.now() - startTime;
        writeLog(`[FRONTEND PROXY] POST /api/map-tokens - Error (${duration}ms): ${err.message}`);
        console.error(`[FRONTEND PROXY] POST /api/map-tokens - Error:`, err.message);
        if (err.response) {
            writeLog(`[FRONTEND PROXY] POST /api/map-tokens - Backend error status: ${err.response.status}`);
            writeLog(`[FRONTEND PROXY] POST /api/map-tokens - Backend error response: ${JSON.stringify(err.response.data)}`);
            console.error(`[FRONTEND PROXY] POST /api/map-tokens - Backend error status:`, err.response.status);
            console.error(`[FRONTEND PROXY] POST /api/map-tokens - Backend error response:`, err.response.data);
            res.status(err.response.status).json(err.response.data);
        }
        else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
            writeLog(`[FRONTEND PROXY] POST /api/map-tokens - Backend timeout`);
            res.status(504).json({ success: false, error: 'Backend service timeout' });
        }
        else {
            writeLog(`[FRONTEND PROXY] POST /api/map-tokens - No response from backend`);
            console.error(`[FRONTEND PROXY] POST /api/map-tokens - No response from backend`);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
});
app.put('/api/map-tokens/:id', async (req, res) => {
    writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Request received`);
    writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Headers: ${JSON.stringify(req.headers)}`);
    writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Request body: ${JSON.stringify(req.body)}`);
    console.log(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Request received`);
    console.log(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Headers:`, req.headers);
    console.log(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Request body:`, req.body);
    try {
        const backendUrl = `${BACKEND_URL}/api/map-tokens/${req.params.id}`;
        writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Sending to backend: ${backendUrl}`);
        console.log(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Sending to backend: ${backendUrl}`);
        const response = await axios.put(backendUrl, req.body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000 // 10 seconds timeout
        });
        writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Backend response: ${JSON.stringify(response.data)}`);
        console.log(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Backend response:`, response.data);
        res.json(response.data);
    }
    catch (err) {
        writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Error: ${err.message}`);
        writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Error stack: ${err.stack}`);
        console.error(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Error:`, err.message);
        console.error(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Error stack:`, err.stack);
        if (err.response) {
            writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Backend error status: ${err.response.status}`);
            writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Backend error response: ${JSON.stringify(err.response.data)}`);
            console.error(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Backend error status:`, err.response.status);
            console.error(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - Backend error response:`, err.response.data);
            res.status(err.response.status).json(err.response.data);
        }
        else {
            writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - No response from backend`);
            console.error(`[FRONTEND PROXY] PUT /api/map-tokens/${req.params.id} - No response from backend`);
            res.status(500).json({ error: 'Failed to update token - no response from backend' });
        }
    }
});
// Batch update endpoint for map tokens
app.put('/api/map-tokens/batch', async (req, res) => {
    writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Request received`);
    writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Request body: ${JSON.stringify(req.body)}`);
    console.log(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Request received`);
    console.log(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Request body:`, req.body);
    try {
        const backendUrl = `${BACKEND_URL}/api/map-tokens/batch`;
        writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Sending to backend: ${backendUrl}`);
        console.log(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Sending to backend: ${backendUrl}`);
        const response = await axios.put(backendUrl, req.body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000 // 30 seconds timeout for batch operations
        });
        writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Backend response: ${JSON.stringify(response.data)}`);
        console.log(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Backend response:`, response.data);
        res.json(response.data);
    }
    catch (err) {
        writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Error: ${err.message}`);
        writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Error stack: ${err.stack}`);
        console.error(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Error:`, err.message);
        console.error(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Error stack:`, err.stack);
        if (err.response) {
            writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Backend error status: ${err.response.status}`);
            writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Backend error response: ${JSON.stringify(err.response.data)}`);
            console.error(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Backend error status:`, err.response.status);
            console.error(`[FRONTEND PROXY] PUT /api/map-tokens/batch - Backend error response:`, err.response.data);
            res.status(err.response.status).json(err.response.data);
        }
        else {
            writeLog(`[FRONTEND PROXY] PUT /api/map-tokens/batch - No response from backend`);
            console.error(`[FRONTEND PROXY] PUT /api/map-tokens/batch - No response from backend`);
            res.status(500).json({ error: 'Failed to batch update tokens - no response from backend' });
        }
    }
});
app.get('/api/map-backgrounds', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/map-backgrounds`;
        if (req.query.map_id) {
            url += `?map_id=${encodeURIComponent(req.query.map_id)}`;
        }
        console.log(`[FRONTEND PROXY] GET /api/map-backgrounds - URL: ${url}`);
        const response = await axios.get(url);
        console.log(`[FRONTEND PROXY] GET /api/map-backgrounds - Success: ${JSON.stringify(response.data)}`);
        res.json(response.data);
    }
    catch (err) {
        console.error(`[FRONTEND PROXY] GET /api/map-backgrounds - Error:`, err.message);
        if (err.response) {
            console.error(`[FRONTEND PROXY] GET /api/map-backgrounds - Backend error:`, err.response.data);
        }
        res.status(500).json({ error: 'Failed to fetch map backgrounds' });
    }
});
app.post('/api/map-backgrounds', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/map-backgrounds`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to place background' });
    }
});
app.get('/api/map-audio', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/map-audio`;
        if (req.query.map_id) {
            url += `?map_id=${encodeURIComponent(req.query.map_id)}`;
        }
        console.log(`[FRONTEND PROXY] GET /api/map-audio - URL: ${url}`);
        const response = await axios.get(url);
        console.log(`[FRONTEND PROXY] GET /api/map-audio - Success: ${JSON.stringify(response.data)}`);
        res.json(response.data);
    }
    catch (err) {
        console.error(`[FRONTEND PROXY] GET /api/map-audio - Error:`, err.message);
        if (err.response) {
            console.error(`[FRONTEND PROXY] GET /api/map-audio - Backend error:`, err.response.data);
        }
        res.status(500).json({ error: 'Failed to fetch map audio' });
    }
});
app.post('/api/map-audio', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/map-audio`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to place audio' });
    }
});
app.get('/api/map-props', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/map-props`;
        if (req.query.map_id) {
            url += `?map_id=${encodeURIComponent(req.query.map_id)}`;
        }
        console.log(`[FRONTEND PROXY] GET /api/map-props - URL: ${url}`);
        const response = await axios.get(url);
        console.log(`[FRONTEND PROXY] GET /api/map-props - Success: ${JSON.stringify(response.data)}`);
        res.json(response.data);
    }
    catch (err) {
        console.error(`[FRONTEND PROXY] GET /api/map-props - Error:`, err.message);
        if (err.response) {
            console.error(`[FRONTEND PROXY] GET /api/map-props - Backend error:`, err.response.data);
        }
        res.status(500).json({ error: 'Failed to fetch map props' });
    }
});
app.post('/api/map-props', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/map-props`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to place prop' });
    }
});
// Proxy for assets API
app.get('/api/assets', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/assets`;
        if (req.query.campaign_id) {
            url += `?campaign_id=${encodeURIComponent(req.query.campaign_id)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});
app.post('/api/assets', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/assets`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create asset' });
    }
});
app.put('/api/assets/:id', async (req, res) => {
    try {
        const response = await axios.put(`${BACKEND_URL}/api/assets/${req.params.id}`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update asset' });
    }
});
app.delete('/api/assets/:id', async (req, res) => {
    try {
        const response = await axios.delete(`${BACKEND_URL}/api/assets/${req.params.id}`);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});
// Proxy for actors API
app.get('/api/actors', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/actors`;
        if (req.query.campaign_id) {
            url += `?campaign_id=${encodeURIComponent(req.query.campaign_id)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch actors' });
    }
});
app.post('/api/actors', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/actors`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create actor' });
    }
});
// Proxy for journals API
app.get('/api/journals', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/journals`;
        if (req.query.campaign_id) {
            url += `?campaign_id=${encodeURIComponent(req.query.campaign_id)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch journals' });
    }
});
app.post('/api/journals', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/journals`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create journal' });
    }
});
// Proxy for campaign permissions API
app.get('/api/campaign_permissions', async (req, res) => {
    try {
        let url = `${BACKEND_URL}/api/campaign_permissions`;
        if (req.query.campaign_id) {
            url += `?campaign_id=${encodeURIComponent(req.query.campaign_id)}`;
        }
        const response = await axios.get(url);
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch campaign permissions' });
    }
});
app.post('/api/campaign_permissions', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/campaign_permissions`, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update campaign permissions' });
    }
});
// Token borders API
app.get('/api/token-borders', async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/token-borders`);
        res.json(response.data);
    }
    catch (err) {
        console.error('Error fetching token borders from backend:', err);
        res.status(500).json({ error: 'Failed to load token borders' });
    }
});
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const logMsg = `UPLOAD: ${req.file ? req.file.originalname : 'No file'} - user_id:${req.body.user_id} campaign_id:${req.body.campaign_id}\n`;
    fs.appendFileSync('frontend.log', logMsg);
    console.log(logMsg);
    try {
        const form = new FormData();
        if (req.file) {
            form.append('file', req.file.buffer, req.file.originalname || 'file.png');
        }
        if (req.body.user_id)
            form.append('user_id', req.body.user_id);
        if (req.body.campaign_id)
            form.append('campaign_id', req.body.campaign_id);
        if (req.body.upload_type)
            form.append('upload_type', req.body.upload_type);
        console.log(`UPLOAD: Forwarding to backend...`);
        const response = await axios.post(`${BACKEND_URL}/api/upload`, form, {
            headers: form.getHeaders(),
            timeout: 30000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        console.log('UPLOAD: Success');
        fs.appendFileSync('frontend.log', 'UPLOAD: Success\n');
        res.json(response.data);
    }
    catch (err) {
        const errMsg = `UPLOAD ERROR: ${err.code || err.name}: ${err.message}`;
        console.error(errMsg);
        fs.appendFileSync('frontend.log', errMsg + '\n');
        if (err.response) {
            console.error(`UPLOAD ERROR: Backend status ${err.response.status}:`, err.response.data);
            fs.appendFileSync('frontend.log', `UPLOAD ERROR: Backend status ${err.response.status}\n`);
        }
        res.status(500).json({ error: 'Failed to upload image', details: err.message });
    }
});
app.post('/api/campaign-background-upload', upload.single('image'), async (req, res) => {
    const logMsg = `CAMPAIGN BACKGROUND UPLOAD: ${req.file ? req.file.originalname : 'No file'} - user_id:${req.body.user_id} campaign_id:${req.body.campaign_id}\n`;
    fs.appendFileSync('frontend.log', logMsg);
    console.log(logMsg);
    try {
        const form = new FormData();
        if (req.file) {
            form.append('image', req.file.buffer, req.file.originalname || 'image.png');
        }
        if (req.body.crop)
            form.append('crop', req.body.crop);
        if (req.body.user_id)
            form.append('user_id', req.body.user_id);
        if (req.body.campaign_id)
            form.append('campaign_id', req.body.campaign_id);
        console.log(`CAMPAIGN BACKGROUND UPLOAD: Forwarding to backend...`);
        const response = await axios.post(`${BACKEND_URL}/api/campaign-background-upload`, form, {
            headers: form.getHeaders(),
            timeout: 30000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        console.log('CAMPAIGN BACKGROUND UPLOAD: Success');
        fs.appendFileSync('frontend.log', 'CAMPAIGN BACKGROUND UPLOAD: Success\n');
        res.json(response.data);
    }
    catch (err) {
        const errMsg = `CAMPAIGN BACKGROUND UPLOAD ERROR: ${err.code || err.name}: ${err.message}`;
        console.error(errMsg);
        fs.appendFileSync('frontend.log', errMsg + '\n');
        if (err.response) {
            console.error(`CAMPAIGN BACKGROUND UPLOAD ERROR: Backend status ${err.response.status}:`, err.response.data);
            fs.appendFileSync('frontend.log', `CAMPAIGN BACKGROUND UPLOAD ERROR: Backend status ${err.response.status}\n`);
        }
        res.status(500).json({ error: 'Failed to upload campaign background image', details: err.message });
    }
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    fs.appendFileSync('frontend.log', `Uncaught Exception: ${err.message}\n${err.stack}\n`);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    fs.appendFileSync('frontend.log', `Unhandled Rejection: ${reason}\n`);
});
const server = app.listen(PORT, () => {
    console.log(`[FRONTEND] Running at http://${process.env.SERVER_HOST || 'localhost'}:${PORT}`);
});
// Keep the server alive
server.keepAliveTimeout = 60000;
server.headersTimeout = 65000;
// Prevent the process from exiting
setInterval(() => {
    // Keep alive
}, 30000);
//# sourceMappingURL=index.js.map