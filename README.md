# PFVTT

A Virtual Tabletop (VTT) project inspired by Foundry VTT, featuring a Dart backend and EJS frontend. Uses MySQL database (localhost, DB: PFVTT, user: PFVTT, password: PFVTT).

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

### Running the Project

Open two terminals:

**Terminal 1: Backend**
```sh
cd backend
dart run bin/backend.dart
```

**Terminal 2: Frontend**
```sh
cd frontend
npm install
npm start
```

The backend will handle API and DB logic, while the frontend serves the EJS pages and static assets.

## Features
- Login and registration pages
- Campaign management UI
- Map page (after successful login)
- Game rules management (Pathfinder, Pathfinder 2, D&D 5.0, D&D 3.5)
- Uses localStorage/sessionStorage for login state on the frontend

## Roadmap
See `ROADMAP.md` for planned features and progress.

## License
MIT