/**
 * src/features/downloads/index.ts
 * 
 * Simplified downloads feature - auto-download only
 * No manual download UI, just background auto-download of top 3 books
 */

export { autoDownloadService } from './services/autoDownloadService';
export type { DownloadedBook, DownloadStatus } from './services/autoDownloadService';