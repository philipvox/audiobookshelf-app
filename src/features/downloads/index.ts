/**
 * src/features/downloads/index.ts
 *
 * Downloads feature - both auto-download and manual download support
 */

// Services
export { autoDownloadService } from './services/autoDownloadService';
export type { DownloadedBook, DownloadStatus } from './services/autoDownloadService';

// Re-export core download manager for convenience
export { downloadManager } from '@/core/services/downloadManager';
export type { DownloadTask } from '@/core/services/downloadManager';

// Screens
export { DownloadsScreen } from './screens/DownloadsScreen';

// Components
export { DownloadItem } from './components/DownloadItem';
