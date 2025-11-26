/**
 * src/features/downloads/index.ts
 */

export { DownloadsScreen } from './screens/DownloadsScreen';
export { DownloadButton } from './components/DownloadButton';
export { DownloadItem } from './components/DownloadItem';
export { useDownloads, useBookDownload, formatBytes } from './hooks/useDownloads';
export { useDownloadStore } from './stores/downloadStore';
export { downloadService } from './services/downloadService';
export type { DownloadedBook, DownloadProgress } from './services/downloadService';