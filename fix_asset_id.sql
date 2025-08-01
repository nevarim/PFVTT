USE pfvtt;
ALTER TABLE map_tokens MODIFY COLUMN asset_id INT NULL;
ALTER TABLE map_tokens DROP FOREIGN KEY map_tokens_ibfk_2;
ALTER TABLE map_tokens ADD CONSTRAINT map_tokens_ibfk_2 FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;