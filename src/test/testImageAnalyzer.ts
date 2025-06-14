import { analyzeImage } from '../utils/imageAnalyzer';
import { detectObject, cropImage } from '../utils/objectDetector';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

async function testImageAnalysis() {
    try {
        // Create output directory for cropped images
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Use path.join for correct path resolution
        const imagePath = path.join(process.cwd(), 'src', 'test', 'test-image.jpg');

        console.log('Starting image analysis...');
        console.log('Using image path:', imagePath);
        const result = await analyzeImage(imagePath);

        console.log('\nAnalysis Results:');
        console.log('Room:', result.room);
        console.log('\nObjects found:');

        // Process only the first three objects
        const objectsToProcess = result.objects.slice(0, 3);

        for (const [index, obj] of objectsToProcess.entries()) {
            console.log(`\n${index + 1}. ${obj.name} - $${obj.estimated_cost_usd.toFixed(2)}`);

            console.log(`  Detecting instances of ${obj.name}...`);
            const detections = await detectObject(imagePath, obj.name);

            if (detections.length > 0) {
                console.log(`  Found ${detections.length} instance(s):`);

                for (const [detectionIndex, detection] of detections.entries()) {
                    const outputPath = path.join(
                        outputDir,
                        `${obj.name.replace(/\s+/g, '_')}_${detectionIndex + 1}.jpg`
                    );
                    await cropImage(imagePath, detection.boundingBox, outputPath);
                    console.log(`    ${detectionIndex + 1}. Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
                    console.log(`       Label: ${detection.label}`);
                    console.log(`       Saved to: ${outputPath}`);
                }
            } else {
                console.log(`  ✗ No instances found for ${obj.name}`);
            }
        }

        console.log('\nTotal Estimated Value: $' + result.total_estimated_value_usd.toFixed(2));
    } catch (error) {
        console.error('Error during testing:', error);
    }
}

// Run the test
testImageAnalysis(); 