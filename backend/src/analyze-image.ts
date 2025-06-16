import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { detectObject, cropImage } from './objectDetector.js';
import { uploadImageFileToSupabase } from './storageUtils.js';
import { getInventoryItems, getInventoryItemsByCategory, getInventoryItemsByRoom, updateInventoryItem, deleteInventoryItem } from './databaseUtils.js';
import { supabase } from './supabase.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Create authenticated Supabase client using user's token
function createAuthenticatedSupabaseClient(authToken: string) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        }
    });

    return supabase;
}

interface ObjectWithCost {
    name: string;
    category: string;
    description: string;
    estimated_cost_usd: number;
    imageUrl?: string;  // URL to the cropped image
    confidence?: number;
}

interface AnalysisResult {
    objects: ObjectWithCost[];
    room: string;
    total_estimated_value_usd: number;
}

// No auth middleware needed - using service role for storage
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
            model: "gpt-4.1-mini", // DO NOT CHANGE THIS MODEL MAME. THIS IS CORRECT as gpt-4.1-mini.
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "list all the objects in this image and estimate their costs. ALL of them. be comprehensive and thorough. don't say what it's on or touching or under or above. also do not attempt to indicate what size it is. that's just confusing. do not do compound objects, i.e., nothing that uses with to combine multiple objects. instead of large plant in black pot, for example, it should be an object for plant and an object for black pot. just list each individual object with its estimated cost in USD. Be realistic with cost estimates based on average market prices. Also give your best guess for which room in a home it is- the room can be one of the following: Living Room, Kitchen, Bedroom, Bathroom, Office, Garage, Dining Room. You should also include the object category, which can be one of the following: Electronics, Furniture, Appliances, Decorative, Sports, Tools, Other.\n\noutput format below. Return raw JSON only. Do not include triple backticks or formatting — just the raw JSON.\n\n```json\n{\"objects\": [{\"name\": \"object name\", \"category\": \"object category\", \"description\": \"object description\", \"estimated_cost_usd\": number}], \"room\": \"room name\", \"total_estimated_value_usd\": sum_of_all_objects}\n```"
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

                        // Create temporary file for the crop
                        const tempCropPath = path.join(os.tmpdir(), cropFileName);

                        // Crop the image to temporary file
                        await cropImage(req.file!.path, detection.boundingBox, tempCropPath);

                        // Upload the cropped image to Supabase Storage (using service role)
                        const imageUrl = await uploadImageFileToSupabase(tempCropPath, cropFileName);

                        // Clean up temporary file
                        fs.unlinkSync(tempCropPath);

                        return {
                            ...obj,
                            imageUrl: imageUrl, // URL to the image in Supabase Storage
                            confidence: detection.confidence
                        };
                    }
                } catch (error) {
                    console.error(`Error processing object ${obj.name}:`, error);
                }
                return obj;
            }));

            // DON'T save to database yet - let frontend handle that when user confirms
            console.log('AI detection complete, returning data to frontend');

            // Update the result with the processed objects (no database saves)
            const finalResult = {
                ...result,
                objects: objectsWithImages,
                message: 'AI detection complete - items ready for user confirmation'
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

// Get all inventory items
router.get('/inventory-items', async (req, res) => {
    try {
        const userId = req.query.userId as string;
        const items = await getInventoryItems(userId);
        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ error: 'Failed to fetch inventory items' });
    }
});

// Get inventory items by category
router.get('/inventory-items/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const userId = req.query.userId as string;
        const items = await getInventoryItemsByCategory(category, userId);
        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory items by category:', error);
        res.status(500).json({ error: 'Failed to fetch inventory items by category' });
    }
});

// Get inventory items by room
router.get('/inventory-items/room/:room', async (req, res) => {
    try {
        const { room } = req.params;
        const userId = req.query.userId as string;
        const items = await getInventoryItemsByRoom(room, userId);
        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory items by room:', error);
        res.status(500).json({ error: 'Failed to fetch inventory items by room' });
    }
});

// Authentication middleware for user-specific operations
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Add user to request object for use in route handlers
        (req as any).user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// Update an inventory item (requires authentication)
router.put('/inventory-items/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const user = (req as any).user;

        console.log('Updating item:', id, 'for user:', user.id);
        console.log('Updates received:', updates);

        // Add user validation - ensure the item belongs to the authenticated user
        // First check if the item exists and belongs to the user
        const { data: existingItem, error: fetchError } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError) {
            console.error('Error fetching item for update:', fetchError);
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Item not found or not authorized to update' });
            }
            return res.status(500).json({ error: 'Failed to verify item ownership' });
        }

        // Update the item
        const updatedItem = await updateInventoryItem(id, updates);
        console.log('Item updated successfully:', updatedItem);

        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
});

// Delete an inventory item (requires authentication)
router.delete('/inventory-items/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        // Verify the item belongs to the authenticated user
        const { data: existingItem, error: fetchError } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError) {
            console.error('Error fetching item for deletion:', fetchError);
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Item not found or not authorized to delete' });
            }
            return res.status(500).json({ error: 'Failed to verify item ownership' });
        }

        const success = await deleteInventoryItem(id);
        if (success) {
            res.json({ message: 'Item deleted successfully' });
        } else {
            res.status(404).json({ error: 'Item not found or could not be deleted' });
        }
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ error: 'Failed to delete inventory item' });
    }
});

export default router; 