import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { uploadImageToSupabase } from './storageUtils.js';

// Fallback function when OpenAI enhancement fails
async function handleEnhancementFallback(
    imagePath: string,
    fileName?: string,
    maxWidth: number = 512,
    maxHeight: number = 512
): Promise<string> {
    try {
        console.log('🔄 Using fallback: processing original image without enhancement...');

        // Read and resize the original image
        const imageBuffer = fs.readFileSync(imagePath);

        const resizedImageBuffer = await sharp(imageBuffer)
            .resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toBuffer();

        // Generate filename for fallback
        const fallbackFileName = fileName ? `fallback_${fileName}` : `fallback_${Date.now()}.jpg`;

        // Upload to Supabase
        const supabaseUrl = await uploadImageToSupabase(resizedImageBuffer, fallbackFileName);

        console.log(`✅ Fallback successful: ${supabaseUrl}`);
        return supabaseUrl;

    } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw new Error('Both enhancement and fallback processing failed');
    }
}

export async function enhanceImageForPortrait(
    imagePath: string,
    fileName?: string,
    maxWidth: number = 512,
    maxHeight: number = 512
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
        formData.append('prompt', 'make the object in this image look like a professional portrait was taken. do NOT change the object fundamentally. just make it look pro. preference for white backgrounds');
        formData.append('model', 'gpt-image-1');
        formData.append('quality', 'low');
        formData.append('size', 'auto');
        formData.append('background', 'auto');

        // Make the API request with retry logic
        let response;
        let lastError;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempting OpenAI Image Edit API (attempt ${attempt}/${maxRetries})...`);

                response = await fetch('https://api.openai.com/v1/images/edits', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: formData
                });

                if (response.ok) {
                    console.log(`✅ OpenAI API succeeded on attempt ${attempt}`);
                    break; // Success!
                }

                const errorText = await response.text();
                lastError = {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                };

                console.warn(`⚠️ OpenAI API failed on attempt ${attempt}:`, lastError);

                // If it's a server error (5xx), retry. If client error (4xx), don't retry
                if (response.status >= 400 && response.status < 500) {
                    console.error('Client error - not retrying:', lastError);
                    break;
                }

                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries) {
                    const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    console.log(`Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

            } catch (fetchError) {
                console.warn(`Network error on attempt ${attempt}:`, fetchError);
                lastError = fetchError;

                if (attempt < maxRetries) {
                    const waitTime = Math.pow(2, attempt) * 1000;
                    console.log(`Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        if (!response || !response.ok) {
            console.error('❌ All OpenAI API attempts failed. Falling back to original image.');
            console.error('Final error:', lastError);

            // Fallback: Use the original image instead of enhanced
            return await handleEnhancementFallback(imagePath, fileName, maxWidth, maxHeight);
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