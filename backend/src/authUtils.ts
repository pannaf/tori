import { supabase } from './supabase.js';
import { Request, Response, NextFunction } from 'express';

/**
 * Create an authenticated Supabase client using a user's session token
 */
export function createAuthenticatedSupabaseClient(accessToken: string) {
    return supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '' // We'll handle refresh separately if needed
    });
}

/**
 * Sign in anonymously for operations that don't require a specific user
 */
export async function signInAnonymously() {
    try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
            console.error('Anonymous sign in error:', error);
            throw error;
        }
        console.log('Anonymous user signed in:', data.user?.id);
        return data;
    } catch (error) {
        console.error('Failed to sign in anonymously:', error);
        throw error;
    }
}

/**
 * Middleware to ensure we have an authenticated session for storage operations
 */
export async function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
    try {
        // Check if we already have a session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && session.user) {
            console.log('Existing session found for user:', session.user.id);
            return next();
        }

        // If no session, sign in anonymously
        console.log('No session found, signing in anonymously...');
        await signInAnonymously();
        next();
    } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            details: error instanceof Error ? error.message : error
        });
    }
}

/**
 * Get or create a user session for storage operations
 */
export async function getAuthenticatedSupabase() {
    try {
        // Check current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && session.user) {
            console.log('Using existing session:', session.user.id);
            return supabase;
        }

        // Sign in anonymously if no session
        console.log('Creating anonymous session for storage access...');
        await signInAnonymously();
        return supabase;
    } catch (error) {
        console.error('Failed to get authenticated Supabase client:', error);
        throw error;
    }
} 