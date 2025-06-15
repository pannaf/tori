import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { supabase } from './supabase.js';

const router = Router();

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
            };
        }
    }
}

// Middleware to get user from Authorization header
export async function getUser(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No auth provided, continue without user
            return next();
        }

        const token = authHeader.substring(7); // Remove 'Bearer '

        // Get user from Supabase using the token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.log('Invalid token or user not found');
            return next(); // Continue without user
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email
        };

        console.log('Found authenticated user:', req.user.id, req.user.email);
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        next(); // Continue without user on error
    }
}

// Simple auth test route
router.post('/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'User created successfully',
            user: { id: data.user?.id, email: data.user?.email },
            access_token: data.session?.access_token
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        res.json({
            message: 'Login successful',
            user: { id: data.user?.id, email: data.user?.email },
            access_token: data.session?.access_token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Test protected route
router.get('/auth/me', getUser, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
        message: 'Authenticated user info',
        user: req.user
    });
});

export default router; 