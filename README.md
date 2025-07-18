# PFVTT

A Virtual Tabletop (VTT) project inspired by Foundry VTT, featuring a Dart backend and EJS frontend. Uses MySQL database with connection pooling for improved performance and stability (localhost, DB: PFVTT, user: PFVTT, password: PFVTT).

## Project Structure
- `frontend/` — EJS-based frontend
- `backend/` — Dart backend

## Getting Started

### Prerequisites
- Node.js (for frontend)
- Dart SDK (for backend)
- MySQL server

### Database Setup
1. Create the database and tables using the provided `PFVTT_schema.sql` file.
2. Ensure MySQL is running on localhost with user `PFVTT` and password `PFVTT`.
3. The backend uses MySQL connection pooling (max 10 connections) for optimal performance.

### Running the Project

Open two terminals:

**Terminal 1: Backend**
```sh
cd backend
dart pub get
dart run bin/backend.dart
```

**Terminal 2: Frontend**
```sh
cd frontend
npm install
npm start
```

The backend will handle API and DB logic, while the frontend serves the EJS pages and static assets.

## Features & Possibilities
- **Login and registration**: Secure login and registration forms with error handling, validation, and password reset request (mock, UI+API)
- **Password reset**: Request password reset from the login page, handled by `/api/reset_password` endpoint (mock implementation)
- **Session state**: Login state is stored in localStorage/sessionStorage on the frontend
- **Campaign management**: Create, list, and delete campaigns; each campaign can be associated with a game system and metadata (title, description, image)
- **Game rules management**: Admin interface to add, edit, and delete game rules (Pathfinder, Pathfinder 2, D&D 5.0, D&D 3.5 supported by default)
- **Map page**: Interactive map with layer system (Map, Walls, Tokens, GM, Audio, Props layers) and drag-and-drop asset placement
- **Layer system**: Roll20-style layer management with keyboard shortcuts (1-6) and visual controls
- **Asset management**: Upload and organize assets by category (tokens, backgrounds, audio, props) with drag-and-drop functionality
- **Drag and drop**: Drag assets from the asset panel directly onto map layers with automatic layer assignment based on asset type
- **Actors, scenes, journals, permissions**: Backend API ready for managing actors, scenes, journals, and campaign permissions (frontend integration planned)
- **Import/export**: Campaign data import/export (Foundry VTT compatible, planned)
- **Responsive design**: All main pages are mobile-friendly
- **Extensible**: Modular rule management and future support for real-time features, chat, and map drawing tools

## Roadmap
See `ROADMAP.md` for planned features and progress.

## License
MIT