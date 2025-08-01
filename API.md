# PFVTT API Documentation

## Technical Implementation

### Database Connection Pooling
The backend uses MySQL connection pooling for improved performance and reliability:
- **Pool Size**: Maximum 20 concurrent connections
- **Connection Timeout**: 30 seconds
- **Automatic Retry**: Failed connections are automatically retried
- **Resource Management**: Connections are automatically acquired and released
- **Error Handling**: Comprehensive error handling with connection pool fallback

This ensures optimal database performance under load and prevents connection exhaustion issues.

## Authentication

### POST /login
- Description: Authenticate a user.
- Request Body (JSON):
  - username: string
  - password: string
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### POST /register
- Description: Register a new user.
- Request Body (JSON):
  - username: string
  - password: string
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Campaign Management

- All campaign data is now read from and written to the database. Local storage is not used.

### POST /campaigns
- Description: Create a new campaign for the user.
- Request Body (JSON):
  - username: string
  - name: string (campaign name)
  - description: string (optional)
  - game_rules_id: int (required)
  - image_url: string (optional)
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### GET /campaigns?username=USERNAME
- Description: List all campaigns for the user.
- Query Parameter:
  - username: string
- Response (JSON):
  - success: boolean
  - campaigns: array of {id, name, description, game_rules_id, image_url, background_image_url, created_at, system}
  - error: string (if failed)

### POST /campaigns/edit
- Description: Edit a campaign by id for the user.
- Request Body (JSON):
  - username: string
  - campaign_id: int
  - name: string
  - description: string (optional)
  - game_rules_id: int
  - image_url: string (optional)
  - background_image_url: string (optional)
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### POST /campaigns/delete
- Description: Delete a campaign by id for the user.
- Request Body (JSON):
  - username: string
  - campaign_id: int
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### POST /api/campaigns/edit
- Description: Edit an existing campaign.
- Request Body (JSON):
  - campaign_id: int (required)
  - name: string
  - description: string
  - game_rules_id: int
  - image_url: string
  - background_image_url: string
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Actors Management

### GET /actors?campaign_id=CAMPAIGN_ID
- Description: Get all actors for a specific campaign.
- Query Parameter:
  - campaign_id: int
- Response (JSON):
  - success: boolean
  - actors: array of {id, name, type, data, created_at}
  - error: string (if failed)

### POST /actors
- Description: Create a new actor for a campaign.
- Request Body (JSON):
  - campaign_id: int
  - name: string
  - type: string (optional)
  - data: object (optional)
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Scenes Management

### GET /scenes?campaign_id=CAMPAIGN_ID
- Description: Get all scenes for a specific campaign.
- Query Parameter:
  - campaign_id: int
- Response (JSON):
  - success: boolean
  - scenes: array of {id, name, data, created_at}
  - error: string (if failed)

### POST /scenes
- Description: Create a new scene for a campaign.
- Request Body (JSON):
  - campaign_id: int
  - name: string
  - data: object (optional)
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Journals Management

### GET /journals?campaign_id=CAMPAIGN_ID
- Description: Get all journals for a specific campaign.
- Query Parameter:
  - campaign_id: int
- Response (JSON):
  - success: boolean
  - journals: array of {id, title, content, created_at}
  - error: string (if failed)

### POST /journals
- Description: Create a new journal entry for a campaign.
- Request Body (JSON):
  - campaign_id: int
  - title: string
  - content: string (optional)
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Campaign Permissions

### GET /campaign_permissions?campaign_id=CAMPAIGN_ID
- Description: Get all permissions for a specific campaign.
- Query Parameter:
  - campaign_id: int
- Response (JSON):
  - success: boolean
  - permissions: array of {user_id, role}
  - error: string (if failed)

### POST /campaign_permissions
- Description: Add a new permission for a campaign.
- Request Body (JSON):
  - campaign_id: int
  - user_id: int
  - role: string (owner, gm, player, observer)
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Map Management

### GET /api/maps?campaign_id=CAMPAIGN_ID
- Description: Get all maps for a specific campaign.
- Query Parameter:
  - campaign_id: int
- Response (JSON):
  - success: boolean
  - maps: array of {id, name, data, created_by, created_at}
  - error: string (if failed)

### POST /api/maps
- Description: Create a new map for a campaign.
- Request Body (JSON):
  - campaign_id: int
  - name: string
  - data: object (map data)
  - username: string
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Assets Management

### GET /assets?campaign_id=CAMPAIGN_ID
- Description: Get all assets for a specific campaign.
- Query Parameter:
  - campaign_id: int
- Response (JSON):
  - success: boolean
  - assets: array of {id, name, type, file_url, file_size, mime_type, description, tags, created_at}
  - error: string (if failed)

### POST /assets
- Description: Upload a new asset for a campaign.
- Request: multipart/form-data
  - file: asset file
  - campaign_id: int
  - name: string
  - type: string (image, audio, video, document)
  - description: string (optional)
  - tags: JSON array (optional)
- Response (JSON):
  - success: boolean
  - asset_id: int
  - file_url: string
  - error: string (if failed)

### PUT /assets/:id
- Description: Update an existing asset.
- Request Body (JSON):
  - name: string (optional)
  - description: string (optional)
  - tags: JSON array (optional)
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### DELETE /assets/:id
- Description: Delete an asset.
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Map Layer Assets Management

### Map Tokens

#### GET /api/map-tokens?map_id=MAP_ID
- Description: Get all tokens for a specific map.
- Query Parameter:
  - map_id: int
- Response (JSON):
  - success: boolean
  - tokens: array of {id, map_id, asset_id, name, x_position, y_position, scale_x, scale_y, rotation, z_index, visible, locked, properties, created_at, updated_at}
  - error: string (if failed)

#### POST /api/map-tokens
- Description: Place a token on the map.
- Request Body (JSON):
  - map_id: int
  - asset_id: int
  - name: string (optional)
  - x_position: decimal (or grid_x for compatibility)
  - y_position: decimal (or grid_y for compatibility)
  - grid_z: decimal (optional, default 0)
  - scale_x: decimal (optional, default 1.0)
  - scale_y: decimal (optional, default 1.0)
  - rotation: decimal (optional, default 0.0)
  - visible: boolean (optional, default true)
  - locked: boolean (optional, default false)
  - properties: object (optional)
- Response (JSON):
  - success: boolean
  - token_id: int
  - error: string (if failed)

#### PUT /api/map-tokens/:id
- Description: Update a token on the map.
- Request Body (JSON): All fields optional
  - name: string
  - grid_x: decimal (or x_position for compatibility)
  - grid_y: decimal (or y_position for compatibility)
  - grid_z: decimal
  - scale_x: decimal
  - scale_y: decimal
  - rotation: decimal
  - visible: boolean
  - locked: boolean
  - properties: object
- Response (JSON):
  - success: boolean
  - error: string (if failed)

#### DELETE /api/map-tokens/:id
- Description: Remove a token from the map.
- Response (JSON):
  - success: boolean
  - error: string (if failed)

#### PUT /api/map-tokens/batch
- Description: Batch update multiple tokens on the map.
- Request Body (JSON):
  - tokens: array of token objects with id and fields to update
    - id: int (required)
    - name: string (optional)
    - grid_x: decimal (optional)
    - grid_y: decimal (optional)
    - grid_z: decimal (optional)
    - scale_x: decimal (optional)
    - scale_y: decimal (optional)
    - rotation: decimal (optional)
    - visible: boolean (optional)
    - locked: boolean (optional)
    - properties: object (optional)
- Response (JSON):
  - success: boolean
  - updated_count: int
  - errors: array of error messages
  - error: string (if failed)

### Token Management (Legacy API)

#### GET /api/tokens?map_id=MAP_ID
- Description: Get all tokens for a specific map (legacy endpoint, use /api/map-tokens instead).
- Query Parameter:
  - map_id: int
- Response (JSON):
  - success: boolean
  - tokens: array of {id, map_id, asset_id, name, grid_x, grid_y, grid_z, scale_x, scale_y, rotation, visible, locked, properties, created_at, updated_at}
  - error: string (if failed)

### Map Backgrounds

#### GET /api/map-backgrounds?map_id=MAP_ID
- Description: Get all backgrounds for a specific map.
- Query Parameter:
  - map_id: int
- Response (JSON):
  - success: boolean
  - backgrounds: array of {id, map_id, asset_id, name, x_position, y_position, width, height, scale_x, scale_y, rotation, z_index, visible, locked, properties, created_at, updated_at}
  - error: string (if failed)

#### POST /api/map-backgrounds
- Description: Place a background on the map.
- Request Body (JSON):
  - map_id: int
  - asset_id: int
  - name: string (optional)
  - x_position: decimal
  - y_position: decimal
  - width: decimal
  - height: decimal
  - scale_x: decimal (optional, default 1.0)
  - scale_y: decimal (optional, default 1.0)
  - rotation: decimal (optional, default 0.0)
  - z_index: int (optional, default 0)
  - visible: boolean (optional, default true)
  - locked: boolean (optional, default false)
  - properties: object (optional)
- Response (JSON):
  - success: boolean
  - background_id: int
  - error: string (if failed)

#### PUT /api/map-backgrounds/:id
- Description: Update a background on the map.
- Request Body (JSON): Same as POST, all fields optional
- Response (JSON):
  - success: boolean
  - error: string (if failed)

#### DELETE /api/map-backgrounds/:id
- Description: Remove a background from the map.
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### Map Audio

#### GET /api/map-audio?map_id=MAP_ID
- Description: Get all audio elements for a specific map.
- Query Parameter:
  - map_id: int
- Response (JSON):
  - success: boolean
  - audio: array of {id, map_id, asset_id, name, x_position, y_position, volume, loop_audio, auto_play, radius, z_index, visible, locked, properties, created_at, updated_at}
  - error: string (if failed)

#### POST /api/map-audio
- Description: Place an audio element on the map.
- Request Body (JSON):
  - map_id: int
  - asset_id: int
  - name: string (optional)
  - x_position: decimal
  - y_position: decimal
  - volume: decimal (optional, default 1.0)
  - loop_audio: boolean (optional, default false)
  - auto_play: boolean (optional, default false)
  - radius: decimal (optional, default 0 for global)
  - z_index: int (optional, default 0)
  - visible: boolean (optional, default true)
  - locked: boolean (optional, default false)
  - properties: object (optional)
- Response (JSON):
  - success: boolean
  - audio_id: int
  - error: string (if failed)

#### PUT /api/map-audio/:id
- Description: Update an audio element on the map.
- Request Body (JSON): Same as POST, all fields optional
- Response (JSON):
  - success: boolean
  - error: string (if failed)

#### DELETE /api/map-audio/:id
- Description: Remove an audio element from the map.
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### Map Props

#### GET /api/map-props?map_id=MAP_ID
- Description: Get all props for a specific map.
- Query Parameter:
  - map_id: int
- Response (JSON):
  - success: boolean
  - props: array of {id, map_id, asset_id, name, x_position, y_position, width, height, scale_x, scale_y, rotation, z_index, visible, locked, properties, created_at, updated_at}
  - error: string (if failed)

#### POST /api/map-props
- Description: Place a prop on the map.
- Request Body (JSON):
  - map_id: int
  - asset_id: int
  - name: string (optional)
  - x_position: decimal
  - y_position: decimal
  - width: decimal
  - height: decimal
  - scale_x: decimal (optional, default 1.0)
  - scale_y: decimal (optional, default 1.0)
  - rotation: decimal (optional, default 0.0)
  - z_index: int (optional, default 0)
  - visible: boolean (optional, default true)
  - locked: boolean (optional, default false)
  - properties: object (optional)
- Response (JSON):
  - success: boolean
  - prop_id: int
  - error: string (if failed)

#### PUT /api/map-props/:id
- Description: Update a prop on the map.
- Request Body (JSON): Same as POST, all fields optional
- Response (JSON):
  - success: boolean
  - error: string (if failed)

#### DELETE /api/map-props/:id
- Description: Remove a prop from the map.
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Campaign Settings

### GET /campaigns/:id/settings
- Description: Get campaign settings.
- Response (JSON):
  - success: boolean
  - settings: object (grid, lighting, audio, permissions configuration)
  - error: string (if failed)

### PUT /campaigns/:id/settings
- Description: Update campaign settings.
- Request Body (JSON):
  - settings: object (grid, lighting, audio, permissions configuration)
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Utility APIs

### GET /api/user_id?username=USERNAME
- Description: Get user ID by username.
- Query Parameter:
  - username: string
- Response (JSON):
  - success: boolean
  - user_id: int
  - error: string (if failed)

### GET /debug/users
- Description: Get all users (debug endpoint).
- Response (JSON):
  - success: boolean
  - users: array of {id, username}
  - error: string (if failed)

### GET /api/debug/check-map?map_id=MAP_ID
- Description: Debug endpoint to check if a map exists.
- Query Parameter:
  - map_id: int
- Response (JSON):
  - success: boolean
  - exists: boolean
  - map_id: string
  - name: string (if exists)
  - campaign_id: string (if exists)
  - message: string (if not exists)
  - error: string (if failed)

### POST /api/upload
- Description: Upload campaign images.
- Request: multipart/form-data
  - file: image file
  - campaign_id: int
  - upload_type: string (optional, "background" for background images)
- Response (JSON):
  - success: boolean
  - image_url: string
  - error: string (if failed)

### POST /api/campaign-background-upload
- Description: Upload campaign background images (mock implementation).
- Request: multipart/form-data with 'image' field
- Response (JSON):
  - success: boolean
  - url: string (image URL)
  - error: string (if failed)

### POST /api/fix-image-paths
- Description: Fix existing image paths to include /backend/ prefix.
- Response (JSON):
  - success: boolean
  - message: string
  - error: string (if failed)

### GET /api/token-borders
- Description: Get all available token border images from the backend.
- Response (JSON):
  - success: boolean
  - borders: array of {name, url}
  - error: string (if failed)

## Token Sheets Management

### GET /api/token-sheets?map_id=MAP_ID
- Description: Get all token sheets for a specific map.
- Query Parameter:
  - map_id: int
- Response (JSON):
  - success: boolean
  - sheets: array of {id, map_token_id, actor_id, sheet_json, created_at, updated_at}
  - error: string (if failed)

### GET /api/token-sheets/:id
- Description: Get a specific token sheet by ID.
- Path Parameter:
  - id: int
- Response (JSON):
  - success: boolean
  - sheet: object {id, map_token_id, actor_id, sheet_json, created_at, updated_at}
  - error: string (if failed)

### POST /api/token-sheets
- Description: Create a new token sheet.
- Request Body (JSON):
  - map_token_id: int
  - actor_id: int (optional)
  - sheet_json: object (character sheet data)
- Response (JSON):
  - success: boolean
  - id: int (new sheet ID)
  - error: string (if failed)

### PUT /api/token-sheets/:id
- Description: Update an existing token sheet.
- Path Parameter:
  - id: int
- Request Body (JSON):
  - sheet_json: object (updated character sheet data)
  - actor_id: int (optional)
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### DELETE /api/token-sheets/:id
- Description: Delete a token sheet.
- Path Parameter:
  - id: int
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### POST /api/token-sheets/auto-create
- Description: Auto-create a token sheet based on campaign game rules.
- Request Body (JSON):
  - map_token_id: int
  - token_name: string
- Response (JSON):
  - success: boolean
  - id: int (new sheet ID)
  - sheet_json: object (generated character sheet)
  - system: string (game system used)
  - error: string (if failed)

## Map

- All map data is now managed via the database.

### GET /map
- Description: Get map data. Returns all maps, or maps for a specific user if username is provided.
- Query Parameter (optional):
  - username: string
- Response (JSON):
  - success: boolean
  - maps: array of {id, name, data, created_at}
  - error: string (if failed)

## Game Rules

### GET /rules (or /api/rules)
- Description: Get all game rules.
- Response (JSON):
  - Array of {id, system, folder_name, rules_json}

### POST /api/rules
- Description: Add a new game rule.
- Request Body (JSON):
  - system: string
  - folder_name: string (optional, corresponds to game system folder)
  - rules_json: string
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### PUT /api/rules
- Description: Edit an existing game rule.
- Request Body (JSON):
  - id: int
  - system: string
  - folder_name: string (optional, corresponds to game system folder)
  - rules_json: string
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### DELETE /api/rules
- Description: Delete a game rule.
- Request Body (JSON):
  - id: int
- Response (JSON):
  - success: boolean
  - error: string (if failed)

## Game Systems (Dynamic)

### GET /api/game-systems
- Description: Get all available game systems with their folder information.
- Response (JSON):
  - success: boolean
  - game_systems: array of {id, system, folder_name, rules_json}
  - error: string (if failed)

### GET /api/game-systems/:folder
- Description: Get specific game system data by folder name.
- Path Parameter:
  - folder: string (game system folder name, e.g., "pathfinder_1e", "dnd_5e")
- Query Parameters:
  - type: string (optional, default "character_sheet")
    - "character_sheet": Get character sheet template
    - "metadata": Get game system metadata
    - "classes", "races", "abilities", etc.: Get specific game data files
- Response (JSON):
  - success: boolean
  - data: object (requested game system data)
  - error: string (if failed)

#### Available Game System Folders:
- `dnd_5e`: Dungeons & Dragons 5th Edition
- `pathfinder_1e`: Pathfinder 1st Edition
- `pathfinder_2e`: Pathfinder 2nd Edition
- `dnd_35e`: Dungeons & Dragons 3.5 Edition

#### Example Requests:
- `GET /api/game-systems/pathfinder_1e?type=character_sheet`: Get Pathfinder 1e character sheet template
- `GET /api/game-systems/dnd_5e?type=classes`: Get D&D 5e classes data
- `GET /api/game-systems/pathfinder_2e?type=metadata`: Get Pathfinder 2e metadata

### POST `/api/reset_password`
Mock implementation for password reset functionality.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent (mock implementation)"
}
```

### GET `/api/campaigns/export`
Export campaign data in Foundry VTT compatible format.

**Query Parameters:**
- `campaign_id`: ID of the campaign to export

**Response:**
JSON file download with campaign data including actors, scenes, and journals.

**Response Format:**
```json
{
  "name": "Campaign Name",
  "description": "Campaign Description",
  "system": "D&D 5e",
  "version": "1.0.0",
  "actors": [
    {
      "name": "Actor Name",
      "type": "character",
      "data": {}
    }
  ],
  "scenes": [
    {
      "name": "Scene Name",
      "data": {}
    }
  ],
  "journal": [
    {
      "name": "Journal Entry",
      "content": "Journal content"
    }
  ],
  "exported_at": "2024-01-01T00:00:00.000Z"
}
```

### POST `/api/campaigns/import`
Import campaign data from Foundry VTT compatible format.

**Request Body:**
```json
{
  "username": "user123",
  "data": {
    "name": "Imported Campaign",
    "description": "Campaign Description",
    "system": "D&D 5e",
    "actors": [],
    "scenes": [],
    "journal": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "campaign_id": 123,
  "message": "Campaign imported successfully"
}
```