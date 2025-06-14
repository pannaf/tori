import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface DetectionResult {
    boundingBox: BoundingBox;
    confidence: number;
    label: string;
}

interface LandingAIResult {
    label: string;
    score: number;
    bounding_box: [number, number, number, number]; // [x1, y1, x2, y2]
}

interface LandingAIResponse {
    data: LandingAIResult[][];
}

export async function detectObject(imagePath: string, objectName: string): Promise<DetectionResult[]> {
    if (!process.env.LANDING_AI_API_KEY) {
        throw new Error('Landing AI API key is not set in environment variables');
    }

    // Debug: Log the API key (first few characters only for security)
    const apiKey = process.env.LANDING_AI_API_KEY;
    console.log('API Key check:', {
        exists: !!apiKey,
        length: apiKey?.length,
        firstChars: apiKey?.substring(0, 10) + '...',
        type: typeof apiKey
    });

    const url = 'https://api.va.landing.ai/v1/tools/agentic-object-detection';
    const buffer = fs.readFileSync(imagePath);

    const formData = new FormData();
    formData.append('image', new Blob([buffer]), path.basename(imagePath));
    formData.append('prompts', objectName);
    formData.append('model', 'agentic');

    try {
        console.log(`\nSending request to Landing AI for object: "${objectName}"`);
        console.log('Request details:', {
            url,
            imageName: path.basename(imagePath),
            prompt: objectName
        });

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                Authorization: `Basic ${apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Landing AI API error: ${response.statusText} (${response.status})`);
        }

        const data = await response.json() as LandingAIResponse;
        console.log('\nRaw API Response:', JSON.stringify(data, null, 2));

        if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
            console.log('Warning: No detection results in response');
            return [];
        }

        // Get the first array of results
        const detections = data.data[0];
        if (!Array.isArray(detections)) {
            console.log('Warning: Detection results are not in expected format');
            return [];
        }

        // Convert the Landing AI format to our format
        const results = detections.map((result: LandingAIResult) => {
            const [x1, y1, x2, y2] = result.bounding_box;
            return {
                boundingBox: {
                    x: Math.max(0, x1),
                    y: Math.max(0, y1),
                    width: Math.max(1, x2 - x1),
                    height: Math.max(1, y2 - y1)
                },
                confidence: result.score,
                label: result.label
            };
        });

        console.log(`\nProcessed ${results.length} detection(s) for "${objectName}"`);
        return results;

    } catch (error) {
        console.error('Error detecting object:', error);
        throw error;
    }
}

export async function cropImage(
    imagePath: string,
    boundingBox: BoundingBox,
    outputPath: string
): Promise<void> {
    try {
        // Get image dimensions
        const metadata = await sharp(imagePath).metadata();
        const imageWidth = metadata.width || 0;
        const imageHeight = metadata.height || 0;

        // Add padding to the crop
        const padding = 20; // pixels of padding
        const x = Math.max(0, boundingBox.x - padding);
        const y = Math.max(0, boundingBox.y - padding);
        const width = Math.min(imageWidth - x, boundingBox.width + (padding * 2));
        const height = Math.min(imageHeight - y, boundingBox.height + (padding * 2));

        // Ensure the crop dimensions are valid
        if (width <= 0 || height <= 0) {
            throw new Error('Invalid crop dimensions');
        }

        console.log('Cropping image with dimensions:', {
            x, y, width, height,
            originalBox: boundingBox,
            imageSize: { width: imageWidth, height: imageHeight }
        });

        await sharp(imagePath)
            .extract({ left: x, top: y, width, height })
            .toFile(outputPath);

        console.log('Successfully saved cropped image to:', outputPath);
    } catch (error) {
        console.error('Error cropping image:', error);
        throw error;
    }
}