/**
 * src/constants/version.ts
 *
 * App version tracking for development.
 * Update this file with each significant change.
 * See CHANGELOG.md in project root for detailed change history.
 */

export const APP_VERSION = '0.7.94';
export const BUILD_NUMBER = 794;
export const VERSION_DATE = '2026-01-16';

// Version info for display
export const getVersionString = () => `v${APP_VERSION} (${BUILD_NUMBER})`;
export const getFullVersionInfo = () => ({
  version: APP_VERSION,
  build: BUILD_NUMBER,
  date: VERSION_DATE,
});
