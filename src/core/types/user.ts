/**
 * src/core/types/user.ts
 * 
 * TypeScript interfaces for user-related models.
 */

import { MediaProgress, Bookmark } from './media';

/**
 * User account information
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  type: 'root' | 'admin' | 'user' | 'guest';
  token: string;
  mediaProgress: MediaProgress[];
  seriesHideFromContinueListening: string[];
  bookmarks: Bookmark[];
  isActive: boolean;
  isLocked: boolean;
  lastSeen?: number;
  createdAt: number;
  permissions: UserPermissions;
  librariesAccessible: string[];
  itemTagsAccessible: string[];
}

/**
 * User permissions configuration
 */
export interface UserPermissions {
  download: boolean;
  update: boolean;
  delete: boolean;
  upload: boolean;
  accessAllLibraries: boolean;
  accessAllTags: boolean;
  accessExplicitContent: boolean;
}

/**
 * Device information for playback
 */
export interface DeviceInfo {
  id: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  deviceType?: string;
  manufacturer?: string;
  model?: string;
  sdkVersion?: number;
  clientName: string;
  clientVersion: string;
}
