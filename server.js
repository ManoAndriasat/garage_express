const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connecté"))
    .catch(err => console.error("Erreur de connexion à MongoDB", err));

// Routes
app.use('/users', require('./routes/userRoutes'));
app.use('/mechanics', require('./routes/mechanicRoutes'));
app.use('/managers', require('./routes/managerRoutes'));


app.listen(PORT, () => console.log(`Serveur démarré sur le port
${PORT}`));