const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const https = require('https');
const http = require('http');
const selfsigned = require('selfsigned');
const { initializeDatabase } = require('./db/database');

const app = express();
const HTTP_PORT  = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/bills',     require('./routes/bills'));
app.use('/api/payments',  require('./routes/payments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/contact',   require('./routes/contact'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'PowerScan API', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start both HTTP and HTTPS servers
async function start() {
  await initializeDatabase();

  // Get local IP for display
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIP = 'YOUR_PC_IP';
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }

  // Generate self-signed certificate (valid for 1 year)
  console.log('  🔐 Generating self-signed SSL certificate...');
  const attrs = [{ name: 'commonName', value: localIP }];
  const pems  = selfsigned.generate(attrs, {
    days: 365,
    extensions: [
      { name: 'subjectAltName', altNames: [
        { type: 7, ip: localIP },
        { type: 7, ip: '127.0.0.1' },
        { type: 2, value: 'localhost' }
      ]}
    ]
  });

  // Start HTTP server
  http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`\n  ⚡ PowerScan Server Started!\n`);
    console.log(`  💻 On this PC (HTTP):`);
    console.log(`     http://localhost:${HTTP_PORT}`);
    console.log(`\n  📱 On your PHONE (HTTPS — camera works!):`);
    console.log(`     https://${localIP}:${HTTPS_PORT}`);
    console.log(`\n  ⚠️  Phone will show security warning — tap "Advanced" → "Proceed" to continue`);
    console.log(`\n  Demo Login:    rajesh@example.com / demo123`);
    console.log(`  Demo QR Codes: QR-AP-VJA-001 through QR-AP-NLR-005\n`);
  });

  // Start HTTPS server
  https.createServer({ key: pems.private, cert: pems.cert }, app)
    .listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`  ✅ HTTPS server ready on port ${HTTPS_PORT}`);
    });
}

start().catch(err => { console.error('Failed to start server:', err); process.exit(1); });
