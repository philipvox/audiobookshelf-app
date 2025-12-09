/**
 * src/features/player/services/shakeDetector.ts
 *
 * Shake detection service using expo-sensors Accelerometer.
 * Detects shake gestures for extending sleep timer.
 */

import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

// Shake detection thresholds
const SHAKE_THRESHOLD = 2.5;      // Acceleration magnitude threshold
const SHAKE_COOLDOWN_MS = 1500;   // Minimum time between shake detections

type ShakeCallback = () => void;

class ShakeDetector {
  private subscription: ReturnType<typeof Accelerometer.addListener> | null = null;
  private lastShakeTime: number = 0;
  private callback: ShakeCallback | null = null;
  private isActive: boolean = false;

  /**
   * Start listening for shake gestures.
   * @param onShake Callback to invoke when shake is detected
   */
  async start(onShake: ShakeCallback): Promise<void> {
    if (this.isActive) {
      console.log('[ShakeDetector] Already active, updating callback');
      this.callback = onShake;
      return;
    }

    this.callback = onShake;
    this.isActive = true;
    this.lastShakeTime = 0;

    try {
      // Check if accelerometer is available
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (!isAvailable) {
        console.warn('[ShakeDetector] Accelerometer not available');
        this.isActive = false;
        return;
      }

      // Set update interval (~60Hz for responsive detection)
      Accelerometer.setUpdateInterval(16);

      // Subscribe to accelerometer updates
      this.subscription = Accelerometer.addListener(this.handleAccelerometerData);
      console.log('[ShakeDetector] Started listening for shakes');
    } catch (error) {
      console.error('[ShakeDetector] Failed to start:', error);
      this.isActive = false;
    }
  }

  /**
   * Stop listening for shake gestures.
   */
  stop(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.callback = null;
    this.isActive = false;
    console.log('[ShakeDetector] Stopped');
  }

  /**
   * Check if shake detection is currently active.
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Process accelerometer data and detect shakes.
   */
  private handleAccelerometerData = (data: AccelerometerMeasurement): void => {
    const { x, y, z } = data;

    // Calculate acceleration magnitude (minus gravity ~1g)
    // Using Euclidean distance from origin
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // Subtract gravity (approximately 1g when at rest)
    // A shake will cause magnitude to spike above threshold
    const acceleration = Math.abs(magnitude - 1);

    if (acceleration >= SHAKE_THRESHOLD) {
      const now = Date.now();
      const timeSinceLastShake = now - this.lastShakeTime;

      if (timeSinceLastShake >= SHAKE_COOLDOWN_MS) {
        this.lastShakeTime = now;
        console.log('[ShakeDetector] Shake detected! Magnitude:', magnitude.toFixed(2));

        // Trigger haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Invoke callback
        if (this.callback) {
          this.callback();
        }
      }
    }
  };
}

// Singleton instance
export const shakeDetector = new ShakeDetector();
