# PFVTT Roadmap

## Project Overview

### Infrastructure
- [x] **Project Setup**
  - [x] Create project structure (frontend/backend)
  - [x] Setup README and documentation
  - [x] Prepare SQL schema with connection pooling
  - [x] Dart backend server setup
  - [x] Node.js + EJS frontend setup

- [x] **Backend APIs (Dart)**
  - [x] MySQL connection with pooling
  - [x] User authentication system
  - [x] Campaign management API
  - [x] Game rules management API
  - [x] Map data API
  - [x] Actors API
  - [x] Scenes API
  - [x] Journals API
  - [x] Campaign permissions API

- [ ] **Integration & Deployment**
  - [x] Frontend-backend API integration
  - [ ] Session management improvements
  - [ ] End-to-end testing
  - [ ] Deployment scripts

---

## Pages Status

### 🟢 Login Page (COMPLETED)
**Status**: Fully functional

- [x] Login form UI with validation
- [x] Registration form UI
- [x] Backend authentication integration
- [x] Session state management (localStorage)
- [x] Error handling and validation
- [x] Responsive/mobile-friendly design
- [x] Password reset functionality (mock implementation)

### 🟢 Campaigns Page (COMPLETED)
**Status**: Fully functional

- [x] Campaign management UI
- [x] Create/edit/delete campaigns
- [x] Campaign metadata (title, description, system, images)
- [x] Background image upload and cropping tool
- [x] Game rules selection integration
- [x] Import/export functionality (Foundry VTT compatible)
- [x] Interactive map access button
- [x] Session-based map state management

### 🟢 Actors Page (COMPLETED)
**Status**: Fully functional

- [x] Actor management UI
- [x] Create/edit/delete actors
- [x] Actor metadata (name, class, level, stats)
- [x] Campaign-specific actor lists
- [x] Navigation integration

### 🟢 Scenes Page (COMPLETED)
**Status**: Fully functional

- [x] Scene management UI
- [x] Create/edit/delete scenes
- [x] Scene metadata (name, description, background)
- [x] Campaign-specific scene lists
- [x] Navigation integration

### 🟢 Journals Page (COMPLETED)
**Status**: Fully functional

- [x] Journal management UI
- [x] Create/edit/delete journals
- [x] Journal metadata (title, content, tags)
- [x] Campaign-specific journal lists
- [x] Navigation integration

### 🟢 Permissions Page (COMPLETED)
**Status**: Fully functional

- [x] Campaign permissions management UI
- [x] User roles assignment (owner, editor, viewer)
- [x] Add/remove users from campaigns
- [x] Permission levels management
- [x] Navigation integration

### 🟢 Rules Page (COMPLETED)
**Status**: Fully functional

- [x] Game rules management UI
- [x] Create/edit/delete rules
- [x] Rule metadata (name, description, system, category)
- [x] Search and filtering functionality
- [x] Navigation integration

### 🟢 Map Page (NEARLY COMPLETE)
**Status**: 95% complete, advanced features in development

#### ✅ Completed Features
- [x] Basic map page UI with Roll20-style interface
- [x] Map data fetching from backend
- [x] Database integration
- [x] Enter Campaign button integration
- [x] Maps Management API integration
  - [x] GET `/api/maps?campaign_id=ID`
  - [x] POST `/api/maps`
- [x] Scenes Management API integration
  - [x] GET `/scenes?campaign_id=ID`
  - [x] POST `/scenes`
- [x] Asset management system
  - [x] Category-based filtering (Tokens, Backgrounds, Props, Audio)
  - [x] File upload with automatic categorization
  - [x] Asset library with search functionality
- [x] Campaign settings interface
- [x] UI improvements and bug fixes
  - [x] Resolved token duplication issue
  - [x] Improved asset categorization logic
  - [x] Enhanced file path handling

#### 🔄 In Development
- [ ] **Advanced Map Features**
  - [ ] Dynamic lighting system
  - [ ] Fog of war
  - [ ] Advanced drawing tools
  - [ ] Real-time collaboration

#### 📋 Planned Features
- [x] **Assets Management** (COMPLETED)
  - [x] Database schema (assets table)
  - [x] API documentation
  - [x] Backend implementation
    - [x] GET `/assets?campaign_id=ID`
    - [x] POST `/assets` (file upload)
    - [x] PUT `/assets/:id`
    - [x] DELETE `/assets/:id`
  - [x] Frontend UI
    - [x] Asset upload interface
    - [x] Asset library browser
    - [x] Asset management tools (edit/delete)
    - [x] Category filtering system
    - [x] File type validation and categorization

- [x] **Campaign Settings**
  - [x] Database schema (settings JSON field)
  - [x] API documentation
  - [x] Backend implementation
    - [x] GET `/campaigns/:id/settings`
    - [x] PUT `/campaigns/:id/settings`
  - [x] Frontend UI
    - [x] Grid configuration
    - [ ] Lighting settings (future enhancement)
    - [ ] Audio settings (future enhancement)
    - [ ] Permission settings (future enhancement)

- [ ] **Advanced Map Features**
  - [ ] Real-time collaboration
  - [ ] Drawing tools
  - [ ] Token management
  - [ ] Fog of war
  - [ ] Dynamic lighting

---

## Future Enhancements

### Game Systems Support
- [ ] D&D 3.0 rules integration
- [ ] D&D 3.5 rules integration
- [ ] D&D 4.0 rules integration
- [ ] D&D 5.0 rules integration
- [ ] Pathfinder rules integration
- [ ] Pathfinder 2 rules integration
- [ ] Starfinder rules integration

### Advanced Features
- [ ] Real-time chat system
- [ ] Voice/video integration
- [ ] Mobile app development
- [ ] Plugin system
- [ ] Advanced scripting support

---

## Development Priorities

1. **High Priority**: Advanced map features (token management, drawing tools, real-time collaboration)
2. **Medium Priority**: Dynamic lighting system and fog of war
3. **Low Priority**: Additional game system support and advanced features

## Notes
- Focus on completing Map Page functionality before adding new features
- Maintain security and performance standards
- Ensure mobile compatibility for all new features
- Consider real-time features for future releases