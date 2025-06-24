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
  name VARCHAR(100) NOT NULL,
  data TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

INSERT INTO game_rules (system, rules_json) VALUES
  ('D&D 5e', '{"description": "Dungeons & Dragons 5th Edition core rules."}'),
  ('Pathfinder', '{"description": "Pathfinder 1st Edition core rules."}'),
  ('Pathfinder 2', '{"description": "Pathfinder 2nd Edition core rules."}'),
  ('D&D 3.5', '{"description": "Dungeons & Dragons 3.5 Edition core rules."}');