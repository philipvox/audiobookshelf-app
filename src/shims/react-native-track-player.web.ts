/**
 * Web stub for react-native-track-player
 *
 * Provides no-op implementations for design inspection on web.
 * Audio playback is not functional on web - use iOS/Android for testing audio.
 */

const noop = () => Promise.resolve();
const noopSync = () => {};

export enum State {
  None = 'none',
  Ready = 'ready',
  Playing = 'playing',
  Paused = 'paused',
  Stopped = 'stopped',
  Buffering = 'buffering',
  Loading = 'loading',
}

export enum RepeatMode {
  Off = 0,
  Track = 1,
  Queue = 2,
}

export enum Capability {
  Play = 0,
  Pause = 1,
  Stop = 2,
  SeekTo = 3,
  Skip = 4,
  SkipToNext = 5,
  SkipToPrevious = 6,
  JumpForward = 7,
  JumpBackward = 8,
  SetRating = 9,
  Like = 10,
  Dislike = 11,
  Bookmark = 12,
}

export enum Event {
  PlaybackState = 'playback-state',
  PlaybackError = 'playback-error',
  PlaybackQueueEnded = 'playback-queue-ended',
  PlaybackTrackChanged = 'playback-track-changed',
  PlaybackProgressUpdated = 'playback-progress-updated',
  RemotePlay = 'remote-play',
  RemotePause = 'remote-pause',
  RemoteStop = 'remote-stop',
  RemoteSkip = 'remote-skip',
  RemoteNext = 'remote-next',
  RemotePrevious = 'remote-previous',
  RemoteSeek = 'remote-seek',
  RemoteJumpForward = 'remote-jump-forward',
  RemoteJumpBackward = 'remote-jump-backward',
}

const TrackPlayer = {
  setupPlayer: noop,
  updateOptions: noop,
  add: noop,
  remove: noop,
  skip: noop,
  skipToNext: noop,
  skipToPrevious: noop,
  play: noop,
  pause: noop,
  stop: noop,
  reset: noop,
  seekTo: noop,
  seekBy: noop,
  setVolume: noop,
  setRate: noop,
  setRepeatMode: noop,
  getVolume: () => Promise.resolve(1),
  getRate: () => Promise.resolve(1),
  getTrack: () => Promise.resolve(null),
  getCurrentTrack: () => Promise.resolve(null),
  getActiveTrackIndex: () => Promise.resolve(null),
  getActiveTrack: () => Promise.resolve(null),
  getQueue: () => Promise.resolve([]),
  getState: () => Promise.resolve(State.None),
  getProgress: () => Promise.resolve({ position: 0, duration: 0, buffered: 0 }),
  getPlaybackState: () => Promise.resolve({ state: State.None }),
  getRepeatMode: () => Promise.resolve(RepeatMode.Off),
  registerPlaybackService: noopSync,
  addEventListener: () => ({ remove: noopSync }),
};

export function usePlaybackState() {
  return { state: State.None };
}

export function useProgress() {
  return { position: 0, duration: 0, buffered: 0 };
}

export function useActiveTrack() {
  return null;
}

export function useIsPlaying() {
  return { playing: false, bufferingDuringPlay: false };
}

export default TrackPlayer;
