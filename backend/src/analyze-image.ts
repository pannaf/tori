import { Router } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { detectObject, cropImage } from './objectDetector.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

interface ObjectWithCost {
    name: string;
    estimated_cost_usd: number;
    imageUrl?: string;  // URL to the cropped image
}

interface AnalysisResult {
    objects: ObjectWithCost[];
    room: string;
    total_estimated_value_usd: number;
}

// Ensure the crops directory exists
const cropsDir = path.join(process.cwd(), 'public/crops');
if (!fs.existsSync(cropsDir)) {
    fs.mkdirSync(cropsDir, { recursive: true });
}

router.post('/analyze-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not set in environment variables');
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Read and convert the image to base64
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');

        const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "list all the objects in this image and estimate their costs. ALL of them. be comprehensive and thorough. don't say what it's on or touching or under or above. also do not attempt to indicate what size it is. that's just confusing. do not do compound objects, i.e., nothing that uses with to combine multiple objects. instead of large plant in black pot, for example, it should be an object for plant and an object for black pot. just list each individual object with its estimated cost in USD. Be realistic with cost estimates based on average market prices. Also give your best guess for which room in a home it is- the room can be one of the following: Living Room, Kitchen, Bedroom, Bathroom, Office, Garage, Dining Room. You should also include the object category, which can be one of the following: Electronics, Furniture, Appliances, Decorative, Sports, Tools, Other.\n\noutput format below. Return raw JSON only. Do not include triple backticks or formatting — just the raw JSON.\n\n{\"objects\": [{\"name\": \"object name\", \"category\": \"object category\", \"description\": \"object description\", \"estimated_cost_usd\": number}], \"room\": \"room name\", \"total_estimated_value_usd\": sum_of_all_objects}"
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response content from GPT-4V');
        }

        // Parse the JSON response
        try {
            const result = JSON.parse(content) as AnalysisResult;

            // Process only the first 3 objects
            const objectsToProcess = result.objects.slice(0, 3);

            // For each object, detect its location and crop the image
            const objectsWithImages = await Promise.all(objectsToProcess.map(async (obj) => {
                try {
                    const detections = await detectObject(req.file!.path, obj.name);
                    if (detections.length > 0) {
                        // Use the first detection (highest confidence)
                        const detection = detections[0];
                        const cropFileName = `${obj.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
                        const cropPath = path.join(cropsDir, cropFileName);

                        await cropImage(req.file!.path, detection.boundingBox, cropPath);

                        return {
                            ...obj,
                            imageUrl: `/crops/${cropFileName}` // URL path to the cropped image
                        };
                    }
                } catch (error) {
                    console.error(`Error processing object ${obj.name}:`, error);
                }
                return obj;
            }));

            // Update the result with the processed objects
            const finalResult = {
                ...result,
                objects: objectsWithImages
            };

            // Clean up the uploaded file
            fs.unlinkSync(req.file.path);

            res.json(finalResult);
        } catch (error) {
            console.error('Error parsing GPT-4V response:', content);
            throw new Error('Failed to parse GPT-4V response as JSON');
        }
    } catch (error) {
        console.error('Error analyzing image:', error);
        // Clean up the temporary file in case of error
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to analyze image' });
    }
});

export default router; 