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

-- Game rules table
CREATE TABLE IF NOT EXISTS game_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system VARCHAR(50) NOT NULL, -- e.g., Pathfinder, D&D 5.0
  folder_name VARCHAR(50) NOT NULL, -- folder name in backend/games/
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

-- Game sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
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

-- Token sheets table - links map tokens to a generic sheet (JSON)
CREATE TABLE IF NOT EXISTS token_sheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  map_token_id INT NOT NULL,
  actor_id INT DEFAULT NULL, -- Optional: link to actors table for reusable sheets
  sheet_json JSON NOT NULL, -- The sheet data (system-agnostic)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (map_token_id) REFERENCES map_tokens(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE SET NULL
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

INSERT INTO game_rules (system, folder_name, rules_json) VALUES
  ('D&D 5e', 'dnd_5e', '{"description": "Dungeons & Dragons 5th Edition core rules."}'),
  ('Pathfinder 1e', 'pathfinder_1e', '{"description": "Pathfinder 1st Edition core rules."}'),
  ('Pathfinder 2e', 'pathfinder_2e', '{"description": "Pathfinder 2nd Edition core rules."}'),
  ('D&D 3.5e', 'dnd_35e', '{"description": "Dungeons & Dragons 3.5 Edition core rules."}'),
  ('Starfinder', 'starfinder', '{"description": "Starfinder RPG core rules."}'),
  ('Hunter x Hunter', 'hunter_hunter', '{"description": "Sistema di gioco basato sull\u0027universo di Hunter x Hunter con la classe Nen Master."}');

