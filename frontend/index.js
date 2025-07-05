const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const axios = require('axios');
const fs = require('fs');
const multer = require('multer');
const upload = multer();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Serve images from backend/images directory
app.use('/backend/images', express.static(path.join(__dirname, '..', 'backend', 'images')));
app.use('/images', express.static(path.join(__dirname, '..', 'backend', 'images')));

let loggedIn = false;

app.get('/', (req, res) => {
  if (loggedIn) {
    res.redirect('/campaigns');
  } else {
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
    const response = await axios.post('http://localhost:8080/login', { username, password }, {
      headers: { 'Content-Type': 'application/json' }
    });
    // console.log('FRONTEND /login backend response:', response.data);
    if (
      (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) ||
      (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
      req.xhr
    ) {
      // AJAX/JS login: respond with JSON
      if (response.data.success) {
        loggedIn = true;
      }
      return res.json(response.data);
    }
    if (response.data.success) {
      // Traditional form: redirect to map
      req.session.user = username;
      return res.redirect('/map');
    } else {
      return res.render('login', { error: response.data.error || 'Login failed', register: false });
    }
  } catch (err) {
    // console.error('FRONTEND /login error:', err.message, err.response ? err.response.data : '');
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      return res.json({ success: false, error: 'Backend error' });
    }
    return res.render('login', { error: 'Backend error', register: false });
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const response = await axios.post('http://localhost:8080/register', { username, password }, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (
      (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) ||
      (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
      req.xhr
    ) {
      // AJAX/JS register: respond with JSON
      if (response.data.success) {
        loggedIn = true;
      }
      return res.json(response.data);
    }
    if (response.data.success) {
      loggedIn = true;
      res.redirect('/login');
    } else {
      res.render('login', { error: response.data.message, register: true });
    }
  } catch (err) {
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
  res.render('map');
});

app.get('/api/map', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:8080/map');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

// Maps API proxies
app.get('/api/maps', async (req, res) => {
  try {
    let url = 'http://localhost:8080/api/maps';
    if (req.query.campaign_id) {
      url += `?campaign_id=${encodeURIComponent(req.query.campaign_id)}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
});

app.get('/api/maps/:id', async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:8080/api/maps/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map' });
  }
});

app.post('/api/maps', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/api/maps', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create map' });
  }
});

app.put('/api/maps/:id', async (req, res) => {
  try {
    const response = await axios.put(`http://localhost:8080/api/maps/${req.params.id}`, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update map' });
  }
});

app.delete('/api/maps/:id', async (req, res) => {
  try {
    const response = await axios.delete(`http://localhost:8080/api/maps/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete map' });
  }
});

// Scenes API proxies
app.get('/api/scenes', async (req, res) => {
  try {
    let url = 'http://localhost:8080/api/scenes';
    if (req.query.campaign_id) {
      url += `?campaign_id=${encodeURIComponent(req.query.campaign_id)}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scenes' });
  }
});

app.post('/api/scenes', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/api/scenes', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create scene' });
  }
});

app.put('/api/scenes/:id', async (req, res) => {
  try {
    const response = await axios.put(`http://localhost:8080/api/scenes/${req.params.id}`, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update scene' });
  }
});

app.delete('/api/scenes/:id', async (req, res) => {
  try {
    const response = await axios.delete(`http://localhost:8080/api/scenes/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete scene' });
  }
});

// Proxy GET and POST requests for campaigns to the Dart backend
app.get('/api/campaigns', async (req, res) => {
  try {
    let url = 'http://localhost:8080/campaigns';
    if (req.query.username) {
      url += `?username=${encodeURIComponent(req.query.username)}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get single campaign
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:8080/campaigns/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

app.post('/api/campaigns', async (req, res) => {
  const logMsg = `Received POST /api/campaigns at frontend proxy: ${JSON.stringify(req.body)}\n`;
  fs.appendFileSync('frontend.log', logMsg);
  try {
    const response = await axios.post('http://localhost:8080/campaigns', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.post('/api/campaigns/edit', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/campaigns/edit', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit campaign' });
  }
});

app.post('/campaigns/delete', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/campaigns/delete', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

app.get('/api/rules', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:8080/rules');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rules from backend' });
  }
});

app.get('/api/user_id', async (req, res) => {
  try {
    let url = 'http://localhost:8080/api/user_id';
    if (req.query.username) {
      url += `?username=${encodeURIComponent(req.query.username)}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user_id from backend' });
  }
});
app.post('/api/rules', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/rules', req.body, { headers: { 'Content-Type': 'application/json' } });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add rule' });
  }
});

app.put('/api/rules', async (req, res) => {
  try {
    const response = await axios.put('http://localhost:8080/rules', req.body, { headers: { 'Content-Type': 'application/json' } });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

app.delete('/api/rules', async (req, res) => {
  try {
    const response = await axios.delete('http://localhost:8080/rules', { data: req.body, headers: { 'Content-Type': 'application/json' } });
    res.json(response.data);
  } catch (err) {
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
    const response = await axios.post('http://localhost:8080/api/reset_password', req.body, { headers: { 'Content-Type': 'application/json' } });
    res.json(response.data);
  } catch (err) {
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
  try {
    let url = 'http://localhost:8080/api/map-tokens';
    if (req.query.map_id) {
      url += `?map_id=${encodeURIComponent(req.query.map_id)}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map tokens' });
  }
});

app.post('/api/map-tokens', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/api/map-tokens', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place token' });
  }
});

app.put('/api/map-tokens/:id', async (req, res) => {
  try {
    const response = await axios.put(`http://localhost:8080/api/map-tokens/${req.params.id}`, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update token' });
  }
});

app.get('/api/map-backgrounds', async (req, res) => {
  try {
    let url = 'http://localhost:8080/api/map-backgrounds';
    if (req.query.map_id) {
      url += `?map_id=${encodeURIComponent(req.query.map_id)}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map backgrounds' });
  }
});

app.post('/api/map-backgrounds', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/api/map-backgrounds', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place background' });
  }
});

app.get('/api/map-audio', async (req, res) => {
  try {
    let url = 'http://localhost:8080/api/map-audio';
    if (req.query.map_id) {
      url += `?map_id=${encodeURIComponent(req.query.map_id)}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map audio' });
  }
});

app.post('/api/map-audio', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/api/map-audio', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place audio' });
  }
});

app.get('/api/map-props', async (req, res) => {
  try {
    let url = 'http://localhost:8080/api/map-props';
    if (req.query.map_id) {
      url += `?map_id=${encodeURIComponent(req.query.map_id)}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map props' });
  }
});

app.post('/api/map-props', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/api/map-props', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place prop' });
  }
});

// Proxy for assets API
app.get('/api/assets', async (req, res) => {
  try {
    let url = 'http://localhost:8080/api/assets';
    if (req.query.campaign_id) {
      url += `?campaign_id=${encodeURIComponent(req.query.campaign_id)}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

app.post('/api/assets', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/api/assets', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

app.put('/api/assets/:id', async (req, res) => {
  try {
    const response = await axios.put(`http://localhost:8080/api/assets/${req.params.id}`, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

app.delete('/api/assets/:id', async (req, res) => {
  try {
    const response = await axios.delete(`http://localhost:8080/api/assets/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const logMsg = `UPLOAD: ${req.file ? req.file.originalname : 'No file'} - user_id:${req.body.user_id} campaign_id:${req.body.campaign_id}\n`;
  fs.appendFileSync('frontend.log', logMsg);
  console.log(logMsg);
  try {
    const FormData = require('form-data');
    const form = new FormData();
    if (req.file) {
      form.append('file', req.file.buffer, req.file.originalname || 'file.png');
    }
    if (req.body.user_id) form.append('user_id', req.body.user_id);
    if (req.body.campaign_id) form.append('campaign_id', req.body.campaign_id);
    if (req.body.upload_type) form.append('upload_type', req.body.upload_type);
    console.log(`UPLOAD: Forwarding to backend...`);
    const response = await axios.post('http://localhost:8080/api/upload', form, {
      headers: form.getHeaders(),
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log('UPLOAD: Success');
    fs.appendFileSync('frontend.log', 'UPLOAD: Success\n');
    res.json(response.data);
  } catch (err) {
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
    const FormData = require('form-data');
    const form = new FormData();
    if (req.file) {
      form.append('image', req.file.buffer, req.file.originalname || 'image.png');
    }
    if (req.body.crop) form.append('crop', req.body.crop);
    if (req.body.user_id) form.append('user_id', req.body.user_id);
    if (req.body.campaign_id) form.append('campaign_id', req.body.campaign_id);
    console.log(`CAMPAIGN BACKGROUND UPLOAD: Forwarding to backend...`);
    const response = await axios.post('http://localhost:8080/api/campaign-background-upload', form, {
      headers: form.getHeaders(),
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log('CAMPAIGN BACKGROUND UPLOAD: Success');
    fs.appendFileSync('frontend.log', 'CAMPAIGN BACKGROUND UPLOAD: Success\n');
    res.json(response.data);
  } catch (err) {
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
  console.log(`Frontend running at http://localhost:${PORT}`);
});

// Keep the server alive
server.keepAliveTimeout = 60000;
server.headersTimeout = 65000;

// Prevent the process from exiting
setInterval(() => {
  // Keep alive
}, 30000);