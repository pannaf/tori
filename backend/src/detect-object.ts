import { Router } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { detectObject } from './objectDetector.js';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // Store files temporarily

router.post('/detect-object', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const objectName = req.body.object_name;
        if (!objectName) {
            return res.status(400).json({ error: 'No object name provided' });
        }

        // Use the existing Landing AI detection function
        const detectionResults = await detectObject(req.file.path, objectName);

        // Clean up the temporary file
        fs.unlinkSync(req.file.path);

        res.json({ objects: detectionResults });
    } catch (error) {
        console.error('Error processing image:', error);
        // Clean up the temporary file in case of error
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to process image' });
    }
});

export default router; 