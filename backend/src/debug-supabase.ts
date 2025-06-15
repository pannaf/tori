import { Router } from 'express';
import { supabase } from './supabase.js';

const router = Router();

router.get('/debug-supabase', async (req, res) => {
    try {
        console.log('=== SUPABASE DEBUG ===');

        // Check environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        console.log('Environment check:', {
            url: supabaseUrl ? 'Set' : 'Missing',
            urlStart: supabaseUrl?.substring(0, 20) + '...',
            key: supabaseKey ? 'Set' : 'Missing',
            keyLength: supabaseKey?.length,
            keyStart: supabaseKey?.substring(0, 20) + '...'
        });

        // Test basic connection
        console.log('Testing basic Supabase connection...');

        // Try to get user (this should work with anon key)
        const { data: user, error: userError } = await supabase.auth.getUser();
        console.log('Auth test:', { user: user?.user?.id || 'anonymous', error: userError?.message });

        // Try to list buckets
        console.log('Testing storage bucket access...');
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        console.log('Buckets result:', {
            buckets: buckets?.map(b => ({ name: b.name, public: b.public })) || [],
            error: bucketError?.message || 'None'
        });

        // If no buckets, try a different approach
        if (!buckets || buckets.length === 0) {
            console.log('Trying direct bucket access...');
            const { data: files, error: filesError } = await supabase.storage
                .from('images')
                .list('', { limit: 1 });
            console.log('Direct bucket access:', {
                canAccess: !filesError,
                error: filesError?.message || 'None'
            });
        }

        // Test database access
        console.log('Testing database access...');
        const { data: sessionTest, error: dbError } = await supabase
            .from('analysis_sessions')
            .select('id')
            .limit(1);
        console.log('Database test:', {
            canRead: !dbError,
            recordCount: sessionTest?.length || 0,
            error: dbError?.message || 'None'
        });

        res.json({
            success: true,
            environment: {
                url: supabaseUrl ? 'Set ✅' : 'Missing ❌',
                key: supabaseKey ? 'Set ✅' : 'Missing ❌'
            },
            auth: {
                status: userError ? 'Error ❌' : 'OK ✅',
                error: userError?.message
            },
            storage: {
                bucketsFound: buckets?.length || 0,
                buckets: buckets?.map(b => b.name) || [],
                error: bucketError?.message
            },
            database: {
                canRead: !dbError,
                error: dbError?.message
            }
        });

    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            error: 'Debug failed',
            details: error instanceof Error ? error.message : error
        });
    }
});

export default router; 