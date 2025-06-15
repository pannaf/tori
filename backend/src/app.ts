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

app.use(cors());
app.use(express.json());

// Register routes
app.use('/api', debugSupabaseRouter);  // Debug route first
app.use('/api', testSupabaseRouter);   // Test route second
app.use('/api', detectObjectRouter);
app.use('/api', analyzeImageRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 