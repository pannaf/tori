import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { detectObject, cropImage } from './objectDetector.js';
import { enhanceImageForPortrait } from './imageEnhancer.js';
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

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        }
    });

    return userSupabase;
}

interface ObjectWithCost {
    name: string;
    category: string;
    description: string;
    estimated_cost_usd: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    imageUrl?: string;  // URL to the enhanced image
    originalCropImageUrl?: string;  // URL to the original cropped image
    originalFullImageUrl?: string;  // URL to the original full image
    confidence?: number;
}

interface AnalysisResult {
    objects: ObjectWithCost[];
    room: string;
    total_estimated_value_usd: number;
    originalFullImageUrl?: string;
}

// In-memory storage for processing sessions (in production, use Redis or database)
const processingSessions = new Map<string, {
    status: 'processing' | 'complete' | 'error';
    objects: any[];
    completedCount: number;
    totalCount: number;
    room?: string;
    totalValue?: number;
    error?: string;
}>();

// No auth middleware needed - using service role for storage
router.post('/analyze-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    try {
        const userId = req.body.userId;
        const authToken = req.body.authToken;

        if (!userId || !authToken) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Create authenticated Supabase client
        const userSupabase = createAuthenticatedSupabaseClient(authToken);

        console.log('Analyzing image with GPT-4...');

        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not set in environment variables');
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Step 1: Analyze with GPT-4V first
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this image and identify all objects you can see. For each object, provide a name, category, description, estimated cost in USD, and condition based on visual appearance. Be comprehensive but focus on distinct, separate objects (don't combine objects like 'plant in pot' - list 'plant' and 'pot' separately). For condition, assess the visual state: 'excellent' for like-new items, 'good' for well-maintained items with minor wear, 'fair' for items with noticeable wear but still functional, 'poor' for items with significant damage or heavy wear. Also identify which room this appears to be."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${fs.readFileSync(req.file.path, 'base64')}`
                            },
                        },
                    ],
                },
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "image_analysis",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            objects: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: {
                                            type: "string",
                                            description: "Name of the object"
                                        },
                                        category: {
                                            type: "string",
                                            description: "Category of the object",
                                            enum: ["Electronics", "Appliances", "Furniture", "Kitchenware", "Tools", "Sports & Recreation", "Books & Media", "Clothing & Accessories", "Decorations", "Personal Care", "Collectibles & Mementos", "Other"]
                                        },
                                        description: {
                                            type: "string",
                                            description: "Brief description of the object"
                                        },
                                        estimated_cost_usd: {
                                            type: "number",
                                            description: "Estimated cost in USD",
                                            minimum: 0
                                        },
                                        condition: {
                                            type: "string",
                                            description: "Condition of the object based on visual appearance",
                                            enum: ["excellent", "good", "fair", "poor"]
                                        }
                                    },
                                    required: ["name", "category", "description", "estimated_cost_usd", "condition"],
                                    additionalProperties: false
                                }
                            },
                            room: {
                                type: "string",
                                description: "The room where the image was likely taken",
                                enum: ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Office", "Garage", "Dining Room", "Other"]
                            },
                            total_estimated_value_usd: {
                                type: "number",
                                description: "The sum of all object costs",
                                minimum: 0
                            }
                        },
                        required: ["objects", "room", "total_estimated_value_usd"],
                        additionalProperties: false
                    }
                }
            }
        });

        const message = response.choices[0]?.message;
        if (!message) {
            throw new Error('No response message from GPT-4o-mini');
        }

        // Check for refusal first
        if (message.refusal) {
            throw new Error(`Model refused to process the request: ${message.refusal}`);
        }

        const content = message.content;
        if (!content) {
            throw new Error('No response content from GPT-4o-mini');
        }

        console.log('🤖 Raw GPT-4 Vision response content:', content);

        // Parse GPT-4 results
        let result: AnalysisResult;
        try {
            result = JSON.parse(content) as AnalysisResult;

            console.log('🤖 Parsed GPT-4 Vision result:', JSON.stringify(result, null, 2));
            console.log('🏠 Room detected by GPT-4:', result.room);
            console.log('💰 Total value from GPT-4:', result.total_estimated_value_usd);
            console.log('📦 Objects detected:', result.objects.length);

            // Upload original full image to Supabase
            console.log('Uploading original full image to Supabase...');
            const originalFullImageUrl = await uploadImageFileToSupabase(req.file!.path, `original_full_${Date.now()}.jpg`);

            // Process only the first 3 objects
            const objectsToProcess = result.objects.slice(0, 3);

            // Step 2: Return GPT-4 results immediately with processing status
            const immediateResponse = {
                step: 'gpt_complete',
                objects: objectsToProcess.map(obj => ({
                    ...obj,
                    originalFullImageUrl,
                    status: 'pending_detection'
                })),
                room: result.room,
                total_estimated_value_usd: result.total_estimated_value_usd,
                processing_id: Date.now().toString() // Unique ID for this processing session
            };

            console.log('🚀 Sending immediate response to frontend:', JSON.stringify(immediateResponse, null, 2));
            console.log('🏠 Room being sent to frontend:', immediateResponse.room);

            // Send immediate response
            res.json(immediateResponse);

            // Step 3: Copy file to a safe location and process Landing AI in background
            const tempImagePath = path.join(os.tmpdir(), `processing_${Date.now()}_${path.basename(req.file.path)}`);
            fs.copyFileSync(req.file.path, tempImagePath);
            console.log(`Copied image to temp location: ${tempImagePath}`);

            processObjectsInBackground(tempImagePath, objectsToProcess, originalFullImageUrl, immediateResponse.processing_id, result.room, result.total_estimated_value_usd)
                .catch(error => {
                    console.error('Background processing error:', error);
                    // Clean up temp file on error
                    if (fs.existsSync(tempImagePath)) {
                        fs.unlinkSync(tempImagePath);
                    }
                });

        } catch (parseError) {
            console.error('Error parsing GPT-4 response:', parseError);
            throw new Error('Failed to parse GPT-4 response');
        }

    } catch (error) {
        console.error('Error in analyze-image:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Analysis failed' });
    } finally {
        // Clean up original uploaded file (we've copied it for background processing)
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// Background processing function with parallel Landing AI calls
async function processObjectsInBackground(
    imagePath: string,
    objects: any[],
    originalFullImageUrl: string,
    processingId: string,
    room?: string,
    totalValue?: number
) {
    console.log(`Starting background processing for session ${processingId} (PARALLEL mode)`);
    console.log(`🏠 Room passed to background processing: "${room}"`);
    console.log(`💰 Total value passed to background processing: ${totalValue}`);
    console.log(`Image file exists: ${fs.existsSync(imagePath)}, path: ${imagePath}`);

    // Initialize session tracking
    processingSessions.set(processingId, {
        status: 'processing',
        objects: objects.map(obj => ({ ...obj, status: 'pending' })),
        completedCount: 0,
        totalCount: objects.length,
        room: room,
        totalValue: totalValue
    });

    console.log(`🏠 Session ${processingId} initialized with room: "${room}"`);
    console.log(`📊 Session data:`, processingSessions.get(processingId));

    // Check if file exists before starting
    if (!fs.existsSync(imagePath)) {
        console.error(`File no longer exists: ${imagePath}`);
        throw new Error(`Source image file was deleted: ${imagePath}`);
    }

    // Start ALL Landing AI requests in parallel for speed
    console.log(`Starting ${objects.length} Landing AI requests in parallel...`);
    const processingPromises = objects.map(async (obj, index) => {
        try {
            // Update status to processing
            const sessionData = processingSessions.get(processingId);
            if (sessionData) {
                sessionData.objects[index].status = 'processing';
                processingSessions.set(processingId, sessionData);
            }

            console.log(`[${index + 1}/${objects.length}] Starting Landing AI for: ${obj.name}`);

            // Run Landing AI detection (this happens in parallel with others)
            const detections = await detectObject(imagePath, obj.name);

            if (detections.length > 0) {
                const detection = detections[0];
                const cropFileName = `${obj.name.replace(/\s+/g, '_')}_${Date.now()}_${index}.jpg`;
                const enhancedFileName = `enhanced_${cropFileName}`;
                const tempCropPath = path.join(os.tmpdir(), cropFileName);

                console.log(`[${index + 1}/${objects.length}] Landing AI completed for ${obj.name}, starting crop & enhance...`);

                // Crop the image
                await cropImage(imagePath, detection.boundingBox, tempCropPath);

                // Upload original cropped image
                const originalCropImageUrl = await uploadImageFileToSupabase(tempCropPath, `original_${cropFileName}`);

                // Enhance and upload enhanced image
                const enhancedImageUrl = await enhanceImageForPortrait(tempCropPath, enhancedFileName);

                // Clean up temp file
                fs.unlinkSync(tempCropPath);

                // Update session with completed object (this happens as soon as each item completes)
                const updatedSessionData = processingSessions.get(processingId);
                if (updatedSessionData) {
                    updatedSessionData.objects[index] = {
                        ...obj,
                        imageUrl: enhancedImageUrl,
                        originalCropImageUrl,
                        originalFullImageUrl,
                        confidence: detection.confidence,
                        status: 'complete'
                    };
                    updatedSessionData.completedCount++;
                    processingSessions.set(processingId, updatedSessionData);
                }

                console.log(`✅ [${index + 1}/${objects.length}] Completed processing for ${obj.name}`);
                return { index, success: true, result: 'complete' };

            } else {
                console.log(`⚠️ [${index + 1}/${objects.length}] No detections found for ${obj.name}`);
                // Mark as complete even if no detection
                const sessionData = processingSessions.get(processingId);
                if (sessionData) {
                    sessionData.objects[index].status = 'no_detection';
                    sessionData.completedCount++;
                    processingSessions.set(processingId, sessionData);
                }
                return { index, success: true, result: 'no_detection' };
            }
        } catch (error) {
            console.error(`❌ [${index + 1}/${objects.length}] Error processing object ${obj.name}:`, error);
            // Mark as error
            const sessionData = processingSessions.get(processingId);
            if (sessionData) {
                sessionData.objects[index].status = 'error';
                sessionData.objects[index].error = error instanceof Error ? error.message : 'Unknown error';
                sessionData.completedCount++;
                processingSessions.set(processingId, sessionData);
            }
            return { index, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Don't wait for all - let them complete individually and stream results
    console.log(`Started ${objects.length} parallel processes - results will stream as they complete...`);

    // Handle completion tracking in the background
    Promise.allSettled(processingPromises).then((results) => {
        // Log final results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`Parallel processing summary: ${successful} successful, ${failed} failed`);

        // Mark session as complete
        const finalSessionData = processingSessions.get(processingId);
        if (finalSessionData) {
            finalSessionData.status = 'complete';
            processingSessions.set(processingId, finalSessionData);
        }

        console.log(`🎉 Background processing completed for session ${processingId}`);

        // Clean up temporary image file AFTER all processing is done
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Cleaned up temporary file: ${imagePath}`);
        }
    }).catch((error: any) => {
        console.error('Error in background processing completion handler:', error);
    });
}

// Endpoint to check processing status
router.get('/processing-status/:processingId', (req, res) => {
    const { processingId } = req.params;
    const sessionData = processingSessions.get(processingId);

    if (!sessionData) {
        console.log(`❌ Processing session not found: ${processingId}`);
        return res.status(404).json({ error: 'Processing session not found' });
    }

    console.log(`📊 Returning processing status for session ${processingId}:`);
    console.log(`🏠 Room in session data: "${sessionData.room}"`);
    console.log(`💰 Total value in session data: ${sessionData.totalValue}`);
    console.log(`📈 Progress: ${sessionData.completedCount}/${sessionData.totalCount}`);
    console.log(`🔄 Status: ${sessionData.status}`);

    res.json(sessionData);
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

        // Create authenticated Supabase client with the user's token
        const userSupabase = createAuthenticatedSupabaseClient(token);

        // Verify the token by getting the user
        const { data: { user }, error } = await userSupabase.auth.getUser();

        if (error || !user) {
            console.error('Token verification failed:', error);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        console.log('User authenticated successfully:', user.id);

        // Add user and authenticated supabase client to request object
        (req as any).user = user;
        (req as any).userSupabase = userSupabase;
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
        const userSupabase = (req as any).userSupabase;

        console.log('Updating item:', id, 'for user:', user.id);
        console.log('Updates received:', updates);

        // Add user validation - ensure the item belongs to the authenticated user
        // First check if the item exists and belongs to the user using the authenticated client
        const { data: existingItem, error: fetchError } = await userSupabase
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

        console.log('Item found, proceeding with update...');

        // Update the item using the database utility (with user ID for proper access control)
        const updatedItem = await updateInventoryItem(id, updates, user.id);
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