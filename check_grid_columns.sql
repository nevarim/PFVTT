USE PFVTT;

-- Check map_tokens grid columns
SELECT 'map_tokens grid columns:' as info;
SELECT COLUMN_NAME FROM information_schema.columns 
WHERE table_schema='PFVTT' AND table_name='map_tokens' AND column_name LIKE 'grid%';

-- Check map_backgrounds grid columns
SELECT 'map_backgrounds grid columns:' as info;
SELECT COLUMN_NAME FROM information_schema.columns 
WHERE table_schema='PFVTT' AND table_name='map_backgrounds' AND column_name LIKE 'grid%';

-- Check map_audio grid columns
SELECT 'map_audio grid columns:' as info;
SELECT COLUMN_NAME FROM information_schema.columns 
WHERE table_schema='PFVTT' AND table_name='map_audio' AND column_name LIKE 'grid%';

-- Check map_props grid columns
SELECT 'map_props grid columns:' as info;
SELECT COLUMN_NAME FROM information_schema.columns 
WHERE table_schema='PFVTT' AND table_name='map_props' AND column_name LIKE 'grid%';

-- Check for any remaining old columns
SELECT 'Remaining old columns:' as info;
SELECT table_name, COLUMN_NAME FROM information_schema.columns 
WHERE table_schema='PFVTT' AND table_name IN ('map_tokens', 'map_backgrounds', 'map_audio', 'map_props')
AND column_name IN ('x_position', 'y_position', 'z_index', 'radius');