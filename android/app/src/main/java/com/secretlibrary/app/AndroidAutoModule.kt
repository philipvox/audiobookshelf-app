package com.secretlibrary.app

import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Native module for Android Auto integration.
 * Receives commands from MediaPlaybackService and forwards them to React Native.
 * Also provides methods to update MediaSession state for Android Auto display.
 */
class AndroidAutoModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "AndroidAutoModule"
        private const val REFRESH_BROWSE_DATA_ACTION = "com.secretlibrary.app.REFRESH_BROWSE_DATA"

        // Static reference to MediaPlaybackService for state updates
        var mediaPlaybackService: MediaPlaybackService? = null

        // Static reference to the module instance for direct command forwarding
        private var instance: AndroidAutoModule? = null

        /**
         * Forward command from MediaPlaybackService to React Native
         * Called by MediaPlaybackService when it receives playback commands
         */
        fun forwardCommand(command: String, param: String? = null) {
            instance?.handleCommand(command, param)
                ?: Log.w(TAG, "No module instance to forward command: $command")
        }
    }

    private var listenerCount = 0

    init {
        // Store reference for direct command forwarding from MediaPlaybackService
        instance = this
    }

    override fun getName(): String = "AndroidAutoModule"

    /**
     * Start listening for media commands from MediaPlaybackService
     * Commands are now received directly via handleCommand() method
     */
    @ReactMethod
    fun startListening(promise: Promise) {
        try {
            Log.d(TAG, "Started listening for Android Auto commands (direct method)")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting listener", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Stop listening for media commands
     */
    @ReactMethod
    fun stopListening(promise: Promise) {
        try {
            Log.d(TAG, "Stopped listening for Android Auto commands")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping listener", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Handle command directly from MediaPlaybackService (called via static reference)
     * This avoids broadcast restrictions on Android 8+
     */
    fun handleCommand(command: String, param: String?) {
        Log.d(TAG, "Received direct command: $command, param: $param")

        // Send event to React Native
        val params = Arguments.createMap().apply {
            putString("command", command)
            if (param != null) {
                putString("param", param)
            }
        }
        sendEvent("onAndroidAutoCommand", params)
    }

    /**
     * Trigger a refresh of the browse tree in MediaPlaybackService
     */
    @ReactMethod
    fun refreshBrowseData(promise: Promise) {
        try {
            val intent = Intent(REFRESH_BROWSE_DATA_ACTION)
            reactContext.sendBroadcast(intent)
            Log.d(TAG, "Sent refresh browse data broadcast")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing browse data", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Check if Android Auto is available
     */
    @ReactMethod
    fun isAvailable(promise: Promise) {
        // Android Auto is available on Android
        promise.resolve(true)
    }

    /**
     * Update playback state for Android Auto display
     * @param isPlaying Whether audio is currently playing
     * @param position Current position in milliseconds
     * @param speed Playback speed (1.0 = normal)
     */
    @ReactMethod
    fun updatePlaybackState(isPlaying: Boolean, position: Double, speed: Double, promise: Promise) {
        try {
            mediaPlaybackService?.updatePlaybackState(isPlaying, position.toLong(), speed.toFloat())
            Log.d(TAG, "Updated playback state: isPlaying=$isPlaying, position=$position, speed=$speed")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error updating playback state", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Update metadata for Android Auto display (Now Playing screen)
     * @param title Book title
     * @param author Author name
     * @param duration Total duration in milliseconds
     * @param artworkUrl URL or local path to cover art
     */
    @ReactMethod
    fun updateMetadata(title: String, author: String, duration: Double, artworkUrl: String?, promise: Promise) {
        try {
            mediaPlaybackService?.updateMetadata(title, author, duration.toLong(), artworkUrl)
            Log.d(TAG, "Updated metadata: title=$title, author=$author, duration=$duration")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error updating metadata", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Required for RN event emitter - called when JS adds a listener
     */
    @ReactMethod
    fun addListener(eventName: String) {
        listenerCount++
        Log.d(TAG, "Added listener for: $eventName (total: $listenerCount)")
    }

    /**
     * Required for RN event emitter - called when JS removes listeners
     */
    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount -= count
        if (listenerCount < 0) listenerCount = 0
        Log.d(TAG, "Removed $count listeners (total: $listenerCount)")
    }

    /**
     * Send an event to React Native
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } else {
            Log.w(TAG, "No active React instance, cannot send event: $eventName")
        }
    }

    /**
     * Cleanup when the module is destroyed
     */
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        // Clear static reference
        if (instance == this) {
            instance = null
        }
        Log.d(TAG, "Module destroyed")
    }
}
