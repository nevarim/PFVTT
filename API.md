# PFVTT API Documentation

## Technical Implementation

### Database Connection Pooling
The backend uses MySQL connection pooling for improved performance and reliability:
- **Pool Size**: Maximum 10 concurrent connections
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
  - x_position: decimal
  - y_position: decimal
  - scale_x: decimal (optional, default 1.0)
  - scale_y: decimal (optional, default 1.0)
  - rotation: decimal (optional, default 0.0)
  - z_index: int (optional, default 0)
  - visible: boolean (optional, default true)
  - locked: boolean (optional, default false)
  - properties: object (optional)
- Response (JSON):
  - success: boolean
  - token_id: int
  - error: string (if failed)

#### PUT /api/map-tokens/:id
- Description: Update a token on the map.
- Request Body (JSON): Same as POST, all fields optional
- Response (JSON):
  - success: boolean
  - error: string (if failed)

#### DELETE /api/map-tokens/:id
- Description: Remove a token from the map.
- Response (JSON):
  - success: boolean
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

### POST /api/fix-image-paths
- Description: Fix existing image paths to include /backend/ prefix.
- Response (JSON):
  - success: boolean
  - message: string
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
  - Array of {id, system, rules_json}

### POST /api/rules
- Description: Add a new game rule.
- Request Body (JSON):
  - system: string
  - rules_json: string
- Response (JSON):
  - success: boolean
  - error: string (if failed)

### PUT /api/rules
- Description: Edit an existing game rule.
- Request Body (JSON):
  - id: int
  - system: string
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