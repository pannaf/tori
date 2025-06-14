import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import detectObjectRouter from './detect-object.js';
import analyzeImageRouter from './analyze-image.js';

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Ensure crops directory exists
const cropsDir = path.join(process.cwd(), 'public/crops');
if (!fs.existsSync(cropsDir)) {
    fs.mkdirSync(cropsDir, { recursive: true });
}

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Register routes
app.use('/api', detectObjectRouter);
app.use('/api', analyzeImageRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 