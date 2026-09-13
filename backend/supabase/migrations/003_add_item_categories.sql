-- Add category to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
