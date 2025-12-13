/**
 * src/features/player/services/shakeDetector.ts
 *
 * Shake detection service using expo-sensors Accelerometer.
 * Detects shake gestures for extending sleep timer.
 */

import * as Haptics from 'expo-haptics';

// Lazy import to avoid crashes in simulator
let Accelerometer: typeof import('expo-sensors').Accelerometer | null = null;
let AccelerometerLoaded = false;

async function loadAccelerometer() {
  if (AccelerometerLoaded) return Accelerometer;

  try {
    // Only import Accelerometer to avoid loading other sensors (like Pedometer)
    // that may not be available in the simulator
    const { Accelerometer: AccelModule } = await import('expo-sensors/build/Accelerometer');
    Accelerometer = AccelModule;
    AccelerometerLoaded = true;
    return Accelerometer;
  } catch (error) {
    console.warn('[ShakeDetector] expo-sensors Accelerometer not available:', error);
    AccelerometerLoaded = true; // Mark as loaded to prevent retries
    return null;
  }
}

// Shake detection thresholds
const SHAKE_THRESHOLD = 2.5;      // Acceleration magnitude threshold
const SHAKE_COOLDOWN_MS = 1500;   // Minimum time between shake detections

type ShakeCallback = () => void;
type AccelerometerMeasurement = { x: number; y: number; z: number };

class ShakeDetector {
  private subscription: { remove: () => void } | null = null;
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
      // Load accelerometer module
      const accel = await loadAccelerometer();
      if (!accel) {
        console.warn('[ShakeDetector] Accelerometer module not available (simulator?)');
        this.isActive = false;
        return;
      }

      // Check if accelerometer hardware is available
      const isAvailable = await accel.isAvailableAsync();
      if (!isAvailable) {
        console.warn('[ShakeDetector] Accelerometer hardware not available');
        this.isActive = false;
        return;
      }

      // Set update interval (~60Hz for responsive detection)
      accel.setUpdateInterval(16);

      // Subscribe to accelerometer updates
      this.subscription = accel.addListener(this.handleAccelerometerData);
      console.log('[ShakeDetector] Started listening for shakes');
    } catch (error) {
      console.warn('[ShakeDetector] Failed to start (likely simulator):', error);
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
