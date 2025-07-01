-- PFVTT MySQL Schema

CREATE DATABASE IF NOT EXISTS PFVTT;
USE PFVTT;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO users (username, password_hash) VALUES ('nevarim', '$2b$10$rDbVvjR8dwKjGegbVJw2tuTWtQDQHWJe6M6VrQ2ofGeBXf9jJQpoC');

-- Game sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Maps table
CREATE TABLE IF NOT EXISTS maps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  data TEXT DEFAULT '{}',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Game rules table
CREATE TABLE IF NOT EXISTS game_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system VARCHAR(50) NOT NULL, -- e.g., Pathfinder, D&D 5.0
  rules_json TEXT NOT NULL
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  game_rules_id INT NOT NULL,
  image_url VARCHAR(255),
  background_image_url VARCHAR(255),
  settings JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (game_rules_id) REFERENCES game_rules(id)
);

-- Actors table
CREATE TABLE IF NOT EXISTS actors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50),
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Scenes table
CREATE TABLE IF NOT EXISTS scenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Journals table
CREATE TABLE IF NOT EXISTS journals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Campaign permissions table
CREATE TABLE IF NOT EXISTS campaign_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(50) NOT NULL, -- e.g., owner, gm, player, observer
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Assets table - now organized by campaign with generic categories
CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- tokens, backgrounds, audio, props
  file_url VARCHAR(255) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  description TEXT,
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  INDEX idx_campaign_category (campaign_id, category)
);

-- Map tokens table - references campaign assets
CREATE TABLE IF NOT EXISTS map_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  map_id INT NOT NULL,
  asset_id INT NOT NULL,
  name VARCHAR(100),
  grid_x INT NOT NULL,
  grid_y INT NOT NULL,
  grid_z INT DEFAULT 0,
  scale_x DECIMAL(5,2) DEFAULT 1.0,
  scale_y DECIMAL(5,2) DEFAULT 1.0,
  rotation DECIMAL(5,2) DEFAULT 0.0,
  visible BOOLEAN DEFAULT TRUE,
  locked BOOLEAN DEFAULT FALSE,
  properties JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  INDEX idx_grid_position (map_id, grid_x, grid_y, grid_z)
);

-- Map backgrounds table - references campaign assets
CREATE TABLE IF NOT EXISTS map_backgrounds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  map_id INT NOT NULL,
  asset_id INT NOT NULL,
  name VARCHAR(100),
  grid_x INT NOT NULL,
  grid_y INT NOT NULL,
  grid_width INT NOT NULL,
  grid_height INT NOT NULL,
  scale_x DECIMAL(5,2) DEFAULT 1.0,
  scale_y DECIMAL(5,2) DEFAULT 1.0,
  rotation DECIMAL(5,2) DEFAULT 0.0,
  grid_z INT DEFAULT 0,
  visible BOOLEAN DEFAULT TRUE,
  locked BOOLEAN DEFAULT FALSE,
  properties JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  INDEX idx_grid_position (map_id, grid_x, grid_y, grid_z)
);

-- Map audio table - references campaign assets
CREATE TABLE IF NOT EXISTS map_audio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  map_id INT NOT NULL,
  asset_id INT NOT NULL,
  name VARCHAR(100),
  grid_x INT NOT NULL,
  grid_y INT NOT NULL,
  volume DECIMAL(3,2) DEFAULT 1.0,
  loop_audio BOOLEAN DEFAULT FALSE,
  auto_play BOOLEAN DEFAULT FALSE,
  radius_grid INT DEFAULT 0, -- 0 means global audio, otherwise grid cells radius
  grid_z INT DEFAULT 0,
  visible BOOLEAN DEFAULT TRUE,
  locked BOOLEAN DEFAULT FALSE,
  properties JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  INDEX idx_grid_position (map_id, grid_x, grid_y, grid_z)
);

-- Map props table - references campaign assets
CREATE TABLE IF NOT EXISTS map_props (
  id INT AUTO_INCREMENT PRIMARY KEY,
  map_id INT NOT NULL,
  asset_id INT NOT NULL,
  name VARCHAR(100),
  grid_x INT NOT NULL,
  grid_y INT NOT NULL,
  grid_width INT NOT NULL,
  grid_height INT NOT NULL,
  scale_x DECIMAL(5,2) DEFAULT 1.0,
  scale_y DECIMAL(5,2) DEFAULT 1.0,
  rotation DECIMAL(5,2) DEFAULT 0.0,
  grid_z INT DEFAULT 0,
  visible BOOLEAN DEFAULT TRUE,
  locked BOOLEAN DEFAULT FALSE,
  properties JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  INDEX idx_grid_position (map_id, grid_x, grid_y, grid_z)
);

INSERT INTO game_rules (system, rules_json) VALUES
  ('D&D 5e', '{"description": "Dungeons & Dragons 5th Edition core rules."}'),
  ('Pathfinder', '{"description": "Pathfinder 1st Edition core rules."}'),
  ('Pathfinder 2', '{"description": "Pathfinder 2nd Edition core rules."}'),
  ('D&D 3.5', '{"description": "Dungeons & Dragons 3.5 Edition core rules."}');

-- Sample data for testing
INSERT INTO campaigns (user_id, name, description, game_rules_id) VALUES
  (1, 'Test Campaign', 'A test campaign for development', 1),
  (1, 'Adventure Campaign', 'Main adventure campaign', 2);

INSERT INTO maps (campaign_id, name, data, created_by) VALUES
  (1, 'Starting Town', '{"width": 800, "height": 600, "background": "#f0f0f0"}', 1),
  (1, 'Dungeon Level 1', '{"width": 1000, "height": 800, "background": "#333333"}', 1),
  (2, 'World Map', '{"width": 1200, "height": 900, "background": "#87CEEB"}', 1);

-- Sample scenes data (uncomment and modify campaign_id values as needed)
-- INSERT INTO scenes (campaign_id, name, data) VALUES
--   (2, 'Tavern Interior', '{"description": "A cozy tavern with wooden tables and a fireplace", "width": 40, "height": 30, "gridSize": 50, "backgroundColor": "#8B4513"}'),
--   (2, 'Forest Path', '{"description": "A winding path through a dense forest", "width": 60, "height": 40, "gridSize": 50, "backgroundColor": "#228B22"}'),
--   (2, 'Dungeon Chamber', '{"description": "A dark stone chamber with ancient runes", "width": 30, "height": 25, "gridSize": 50, "backgroundColor": "#2F4F4F"}'),
--   (4, 'Mountain Pass', '{"description": "A treacherous mountain pass with steep cliffs", "width": 50, "height": 35, "gridSize": 50, "backgroundColor": "#696969"}'),
--   (4, 'Ancient Temple', '{"description": "A mysterious temple filled with magical energy", "width": 45, "height": 45, "gridSize": 50, "backgroundColor": "#4B0082"}');}