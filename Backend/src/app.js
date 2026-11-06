const express = require('express');
require('dotenv').config();

const { connectDatabase } = require('./config/database');
const ticketRoutes = require('./routes/ticketRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/tickets', ticketRoutes);
  
// Start server
if (require.main === module) {
  const startServer = async () => {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  };

  startServer();
}

module.exports = app;
