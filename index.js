const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const dotenv = require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/users', require('./routes/userRoutes'));
app.use('/mechanics', require('./routes/mechanicRoutes'));
app.use('/managers', require('./routes/managerRoutes'));

app.listen(PORT, () => console.log(`Serveur démarré sur le port
${PORT}`));