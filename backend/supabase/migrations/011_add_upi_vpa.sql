-- Add upi_vpa and display_name to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS upi_vpa TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS display_name TEXT;
