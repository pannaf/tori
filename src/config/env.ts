// Environment configuration for the frontend
export const env = {
  // API Configuration
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  LANDING_AI_API_KEY: import.meta.env.VITE_LANDING_AI_API_KEY,
  API_URL: import.meta.env.VITE_API_URL || 'https://tori-production.up.railway.app', // 'http://localhost:3000',

  // Debug mode
  DEBUG: import.meta.env.VITE_DEBUG === 'true',

  // Environment info
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
} as const;

// Validation function to check if required env vars are set
export const validateEnv = () => {
  const required = [
    'VITE_OPENAI_API_KEY',
    'VITE_LANDING_AI_API_KEY',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing);
    console.warn('📝 Please check your .env file and add the missing variables');
    return false;
  }

  console.log('✅ All required environment variables are set');
  return true;
};

// Log environment status in development
if (env.IS_DEVELOPMENT) {
  console.log('🔧 Environment Configuration:');
  console.log('- API URL:', env.API_URL);
  console.log('- Debug Mode:', env.DEBUG);
  console.log('- OpenAI Key:', env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- Landing AI Key:', env.LANDING_AI_API_KEY ? '✅ Set' : '❌ Missing');
}