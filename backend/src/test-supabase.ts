import { Router } from 'express';
import { supabase, supabaseAdmin } from './supabase.js';
import { createInventoryItems } from './databaseUtils.js';

const router = Router();

// Simple test endpoint to verify Supabase connection
router.get('/test-supabase', async (req, res) => {
    try {
        console.log('Testing Supabase connection...');

        // Test 1: Database connection
        const { data: tables, error: tableError } = await supabase
            .from('inventory_items')
            .select('count')
            .limit(1);

        if (tableError) {
            console.error('Database test failed:', tableError);
            return res.status(500).json({
                error: 'Database connection failed',
                details: tableError
            });
        }

        // Test 2: Create a simple inventory item
        try {
            const testItems = await createInventoryItems([{
                name: 'Test Item',
                category: 'Other',
                room: 'Test Room',
                estimated_value: 10.00,
                ai_detected: false
            }]);
            console.log('Test item created:', testItems[0]?.id);
        } catch (itemError) {
            console.error('Item creation failed:', itemError);
            return res.status(500).json({
                error: 'Item creation failed',
                details: itemError
            });
        }

        // Test 3: Storage bucket access with service role
        const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();

        if (bucketError) {
            console.error('Storage test failed:', bucketError);
            return res.status(500).json({
                error: 'Storage connection failed',
                details: bucketError
            });
        }

        const imagesBucket = buckets?.find(b => b.name === 'images');

        res.json({
            success: true,
            message: 'Supabase connection is working!',
            database: 'Connected ✅',
            storage: {
                connected: 'Yes ✅',
                imagesBucket: imagesBucket ? 'Found ✅' : 'Not found ❌'
            }
        });
    } catch (error) {
        console.error('Supabase test error:', error);
        res.status(500).json({
            error: 'Supabase test failed',
            details: error instanceof Error ? error.message : error
        });
    }
});

export default router; 