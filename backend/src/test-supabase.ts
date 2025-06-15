import { Router } from 'express';
import { supabase, supabaseAdmin } from './supabase.js';
import { createAnalysisSession } from './databaseUtils.js';

const router = Router();

// Simple test endpoint to verify Supabase connection
router.get('/test-supabase', async (req, res) => {
    try {
        console.log('Testing Supabase connection...');

        // Test 1: Database connection
        const { data: tables, error: tableError } = await supabase
            .from('analysis_sessions')
            .select('count')
            .limit(1);

        if (tableError) {
            console.error('Database test failed:', tableError);
            return res.status(500).json({
                error: 'Database connection failed',
                details: tableError
            });
        }

        // Test 2: Create a simple analysis session
        try {
            const testSession = await createAnalysisSession({
                total_estimated_value_usd: 100.00,
                room: 'Test Room'
            });
            console.log('Test session created:', testSession.id);
        } catch (sessionError) {
            console.error('Session creation failed:', sessionError);
            return res.status(500).json({
                error: 'Session creation failed',
                details: sessionError
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
        if (!imagesBucket) {
            return res.status(500).json({
                error: 'Images bucket not found',
                availableBuckets: buckets?.map(b => b.name) || []
            });
        }

        res.json({
            success: true,
            message: 'Supabase connection successful with service role!',
            database: 'Connected ✅',
            storage: 'Connected ✅ (Service Role)',
            imagesBucket: imagesBucket.public ? 'Public ✅' : 'Private ⚠️',
            bucketsFound: buckets?.length || 0,
            authentication: 'Service Role (No user auth needed) ✅'
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