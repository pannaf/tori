-- Run this query in your Supabase SQL Editor to check if RLS policies are active

-- Check if RLS is enabled on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('inventory_items', 'analysis_sessions');

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('inventory_items', 'analysis_sessions')
ORDER BY tablename, policyname;

-- Test if auth.uid() function works
SELECT auth.uid() as current_user_id;