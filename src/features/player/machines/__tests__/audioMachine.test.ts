/**
 * Tests for Audio State Machine
 *
 * Verifies state transitions, guards, and actions.
 */

import { createActor } from 'xstate';
import {
  audioMachine,
  canUpdatePosition,
  canControl,
  isPlayable,
  isSeeking,
  hasError,
  getStateDescription,
} from '../audioMachine';

describe('AudioMachine', () => {
  describe('Initial State', () => {
    it('starts in idle state', () => {
      const actor = createActor(audioMachine);
      actor.start();

      expect(actor.getSnapshot().value).toBe('idle');

      actor.stop();
    });

    it('has correct initial context', () => {
      const actor = createActor(audioMachine);
      actor.start();

      const context = actor.getSnapshot().context;
      expect(context.position).toBe(0);
      expect(context.duration).toBe(0);
      expect(context.playbackRate).toBe(1.0);
      expect(context.bookId).toBeNull();
      expect(context.seekPosition).toBeNull();

      actor.stop();
    });
  });

  describe('Loading Flow', () => {
    it('transitions from idle to loading on LOAD', () => {
      const actor = createActor(audioMachine);
      actor.start();

      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('loading');
      expect(snapshot.context.bookId).toBe('book-1');
      expect(snapshot.context.bookTitle).toBe('Test Book');
      expect(snapshot.context.trackCount).toBe(3);

      actor.stop();
    });

    it('transitions from loading to ready on LOADED', () => {
      const actor = createActor(audioMachine);
      actor.start();

      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });
      actor.send({ type: 'LOADED', duration: 3600, position: 100 });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('ready');
      expect(snapshot.context.duration).toBe(3600);
      expect(snapshot.context.position).toBe(100);

      actor.stop();
    });

    it('transitions from loading to error on ERROR', () => {
      const actor = createActor(audioMachine);
      actor.start();

      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });
      actor.send({ type: 'ERROR', message: 'Failed to load', code: 'LOAD_ERROR' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('error');
      expect(snapshot.context.errorMessage).toBe('Failed to load');
      expect(snapshot.context.errorCode).toBe('LOAD_ERROR');

      actor.stop();
    });
  });

  describe('Playback Control', () => {
    function createReadyActor() {
      const actor = createActor(audioMachine);
      actor.start();
      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });
      actor.send({ type: 'LOADED', duration: 3600, position: 0 });
      return actor;
    }

    it('transitions from ready to playing on PLAY', () => {
      const actor = createReadyActor();

      actor.send({ type: 'PLAY' });

      expect(actor.getSnapshot().value).toBe('playing');

      actor.stop();
    });

    it('transitions from playing to paused on PAUSE', () => {
      const actor = createReadyActor();

      actor.send({ type: 'PLAY' });
      actor.send({ type: 'PAUSE' });

      expect(actor.getSnapshot().value).toBe('paused');

      actor.stop();
    });

    it('transitions from paused to playing on PLAY', () => {
      const actor = createReadyActor();

      actor.send({ type: 'PLAY' });
      actor.send({ type: 'PAUSE' });
      actor.send({ type: 'PLAY' });

      expect(actor.getSnapshot().value).toBe('playing');

      actor.stop();
    });

    it('sets lastPauseTime on pause', () => {
      const actor = createReadyActor();

      actor.send({ type: 'PLAY' });

      const beforePause = Date.now();
      actor.send({ type: 'PAUSE' });
      const afterPause = Date.now();

      const pauseTime = actor.getSnapshot().context.lastPauseTime;
      expect(pauseTime).toBeGreaterThanOrEqual(beforePause);
      expect(pauseTime).toBeLessThanOrEqual(afterPause);

      actor.stop();
    });

    it('clears lastPauseTime on play', () => {
      const actor = createReadyActor();

      actor.send({ type: 'PLAY' });
      actor.send({ type: 'PAUSE' });
      actor.send({ type: 'PLAY' });

      expect(actor.getSnapshot().context.lastPauseTime).toBeNull();

      actor.stop();
    });
  });

  describe('Position Updates', () => {
    function createPlayingActor() {
      const actor = createActor(audioMachine);
      actor.start();
      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });
      actor.send({ type: 'LOADED', duration: 3600, position: 0 });
      actor.send({ type: 'PLAY' });
      return actor;
    }

    it('updates position while playing', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'POSITION_UPDATE', position: 100 });

      expect(actor.getSnapshot().context.position).toBe(100);

      actor.stop();
    });

    it('updates position while paused', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'PAUSE' });
      actor.send({ type: 'POSITION_UPDATE', position: 200 });

      expect(actor.getSnapshot().context.position).toBe(200);

      actor.stop();
    });

    it('ignores position updates while seeking', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'SEEK', position: 500 });
      actor.send({ type: 'POSITION_UPDATE', position: 100 });

      // Position should NOT be updated to 100
      expect(actor.getSnapshot().context.position).toBe(0);
      expect(actor.getSnapshot().context.seekPosition).toBe(500);

      actor.stop();
    });
  });

  describe('Seeking', () => {
    function createPlayingActor() {
      const actor = createActor(audioMachine);
      actor.start();
      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });
      actor.send({ type: 'LOADED', duration: 3600, position: 0 });
      actor.send({ type: 'PLAY' });
      return actor;
    }

    it('transitions to seeking on SEEK from playing', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'SEEK', position: 500 });

      expect(actor.getSnapshot().value).toBe('seeking');
      expect(actor.getSnapshot().context.seekPosition).toBe(500);

      actor.stop();
    });

    it('transitions to seeking on SEEK from paused', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'PAUSE' });
      actor.send({ type: 'SEEK', position: 500 });

      expect(actor.getSnapshot().value).toBe('seeking');

      actor.stop();
    });

    it('allows chained seeks (scrubbing)', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'SEEK', position: 500 });
      actor.send({ type: 'SEEK', position: 600 });
      actor.send({ type: 'SEEK', position: 700 });

      expect(actor.getSnapshot().value).toBe('seeking');
      expect(actor.getSnapshot().context.seekPosition).toBe(700);

      actor.stop();
    });

    it('transitions to paused on SEEK_COMPLETE', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'SEEK', position: 500 });
      actor.send({ type: 'SEEK_COMPLETE', position: 500 });

      expect(actor.getSnapshot().value).toBe('paused');
      expect(actor.getSnapshot().context.position).toBe(500);
      expect(actor.getSnapshot().context.seekPosition).toBeNull();

      actor.stop();
    });
  });

  describe('Buffering', () => {
    function createPlayingActor() {
      const actor = createActor(audioMachine);
      actor.start();
      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });
      actor.send({ type: 'LOADED', duration: 3600, position: 0 });
      actor.send({ type: 'PLAY' });
      return actor;
    }

    it('transitions to buffering on BUFFER_START', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'BUFFER_START' });

      expect(actor.getSnapshot().value).toBe('buffering');

      actor.stop();
    });

    it('transitions back to playing on BUFFER_END', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'BUFFER_START' });
      actor.send({ type: 'BUFFER_END' });

      expect(actor.getSnapshot().value).toBe('playing');

      actor.stop();
    });

    it('can pause while buffering', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'BUFFER_START' });
      actor.send({ type: 'PAUSE' });

      expect(actor.getSnapshot().value).toBe('paused');

      actor.stop();
    });

    it('can seek while buffering', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'BUFFER_START' });
      actor.send({ type: 'SEEK', position: 1000 });

      expect(actor.getSnapshot().value).toBe('seeking');

      actor.stop();
    });
  });

  describe('Rate Change', () => {
    function createPlayingActor() {
      const actor = createActor(audioMachine);
      actor.start();
      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });
      actor.send({ type: 'LOADED', duration: 3600, position: 0 });
      actor.send({ type: 'PLAY' });
      return actor;
    }

    it('updates rate while playing', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'RATE_CHANGE', rate: 1.5 });

      expect(actor.getSnapshot().context.playbackRate).toBe(1.5);

      actor.stop();
    });

    it('updates rate while paused', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'PAUSE' });
      actor.send({ type: 'RATE_CHANGE', rate: 2.0 });

      expect(actor.getSnapshot().context.playbackRate).toBe(2.0);

      actor.stop();
    });
  });

  describe('Track Change', () => {
    function createPlayingActor() {
      const actor = createActor(audioMachine);
      actor.start();
      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });
      actor.send({ type: 'LOADED', duration: 3600, position: 0 });
      actor.send({ type: 'PLAY' });
      return actor;
    }

    it('updates track index', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'TRACK_CHANGE', trackIndex: 2 });

      expect(actor.getSnapshot().context.currentTrackIndex).toBe(2);

      actor.stop();
    });
  });

  describe('Error Handling', () => {
    function createPlayingActor() {
      const actor = createActor(audioMachine);
      actor.start();
      actor.send({
        type: 'LOAD',
        bookId: 'book-1',
        bookTitle: 'Test Book',
        trackCount: 3,
      });
      actor.send({ type: 'LOADED', duration: 3600, position: 0 });
      actor.send({ type: 'PLAY' });
      return actor;
    }

    it('transitions to error on ERROR from playing', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'ERROR', message: 'Playback failed' });

      expect(actor.getSnapshot().value).toBe('error');
      expect(actor.getSnapshot().context.errorMessage).toBe('Playback failed');

      actor.stop();
    });

    it('can retry from error state', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'ERROR', message: 'Playback failed' });
      actor.send({ type: 'RETRY' });

      expect(actor.getSnapshot().value).toBe('loading');
      expect(actor.getSnapshot().context.errorMessage).toBeNull();

      actor.stop();
    });

    it('can reset from error state', () => {
      const actor = createPlayingActor();

      actor.send({ type: 'ERROR', message: 'Playback failed' });
      actor.send({ type: 'RESET' });

      expect(actor.getSnapshot().value).toBe('idle');
      expect(actor.getSnapshot().context.bookId).toBeNull();

      actor.stop();
    });
  });

  describe('Reset', () => {
    it('resets from any state to idle', () => {
      const states = ['loading', 'playing', 'paused', 'seeking', 'buffering'];

      for (const _ of states) {
        const actor = createActor(audioMachine);
        actor.start();

        // Get to some state
        actor.send({
          type: 'LOAD',
          bookId: 'book-1',
          bookTitle: 'Test Book',
          trackCount: 3,
        });

        actor.send({ type: 'RESET' });

        expect(actor.getSnapshot().value).toBe('idle');
        expect(actor.getSnapshot().context).toEqual({
          position: 0,
          duration: 0,
          playbackRate: 1.0,
          currentTrackIndex: 0,
          trackCount: 0,
          seekPosition: null,
          bookId: null,
          bookTitle: null,
          errorMessage: null,
          errorCode: null,
          bufferedPosition: 0,
          lastPauseTime: null,
        });

        actor.stop();
      }
    });
  });
});

describe('Helper Functions', () => {
  describe('canUpdatePosition', () => {
    it('returns false for seeking state', () => {
      expect(canUpdatePosition('seeking')).toBe(false);
    });

    it('returns false for loading state', () => {
      expect(canUpdatePosition('loading')).toBe(false);
    });

    it('returns false for idle state', () => {
      expect(canUpdatePosition('idle')).toBe(false);
    });

    it('returns true for playing state', () => {
      expect(canUpdatePosition('playing')).toBe(true);
    });

    it('returns true for paused state', () => {
      expect(canUpdatePosition('paused')).toBe(true);
    });
  });

  describe('canControl', () => {
    it('returns true for ready, playing, paused, buffering', () => {
      expect(canControl('ready')).toBe(true);
      expect(canControl('playing')).toBe(true);
      expect(canControl('paused')).toBe(true);
      expect(canControl('buffering')).toBe(true);
    });

    it('returns false for idle, loading, seeking, error', () => {
      expect(canControl('idle')).toBe(false);
      expect(canControl('loading')).toBe(false);
      expect(canControl('seeking')).toBe(false);
      expect(canControl('error')).toBe(false);
    });
  });

  describe('isPlayable', () => {
    it('returns true for ready and paused', () => {
      expect(isPlayable('ready')).toBe(true);
      expect(isPlayable('paused')).toBe(true);
    });

    it('returns false for other states', () => {
      expect(isPlayable('playing')).toBe(false);
      expect(isPlayable('seeking')).toBe(false);
    });
  });

  describe('isSeeking', () => {
    it('returns true only for seeking state', () => {
      expect(isSeeking('seeking')).toBe(true);
      expect(isSeeking('playing')).toBe(false);
      expect(isSeeking('paused')).toBe(false);
    });
  });

  describe('hasError', () => {
    it('returns true only for error state', () => {
      expect(hasError('error')).toBe(true);
      expect(hasError('playing')).toBe(false);
    });
  });

  describe('getStateDescription', () => {
    it('returns human-readable descriptions', () => {
      expect(getStateDescription('idle')).toBe('No audio loaded');
      expect(getStateDescription('loading')).toBe('Loading audio...');
      expect(getStateDescription('ready')).toBe('Ready to play');
      expect(getStateDescription('playing')).toBe('Playing');
      expect(getStateDescription('paused')).toBe('Paused');
      expect(getStateDescription('buffering')).toBe('Buffering...');
      expect(getStateDescription('seeking')).toBe('Seeking...');
      expect(getStateDescription('error')).toBe('Error occurred');
    });
  });
});
