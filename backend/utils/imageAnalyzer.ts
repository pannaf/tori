import OpenAI from 'openai';
import * as fs from 'fs';

interface ObjectWithCost {
    name: string;
    estimated_cost_usd: number;
}

interface AnalysisResult {
    objects: ObjectWithCost[];
    room: string;
    total_estimated_value_usd: number;
}

export async function analyzeImage(imagePath: string): Promise<AnalysisResult> {
    console.log('\n🔍 Starting image analysis...');
    console.log('📁 Image path:', imagePath);

    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OpenAI API key is not set in environment variables');
        throw new Error('OpenAI API key is not set in environment variables');
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        // Read and convert the image to base64
        console.log('📸 Reading image file...');
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        console.log('✅ Image converted to base64');
        console.log('📊 Image size:', Math.round(base64Image.length / 1024), 'KB');

        console.log('🤖 Sending request to OpenAI API...');
        console.time('OpenAI API Response Time');
        const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "list all the objects in this image and estimate their costs. ALL of them. be comprehensive and thorough. don't say what it's on or touching or under or above. also do not attempt to indicate what size it is. that's just confusing. do not do compound objects, i.e., nothing that uses with to combine multiple objects. instead of large plant in black pot, for example, it should be an object for plant and an object for black pot. just list each individual object with its estimated cost in USD. Be realistic with cost estimates based on average market prices. Also give your best guess for which room in a home it is.\n\noutput format below. Return raw JSON only. Do not include triple backticks or formatting — just the raw JSON.\n\n{\"objects\": [{\"name\": \"object name\", \"estimated_cost_usd\": number}], \"room\": \"room name\", \"total_estimated_value_usd\": sum_of_all_objects}"
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
        console.timeEnd('OpenAI API Response Time');

        const content = response.choices[0]?.message?.content;
        if (!content) {
            console.error('❌ No content in OpenAI response');
            throw new Error('No response content from GPT-4V');
        }

        console.log('\n📝 Raw API Response:', content);

        // Parse the JSON response
        try {
            console.log('\n🔄 Parsing response as JSON...');
            const result = JSON.parse(content) as AnalysisResult;

            // Log the analysis results
            console.log('\n📊 Analysis Results:');
            console.log('🏠 Room:', result.room);
            console.log('💰 Total Value:', result.total_estimated_value_usd);
            console.log('🔍 Detected Objects:');
            result.objects.forEach((obj, index) => {
                console.log(`  ${index + 1}. ${obj.name}: $${obj.estimated_cost_usd}`);
            });

            return result;
        } catch (error) {
            console.error('❌ Error parsing JSON response:', error);
            console.error('Raw content that failed to parse:', content);
            throw new Error('Failed to parse GPT-4V response as JSON');
        }
    } catch (error) {
        console.error('❌ Error during image analysis:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
        throw error;
    }
} 