-- Migration script to convert from pixel coordinates to grid coordinates
USE PFVTT;

-- Clean up map_tokens table
ALTER TABLE map_tokens DROP COLUMN IF EXISTS x_position;
ALTER TABLE map_tokens DROP COLUMN IF EXISTS y_position;
ALTER TABLE map_tokens DROP COLUMN IF EXISTS z_index;
ALTER TABLE map_tokens ADD COLUMN IF NOT EXISTS grid_x INT NOT NULL DEFAULT 0 AFTER asset_id;
ALTER TABLE map_tokens ADD COLUMN IF NOT EXISTS grid_y INT NOT NULL DEFAULT 0 AFTER grid_x;
ALTER TABLE map_tokens ADD COLUMN IF NOT EXISTS grid_z INT DEFAULT 0 AFTER grid_y;

-- Clean up map_backgrounds table
ALTER TABLE map_backgrounds DROP COLUMN IF EXISTS x_position;
ALTER TABLE map_backgrounds DROP COLUMN IF EXISTS y_position;
ALTER TABLE map_backgrounds DROP COLUMN IF EXISTS z_index;
ALTER TABLE map_backgrounds ADD COLUMN IF NOT EXISTS grid_x INT NOT NULL DEFAULT 0 AFTER asset_id;
ALTER TABLE map_backgrounds ADD COLUMN IF NOT EXISTS grid_y INT NOT NULL DEFAULT 0 AFTER grid_x;
ALTER TABLE map_backgrounds ADD COLUMN IF NOT EXISTS grid_width INT NOT NULL DEFAULT 1 AFTER grid_y;
ALTER TABLE map_backgrounds ADD COLUMN IF NOT EXISTS grid_height INT NOT NULL DEFAULT 1 AFTER grid_width;
ALTER TABLE map_backgrounds ADD COLUMN IF NOT EXISTS grid_z INT DEFAULT 0 AFTER rotation;

-- Clean up map_audio table
ALTER TABLE map_audio DROP COLUMN IF EXISTS x_position;
ALTER TABLE map_audio DROP COLUMN IF EXISTS y_position;
ALTER TABLE map_audio DROP COLUMN IF EXISTS radius;
ALTER TABLE map_audio DROP COLUMN IF EXISTS z_index;
ALTER TABLE map_audio ADD COLUMN IF NOT EXISTS grid_x INT NOT NULL DEFAULT 0 AFTER asset_id;
ALTER TABLE map_audio ADD COLUMN IF NOT EXISTS grid_y INT NOT NULL DEFAULT 0 AFTER grid_x;
ALTER TABLE map_audio ADD COLUMN IF NOT EXISTS radius_grid INT DEFAULT 0 AFTER loop_audio;
ALTER TABLE map_audio ADD COLUMN IF NOT EXISTS grid_z INT DEFAULT 0 AFTER radius_grid;

-- Clean up map_props table
ALTER TABLE map_props DROP COLUMN IF EXISTS x_position;
ALTER TABLE map_props DROP COLUMN IF EXISTS y_position;
ALTER TABLE map_props DROP COLUMN IF EXISTS z_index;
ALTER TABLE map_props ADD COLUMN IF NOT EXISTS grid_x INT NOT NULL DEFAULT 0 AFTER asset_id;
ALTER TABLE map_props ADD COLUMN IF NOT EXISTS grid_y INT NOT NULL DEFAULT 0 AFTER grid_x;
ALTER TABLE map_props ADD COLUMN IF NOT EXISTS grid_width INT NOT NULL DEFAULT 1 AFTER grid_y;
ALTER TABLE map_props ADD COLUMN IF NOT EXISTS grid_height INT NOT NULL DEFAULT 1 AFTER grid_width;
ALTER TABLE map_props ADD COLUMN IF NOT EXISTS grid_z INT DEFAULT 0 AFTER rotation;

SELECT 'Migration completed successfully!' as status;