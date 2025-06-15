# Supabase Integration Setup Guide

This guide will help you set up Supabase for storing both your inventory data and image crops.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. Your existing OpenAI and Landing AI API keys

## Step 1: Create a Supabase Project

1. Go to your Supabase dashboard
2. Click "New Project"
3. Choose your organization
4. Enter a project name (e.g., "tori-inventory")
5. Enter a database password
6. Select a region closest to your users
7. Click "Create new project"

## Step 2: Get Your Supabase Credentials

1. Go to your project dashboard
2. Click on "Settings" in the sidebar
3. Click on "API"
4. Copy your:
   - Project URL (looks like `https://xxxxx.supabase.co`)
   - `anon` key (public key)

## Step 3: Set Up Environment Variables

Create a `.env` file in your backend directory with:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Landing AI Configuration  
LANDING_AI_API_KEY=your_landing_ai_api_key_here

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Server Configuration
PORT=3000
```

## Step 4: Set Up Database Tables

1. Go to your Supabase dashboard
2. Click on "SQL Editor" in the sidebar
3. Click "New query"
4. Copy and paste the contents of `supabase-schema.sql` into the editor
5. Click "Run" to execute the SQL

This will create:
- `analysis_sessions` table: Stores analysis sessions with room and total value
- `inventory_items` table: Stores individual inventory items with comprehensive metadata
- Proper indexes for performance
- Row Level Security policies

## Step 5: Set Up Storage Bucket

1. Go to "Storage" in your Supabase dashboard
2. Click "Create a new bucket"
3. Name it `images`
4. Make it **public** (so images can be accessed via URL)
5. Click "Create bucket"

## Step 6: Install Dependencies

The Supabase client is already installed. If you need to install it manually:

```bash
npm install @supabase/supabase-js
```

## Step 7: Test Your Setup

1. Build the project:
```bash
npm run build
```

2. Start the development server:
```bash
npm run dev
```

3. Test the `/api/analyze-image` endpoint with an image file

## What Changed

### Storage
- **Before**: Images were saved to `backend/public/crops/` folder
- **After**: Images are uploaded to Supabase Storage and served via CDN

### Data Persistence
- **Before**: No data persistence (only returned in API response)
- **After**: All analysis results are saved to Supabase database with comprehensive metadata

### New API Endpoints

#### Core Endpoints
- `POST /api/analyze-image` - Analyze image and store results
- `GET /api/inventory-items` - Get all inventory items
  - Query params: `sessionId`, `userId` (both optional)
- `GET /api/analysis-sessions` - Get analysis sessions
  - Query params: `limit`, `userId` (both optional)

#### Advanced Filtering
- `GET /api/inventory-items/category/:category` - Get items by category
  - Query param: `userId` (optional)
- `GET /api/inventory-items/room/:room` - Get items by room
  - Query param: `userId` (optional)

#### Item Management
- `PUT /api/inventory-items/:id` - Update an inventory item
- `DELETE /api/inventory-items/:id` - Delete an inventory item

### Benefits

1. **Scalability**: No local file storage limitations
2. **Persistence**: All data is saved and can be retrieved
3. **Performance**: Images served via Supabase CDN
4. **Deployment Ready**: Works with any hosting platform
5. **Backup**: Automatic backups via Supabase
6. **Rich Metadata**: Comprehensive item tracking with conditions, tags, and confidence scores
7. **User Management**: Multi-user support with user_id field
8. **Flexible Querying**: Filter by category, room, user, or session

## Database Schema

### analysis_sessions
- `id` (UUID, Primary Key)
- `total_estimated_value_usd` (Decimal)
- `room` (String)
- `user_id` (UUID, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### inventory_items
- `id` (UUID, Primary Key)
- `session_id` (UUID, Foreign Key)
- `name` (String) - Item name
- `category` (String) - Item category
- `room` (String) - Room location
- `description` (Text) - Item description
- `condition` (String) - Item condition (e.g., "Excellent", "Good", "Fair")
- `estimated_value` (Decimal) - Estimated value in USD
- `tags` (Text Array) - Searchable tags
- `image_data` (Text) - Original image metadata/URL
- `crop_image_data` (Text) - Cropped image URL from Supabase Storage
- `ai_detected` (Boolean) - Whether item was detected by AI
- `detection_confidence` (Decimal) - AI detection confidence (0-1)
- `user_id` (UUID, Optional) - Associated user
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## Usage Examples

### Analyze Image with User Context
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('userId', 'user-uuid-here');

const response = await fetch('/api/analyze-image', {
    method: 'POST',
    body: formData
});
```

### Get Items by Category
```javascript
const electronics = await fetch('/api/inventory-items/category/Electronics?userId=user-uuid');
```

### Update Item Condition
```javascript
await fetch('/api/inventory-items/item-uuid', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        condition: 'Excellent',
        tags: ['electronics', 'living-room', 'high-value']
    })
});
```

## Security Notes

The current setup uses permissive RLS policies for development. For production, you should:

1. Implement proper authentication
2. Create more restrictive RLS policies based on user_id
3. Consider rate limiting
4. Set up proper CORS policies
5. Validate user permissions before operations

## Troubleshooting

### "Missing Supabase environment variables" Error
- Make sure your `.env` file is in the backend directory
- Verify the variable names match exactly: `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Storage Upload Errors
- Ensure the `images` bucket exists in your Supabase project
- Verify the bucket is set to public
- Check your Supabase project isn't paused or out of quota

### Database Connection Errors
- Verify your database tables are created using the provided SQL
- Check your Supabase project is active
- Ensure RLS policies are properly set up

### Array Field Issues (tags)
- Make sure your Supabase project supports PostgreSQL arrays
- Tags should be passed as JavaScript arrays: `["tag1", "tag2"]` 