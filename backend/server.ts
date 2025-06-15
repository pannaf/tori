import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { analyzeImage } from './utils/imageAnalyzer.js';
import { detectObject, cropImage } from '../src/utils/objectDetector.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

// Configure CORS
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://your-frontend-domain.com', 'https://tori-production.up.railway.app'] // Replace your-frontend-domain.com with actual frontend domain
        : ['http://localhost:5173', 'http://localhost:3000'], // Local development
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};
app.use(cors(corsOptions));

app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images
app.use('/crops', express.static(path.join(__dirname, 'public/crops')));

// Ensure the crops directory exists
const cropsDir = path.join(__dirname, 'public/crops');
if (!fs.existsSync(cropsDir)) {
    fs.mkdirSync(cropsDir, { recursive: true });
}

console.log('Server initialized. Directories:', {
    uploads: uploadsDir,
    crops: cropsDir
});

// New endpoint for image analysis
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        console.log('Processing uploaded file:', req.file.path);

        // Step 1: Analyze with GPT-4V
        const gptAnalysis = await analyzeImage(req.file.path);
        console.log('GPT-4V Analysis:', gptAnalysis);

        // Step 2: Process first 3 objects with Landing AI and crop images
        const objectsToProcess = gptAnalysis.objects.slice(0, 3);
        const processedObjects = await Promise.all(
            objectsToProcess.map(async (obj) => {
                try {
                    // Detect object with Landing AI
                    const detections = await detectObject(req.file!.path, obj.name);

                    if (detections.length > 0) {
                        // Use the first detection (highest confidence)
                        const detection = detections[0];

                        // Generate a unique filename for the cropped image
                        const timestamp = Date.now();
                        const safeObjectName = obj.name.toLowerCase().replace(/\s+/g, '_');
                        const cropFileName = `${safeObjectName}_${timestamp}.jpg`;
                        const cropPath = path.join(cropsDir, cropFileName);

                        // Crop the image
                        await cropImage(req.file!.path, detection.boundingBox, cropPath);

                        // Return object with crop URL
                        return {
                            ...obj,
                            imageUrl: `/crops/${cropFileName}`,
                            confidence: detection.confidence,
                            boundingBox: detection.boundingBox
                        };
                    }

                    return obj;
                } catch (error) {
                    console.error(`Error processing object "${obj.name}":`, error);
                    return obj;
                }
            })
        );

        // Clean up the uploaded file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting uploaded file:', err);
        });

        // Send the response
        res.json({
            ...gptAnalysis,
            objects: processedObjects
        });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

app.post('/api/crop-image', upload.single('image'), async (req, res) => {
    console.log('Received image upload request');

    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ success: false, error: 'No image file provided' });
        }

        console.log('Processing file:', req.file.originalname);

        const outputFilename = `${Date.now()}.jpg`;
        const outputPath = path.join(cropsDir, outputFilename);

        console.log('Output path:', outputPath);

        // Process the image with sharp
        await sharp(req.file.path)
            .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(outputPath);

        console.log('Image processed successfully');

        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);
        console.log('Temporary file cleaned up');

        const imagePath = `/crops/${outputFilename}`;
        console.log('Sending response with image path:', imagePath);

        res.json({
            success: true,
            imagePath: imagePath
        });
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ success: false, error: 'Failed to process image' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Serving images from: ${cropsDir}`);
}); 