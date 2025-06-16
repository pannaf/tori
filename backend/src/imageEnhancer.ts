import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { uploadImageToSupabase } from './storageUtils.js';

export async function enhanceImageForPortrait(
    imagePath: string,
    fileName?: string,
    maxWidth: number = 256,
    maxHeight: number = 256
): Promise<string> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not set in environment variables');
        }

        // Initialize OpenAI client inside the function to ensure env vars are loaded
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        console.log(`Enhancing image: ${imagePath}`);

        // Read the image file
        const imageBuffer = fs.readFileSync(imagePath);

        // Determine the MIME type based on file extension
        const fileExtension = path.extname(imagePath).toLowerCase();
        let mimeType = 'image/jpeg'; // default
        switch (fileExtension) {
            case '.png':
                mimeType = 'image/png';
                break;
            case '.webp':
                mimeType = 'image/webp';
                break;
            case '.jpg':
            case '.jpeg':
                mimeType = 'image/jpeg';
                break;
            default:
                mimeType = 'image/jpeg';
        }

        // Create FormData for the API request
        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer], { type: mimeType }), path.basename(imagePath));
        formData.append('prompt', 'make the object in this image look like a professional portrait was taken. do NOT change the object fundamentally. just make it look pro. preference for transparent backgrounds');
        formData.append('model', 'gpt-image-1');
        formData.append('quality', 'low');
        formData.append('size', 'auto');
        formData.append('background', 'auto');

        // Make the API request
        const response = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI Image Edit API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`OpenAI Image Edit API error: ${response.statusText} (${response.status})`);
        }

        const result = await response.json();

        if (!result.data || !result.data[0] || !result.data[0].b64_json) {
            throw new Error('No enhanced image data received from OpenAI');
        }

        // Decode the base64 image data
        const base64Data = result.data[0].b64_json;
        const imageData = Buffer.from(base64Data, 'base64');

        // Resize the enhanced image to be smaller
        console.log(`Resizing enhanced image to max ${maxWidth}x${maxHeight} pixels...`);
        const resizedImageBuffer = await sharp(imageData)
            .resize(maxWidth, maxHeight, {
                fit: 'inside', // Maintain aspect ratio
                withoutEnlargement: true // Don't enlarge small images
            })
            .jpeg({ quality: 85 }) // Compress with good quality
            .toBuffer();

        // Generate a filename if not provided
        const enhancedFileName = fileName || `enhanced_${Date.now()}.jpg`;

        // Upload the resized image to Supabase
        console.log('Uploading resized enhanced image to Supabase...');
        const supabaseUrl = await uploadImageToSupabase(resizedImageBuffer, enhancedFileName);

        console.log(`Successfully enhanced, resized, and uploaded image to Supabase: ${supabaseUrl}`);
        return supabaseUrl;

    } catch (error) {
        console.error('Error enhancing image:', error);
        throw error;
    }
} 