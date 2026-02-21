/**
 * src/core/events/eventBus.ts
 *
 * Type-safe event bus for cross-store and cross-feature communication.
 * Provides decoupled pub/sub without circular dependencies.
 */

import { EventMap, EventPayload } from './types';
import { logger } from '@/shared/utils/logger';

type Listener<K extends keyof EventMap> = (payload: EventPayload<K>) => void;

interface EventBusOptions {
  /** Enable debug logging of all events */
  debug?: boolean;
  /** Maximum listeners per event before warning */
  maxListeners?: number;
}

class TypedEventBus {
  private listeners = new Map<keyof EventMap, Set<Listener<any>>>();
  private options: EventBusOptions;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      debug: __DEV__,
      maxListeners: 10,
      ...options,
    };
  }

  /**
   * Subscribe to an event.
   * @returns Unsubscribe function
   */
  on<K extends keyof EventMap>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const eventListeners = this.listeners.get(event)!;
    eventListeners.add(listener);

    // Warn if too many listeners (potential memory leak)
    if (eventListeners.size > this.options.maxListeners!) {
      logger.warn(
        `[EventBus] Event "${String(event)}" has ${eventListeners.size} listeners. ` +
          `Possible memory leak?`
      );
    }

    // Return unsubscribe function
    return () => {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to an event for one emission only.
   */
  once<K extends keyof EventMap>(event: K, listener: Listener<K>): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      listener(payload);
    });
    return unsubscribe;
  }

  /**
   * Emit an event to all listeners.
   * Handles both sync and async listeners with proper error catching.
   */
  emit<K extends keyof EventMap>(event: K, payload: EventPayload<K>): void {
    if (this.options.debug) {
      logger.debug(`[EventBus] ${String(event)}`, payload);
    }

    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    // Copy to avoid issues if listener modifies the set
    const listenersCopy = Array.from(eventListeners);

    for (const listener of listenersCopy) {
      try {
        const result = listener(payload);
        // Fix: Handle async listeners - catch promise rejections
        if (result instanceof Promise) {
          result.catch((error) => {
            logger.error(`[EventBus] Error in async listener for "${String(event)}":`, error);
          });
        }
      } catch (error) {
        logger.error(`[EventBus] Error in listener for "${String(event)}":`, error);
        // Don't re-throw - one bad listener shouldn't break others
      }
    }
  }

  /**
   * Remove all listeners for an event (or all events).
   */
  off<K extends keyof EventMap>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for debugging.
   */
  listenerCount(event?: keyof EventMap): number {
    if (event) {
      return this.listeners.get(event)?.size ?? 0;
    }
    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.size;
    }
    return total;
  }
}

// Singleton instance
export const eventBus = new TypedEventBus();

// Also export class for testing
export { TypedEventBus };
