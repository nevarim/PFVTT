// Shared interfaces for type safety across the application

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  game_system: string;
  system?: string;
  game_rules_id?: number;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CampaignsResponse {
  success: boolean;
  campaigns: Campaign[];
  error?: string;
}

export interface Actor {
  id: number;
  name: string;
  character_sheet: string;
  campaign_id: number;
  type?: string;
  data?: string;
  created_at: string;
  updated_at: string;
}

export interface ActorsResponse {
  success: boolean;
  actors: Actor[];
  error?: string;
}

export interface Scene {
  id: number;
  name: string;
  width: number;
  height: number;
  grid_size: number;
  background_image?: string;
  notes?: string;
  is_active: boolean;
  campaign_id: number;
  image_url?: string;
  data?: string;
  created_at: string;
  updated_at: string;
}

export interface ScenesResponse {
  success: boolean;
  scenes: Scene[];
  error?: string;
}

export interface Journal {
  id: number;
  title: string;
  content: string;
  created_at: string;
  campaign_id: number;
}

export interface JournalsResponse {
  success: boolean;
  journals: Journal[];
  error?: string;
}

export interface Permission {
  id: number;
  user_id: number;
  campaign_id: number;
  role: string;
  username?: string;
}

export interface PermissionsResponse {
  success: boolean;
  permissions: Permission[];
  error?: string;
}

export interface User {
  id: number;
  username: string;
}

export interface UsersResponse {
  success: boolean;
  users: User[];
  error?: string;
}

export interface Rule {
  id: number;
  system: string;
  folder_name?: string;
  rules_json: string;
}

export interface GameSystem {
  id: number;
  system: string;
  folder_name: string;
  rules_json: string;
}

export interface GameSystemsResponse {
  success: boolean;
  game_systems: GameSystem[];
  error?: string;
}

export interface ApiResponse {
  success: boolean;
  error?: string;
}

export interface LoginResponse extends ApiResponse {
  user?: {
    id: number;
    username: string;
  };
}

export interface RegisterResponse extends ApiResponse {
  user?: {
    id: number;
    username: string;
  };
}

export interface DebugResponse extends ApiResponse {
  users: User[];
}

export interface ImageUploadResponse extends ApiResponse {
  url?: string;
}