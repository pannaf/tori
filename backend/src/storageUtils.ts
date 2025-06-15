import { supabaseAdmin } from './supabase.js';
import fs from 'fs';
import path from 'path';

/**
 * Upload an image buffer to Supabase Storage
 * @param buffer - Image buffer
 * @param fileName - Name of the file
 * @param bucketName - Name of the storage bucket (default: 'images')
 * @returns Promise with the public URL or error
 */
export async function uploadImageToSupabase(
    buffer: Buffer,
    fileName: string,
    bucketName: string = 'images'
): Promise<string> {
    try {
        // Generate a unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${fileName}`;

        console.log('Uploading image with service role client:', uniqueFileName);

        // Upload the file using service role client (full permissions)
        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(uniqueFileName, buffer, {
                contentType: 'image/jpeg',
                upsert: false
            });

        if (error) {
            console.error('Supabase storage upload error:', error);
            throw new Error(`Failed to upload image: ${error.message}`);
        }

        // Get the public URL
        const { data: publicUrlData } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(uniqueFileName);

        if (!publicUrlData?.publicUrl) {
            throw new Error('Failed to get public URL for uploaded image');
        }

        console.log('Successfully uploaded image to Supabase:', publicUrlData.publicUrl);
        return publicUrlData.publicUrl;

    } catch (error) {
        console.error('Error uploading image to Supabase:', error);
        throw error;
    }
}

/**
 * Upload an image file from disk to Supabase Storage
 * @param filePath - Path to the image file
 * @param fileName - Name of the file
 * @param bucketName - Name of the storage bucket (default: 'images')
 * @returns Promise with the public URL or error
 */
export async function uploadImageFileToSupabase(
    filePath: string,
    fileName: string,
    bucketName: string = 'images'
): Promise<string> {
    try {
        const buffer = fs.readFileSync(filePath);
        return await uploadImageToSupabase(buffer, fileName, bucketName);
    } catch (error) {
        console.error('Error reading file for upload:', error);
        throw error;
    }
}

/**
 * Delete an image from Supabase Storage
 * @param fileName - Name of the file to delete
 * @param bucketName - Name of the storage bucket (default: 'images')
 * @returns Promise with success status
 */
export async function deleteImageFromSupabase(
    fileName: string,
    bucketName: string = 'images'
): Promise<boolean> {
    try {
        const { error } = await supabaseAdmin.storage
            .from(bucketName)
            .remove([fileName]);

        if (error) {
            console.error('Supabase storage delete error:', error);
            return false;
        }

        console.log('Successfully deleted image from Supabase:', fileName);
        return true;
    } catch (error) {
        console.error('Error deleting image from Supabase:', error);
        return false;
    }
} 