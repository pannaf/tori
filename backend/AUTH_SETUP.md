# 🔐 Supabase Auth Setup - Tying to auth.users.id

## **What This Does**
This setup connects your inventory system to Supabase's built-in `auth.users` table, so user IDs reference actual authenticated users.

## **Step 1: Run the New Schema**
Execute the SQL in `supabase-schema-auth.sql` in your Supabase SQL Editor:

```sql
-- This will create tables that properly reference auth.users.id
-- With foreign keys and Row Level Security (RLS) policies
```

## **Step 2: Test the Authentication**

### **Sign Up a User**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": { "id": "uuid-here", "email": "test@example.com" },
  "access_token": "jwt-token-here"
}
```

### **Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### **Use the Token**
Include the `access_token` in subsequent requests:
```bash
curl -X POST http://localhost:3000/api/analyze-image \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -F "image=@your-image.jpg"
```

## **Step 3: How It Works**

### **For Authenticated Users:**
- `user_id` gets set to the actual `auth.users.id` UUID
- Data is scoped to that user via RLS policies
- User can only see their own inventory items

### **For Anonymous Users:**
- `user_id` gets set to `NULL`
- Still works for testing without auth
- Anonymous data is accessible to all

### **Row Level Security (RLS):**
- `auth.uid() = user_id` - Users see only their data
- `user_id IS NULL` - Anonymous data is accessible

## **Step 4: Frontend Integration**

Your frontend should:
1. Call `/api/auth/login` to get a JWT token
2. Store the token (localStorage/cookies)
3. Include `Authorization: Bearer <token>` in API headers
4. Handle token expiration/refresh

## **Database Structure**
- `auth.users` - Supabase's built-in user table (automatic)
- `analysis_sessions.user_id` → `auth.users.id` (foreign key)  
- `inventory_items.user_id` → `auth.users.id` (foreign key)

## **Benefits**
✅ Proper user isolation via RLS  
✅ Automatic cleanup on user deletion  
✅ Works with Supabase Auth features  
✅ Scalable for production deployment  
✅ Still supports anonymous usage 