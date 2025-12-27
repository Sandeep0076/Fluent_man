require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// Import routes
const journalRoutes = require('./backend/routes/journal');
const vocabularyRoutes = require('./backend/routes/vocabulary');
const phrasesRoutes = require('./backend/routes/phrases');
const progressRoutes = require('./backend/routes/progress');
const translateRoutes = require('./backend/routes/translate');
const settingsRoutes = require('./backend/routes/settings');
const dataRoutes = require('./backend/routes/data');

// API Routes
app.use('/api/journal', journalRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/phrases', phrasesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/data', dataRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'DeutschTagebuch API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     DeutschTagebuch Server Started         ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`📊 API endpoints: http://localhost:${PORT}/api`);
  console.log(`💾 Database: Supabase (PostgreSQL)`);
  console.log('');
  console.log('Available API endpoints:');
  console.log('  - GET  /api/health');
  console.log('  - POST /api/journal/entry');
  console.log('  - GET  /api/journal/entries');
  console.log('  - GET  /api/vocabulary');
  console.log('  - GET  /api/vocabulary/stats');
  console.log('  - GET  /api/phrases');
  console.log('  - GET  /api/progress/stats');
  console.log('  - GET  /api/progress/streak');
  console.log('  - POST /api/translate');
  console.log('  - GET  /api/settings');
  console.log('  - GET  /api/data/export');
  console.log('  - POST /api/data/import');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});