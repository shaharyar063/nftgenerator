const express = require('express');
const path = require('path');
const { createServer } = require('http');

const app = express();
const server = createServer(app);

// Serve static files from client directory
app.use(express.static(path.join(__dirname, 'client')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});