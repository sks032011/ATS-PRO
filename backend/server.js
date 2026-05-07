require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
// app.use(cors());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Changin to Vercel Url
    methods: ['GET', 'POST', 'DELETE'],
}));

// import Routes
const uploadRoutes = require('./routes/uploadRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');



// middleware
app.use(express.json({ limit: '10mb' }));//if user wants to type big job descr s
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// db connectn
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/analyze', analyzeRoutes); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));