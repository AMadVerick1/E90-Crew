const express = require('express');
const path = require('path');
const apiRoutes = require('./server/routes');
const { cleanExpiredSessions } = require('./server/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (clean format)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Mount API routes
app.use('/api', apiRoutes);

// Static assets
app.use('/Assets', express.static(path.join(__dirname, 'Assets')));
app.use('/Styles', express.static(path.join(__dirname, 'Styles')));
app.use('/Scripts', express.static(path.join(__dirname, 'Scripts')));
app.use('/Pages', express.static(path.join(__dirname, 'Pages')));

// Friendly HTML URL routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Pages', 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'Pages', 'about.html'));
});

app.get('/crew', (req, res) => {
  res.sendFile(path.join(__dirname, 'Pages', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'Pages', 'contact.html'));
});

app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'Pages', 'contact.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'Pages', 'Admin.html'));
});

// Periodic session cleanup (every 1 hour)
if (require.main === module) {
  setInterval(() => {
    try {
      cleanExpiredSessions();
    } catch (err) {
      console.error('Session cleanup error:', err);
    }
  }, 60 * 60 * 1000);
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start listening if run directly
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 E90 Social Club Full-Stack Server Running`);
    console.log(`🌐 Public Website: http://localhost:${PORT}`);
    console.log(`🛡️  Admin Panel:   http://localhost:${PORT}/admin`);
    console.log(`🔑 Admin Login:    admin / admin123`);
    console.log(`===============================================`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nClosing server...');
    server.close(() => {
      console.log('Server closed. Goodbye!');
      process.exit(0);
    });
  });
}

module.exports = app;
