const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const axios = require('axios');
const fs = require('fs');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  console.log('POST /login chiamato con:', req.body);
  const { username, password } = req.body;
  try {
    const response = await axios.post('http://localhost:8080/login', { username, password }, {
      headers: { 'Content-Type': 'application/json' }
    });
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

app.get('/api/map', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:8080/map');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map data' });
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

app.post('/api/campaigns', async (req, res) => {
  const logMsg = `Received POST /api/campaigns at frontend proxy: ${JSON.stringify(req.body)}\n`;
  console.log(logMsg);
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

app.get('/api/rules', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:8080/api/rules');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rules from backend' });
  }
});

app.post('/api/rules', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8080/api/rules', req.body, { headers: { 'Content-Type': 'application/json' } });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add rule' });
  }
});

app.put('/api/rules', async (req, res) => {
  try {
    const response = await axios.put('http://localhost:8080/api/rules', req.body, { headers: { 'Content-Type': 'application/json' } });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

app.delete('/api/rules', async (req, res) => {
  try {
    const response = await axios.delete('http://localhost:8080/api/rules', { data: req.body, headers: { 'Content-Type': 'application/json' } });
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
app.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
});