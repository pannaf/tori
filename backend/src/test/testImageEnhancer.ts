import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { enhanceImageForPortrait } from '../imageEnhancer.js';

// Load environment variables
dotenv.config();

async function testImageEnhancer() {
    try {
        console.log('🧪 Testing Image Enhancer...\n');

        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ OPENAI_API_KEY not found in environment variables');
            console.log('Please add your OpenAI API key to the .env file');
            return;
        }

        // Create output directory for enhanced images
        const outputDir = path.join(process.cwd(), 'test-output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log('📁 Created output directory:', outputDir);
        }

        // Use the existing test image from the frontend test directory
        const testImagePath = path.join(process.cwd(), '..', 'src', 'test', 'test-image.jpeg');

        // Check if test image exists
        if (!fs.existsSync(testImagePath)) {
            console.error('❌ Test image not found at:', testImagePath);
            console.log('Please ensure the test image exists in the src/test directory');
            return;
        }

        console.log('📸 Using test image:', testImagePath);
        console.log('📊 Test image size:', Math.round(fs.statSync(testImagePath).size / 1024), 'KB');

        // Generate filename for the enhanced image
        const timestamp = Date.now();
        const enhancedFileName = `enhanced_test_${timestamp}.png`;

        console.log('\n🎨 Starting image enhancement...');
        console.time('Enhancement Time');

        // Call the enhance function (now uploads to Supabase and returns URL)
        const supabaseUrl = await enhanceImageForPortrait(testImagePath, enhancedFileName);

        console.timeEnd('Enhancement Time');

        // Verify we got a valid URL back
        if (supabaseUrl && supabaseUrl.startsWith('http')) {
            console.log('\n✅ Enhancement completed successfully!');
            console.log('🌐 Enhanced image uploaded to Supabase:', supabaseUrl);

            // Display file info
            console.log('\n📋 File info:');
            console.log('   Original:', testImagePath);
            console.log('   Enhanced (Supabase):', supabaseUrl);
            console.log('   Filename:', enhancedFileName);

            console.log('\n🔍 You can now view the enhanced image at the Supabase URL');
            console.log('💡 The enhanced image is stored in your Supabase storage bucket');
        } else {
            console.error('❌ Invalid URL returned from enhancement function');
        }

    } catch (error) {
        console.error('\n❌ Error during image enhancement testing:', error);

        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                console.log('\n💡 Tip: Make sure your OpenAI API key is valid and has sufficient credits');
            } else if (error.message.includes('rate limit')) {
                console.log('\n💡 Tip: You may have hit the OpenAI API rate limit. Try again in a few minutes');
            } else if (error.message.includes('quota')) {
                console.log('\n💡 Tip: Check your OpenAI account billing and usage limits');
            }
        }
    }
}

// Add help text
console.log('🚀 Image Enhancer Test');
console.log('====================');
console.log('This test will:');
console.log('1. Load a test image');
console.log('2. Send it to OpenAI for enhancement');
console.log('3. Save the enhanced result');
console.log('4. Report the results\n');

// Run the test
testImageEnhancer(); 