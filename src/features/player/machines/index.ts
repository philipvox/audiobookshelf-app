/**
 * src/features/player/machines/index.ts
 *
 * State machine exports for the player feature.
 */

export {
  audioMachine,
  canUpdatePosition,
  canControl,
  isPlayable,
  isSeeking,
  hasError,
  getStateDescription,
  type AudioMachine,
  type AudioState,
  type AudioContext,
  type AudioEvent,
} from './audioMachine';
