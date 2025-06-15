import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import detectObjectRouter from './detect-object.js';
import analyzeImageRouter from './analyze-image.js';
import testSupabaseRouter from './test-supabase.js';
import debugSupabaseRouter from './debug-supabase.js';

dotenv.config();

// Ensure uploads directory exists (for temporary files)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const app = express();

// Configure CORS - allow both local development and Railway deployment
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://bejewelled-llama-eb8279.netlify.app', 'https://tori-production.up.railway.app'] // Replace your-frontend-domain.com with actual frontend domain
        : ['http://localhost:5173', 'http://localhost:3000'], // Local development
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register routes
app.use('/api', debugSupabaseRouter);  // Debug route first
app.use('/api', testSupabaseRouter);   // Test route second
app.use('/api', detectObjectRouter);
app.use('/api', analyzeImageRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 