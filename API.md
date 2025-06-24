# PFVTT API Documentation

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
  - campaigns: array of {id, name, description, game_rules_id, image_url, created_at}
  - error: string (if failed)

### POST /campaigns/delete
- Description: Delete a campaign by id for the user.
- Request Body (JSON):
  - username: string
  - campaign_id: int
- Response (JSON):
  - success: boolean
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

### GET /rules
- Description: Get all game rules.
- Response (JSON):
  - Array of {id, system, rules_json}