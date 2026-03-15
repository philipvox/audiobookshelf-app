package com.secretlibrary.app.exoplayer

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native bridge module for ExoPlayer playback service.
 *
 * JS calls methods here → forwarded to AudioPlaybackService.
 * AudioPlaybackService emits events → forwarded to JS via RCTDeviceEventEmitter.
 */
class ExoPlayerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "ExoPlayerModule"

        // Event names
        const val EVENT_PLAYBACK_STATE = "ExoPlayerPlaybackState"
        const val EVENT_TRACK_CHANGE = "ExoPlayerTrackChange"
        const val EVENT_ERROR = "ExoPlayerError"
        const val EVENT_BOOK_END = "ExoPlayerBookEnd"
        const val EVENT_REMOTE_COMMAND = "ExoPlayerRemoteCommand"

        // Static reference for AudioPlaybackService to emit events
        @Volatile
        private var moduleInstance: ExoPlayerModule? = null

        /**
         * Emit playback state update to JS.
         * Called from AudioPlaybackService's position update loop.
         */
        fun emitPlaybackState(
            isPlaying: Boolean,
            position: Double,
            duration: Double,
            isBuffering: Boolean,
            didJustFinish: Boolean,
            isStuck: Boolean
        ) {
            val instance = moduleInstance ?: return
            if (!instance.reactContext.hasActiveReactInstance()) return

            try {
                val params = Arguments.createMap().apply {
                    putBoolean("isPlaying", isPlaying)
                    putDouble("position", position)
                    putDouble("duration", duration)
                    putBoolean("isBuffering", isBuffering)
                    putBoolean("didJustFinish", didJustFinish)
                    putBoolean("isStuck", isStuck)
                }
                instance.reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_PLAYBACK_STATE, params)
            } catch (e: Exception) {
                Log.e(TAG, "Error emitting playback state", e)
            }
        }

        /**
         * Emit a named event with optional data to JS.
         */
        fun emitEvent(eventName: String, data: Bundle?) {
            val instance = moduleInstance ?: return
            if (!instance.reactContext.hasActiveReactInstance()) return

            try {
                val params = Arguments.createMap()
                data?.let { bundle ->
                    for (key in bundle.keySet()) {
                        when (val value = bundle.get(key)) {
                            is String -> params.putString(key, value)
                            is Int -> params.putInt(key, value)
                            is Double -> params.putDouble(key, value)
                            is Boolean -> params.putBoolean(key, value)
                            is Long -> params.putDouble(key, value.toDouble())
                        }
                    }
                }

                val targetEvent = when (eventName) {
                    "onTrackChange" -> EVENT_TRACK_CHANGE
                    "onError" -> EVENT_ERROR
                    "onBookEnd" -> EVENT_BOOK_END
                    "onRemoteCommand" -> EVENT_REMOTE_COMMAND
                    else -> eventName
                }

                instance.reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(targetEvent, params)

                Log.d(TAG, "Emitted event: $targetEvent")
            } catch (e: Exception) {
                Log.e(TAG, "Error emitting event: $eventName", e)
            }
        }
    }

    init {
        moduleInstance = this
        Log.d(TAG, "ExoPlayerModule initialized")
    }

    override fun getName(): String = "ExoPlayerModule"

    override fun invalidate() {
        Log.d(TAG, "ExoPlayerModule invalidated")
        if (moduleInstance === this) {
            moduleInstance = null
        }
        super.invalidate()
    }

    /**
     * Initialize the native playback service.
     * Starts AudioPlaybackService as a foreground service.
     * Must be called before any other methods.
     */
    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            AudioPlaybackService.start(reactContext.applicationContext)
            // Wait briefly for service to initialize
            Handler(Looper.getMainLooper()).postDelayed({
                if (AudioPlaybackService.instance != null) {
                    promise.resolve(true)
                } else {
                    promise.reject("INIT_ERROR", "Service did not start in time")
                }
            }, 500)
        } catch (e: Exception) {
            Log.e(TAG, "Initialize failed", e)
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    /**
     * Load tracks into ExoPlayer.
     *
     * @param tracksArray Array of track objects with url, title, startOffset, duration
     * @param startIndex Which track to start with
     * @param startPositionMs Position within that track (milliseconds)
     * @param autoPlay Whether to start playing immediately
     */
    @ReactMethod
    fun loadTracks(tracksArray: ReadableArray, startIndex: Int, startPositionMs: Double, autoPlay: Boolean, promise: Promise) {
        try {
            val service = AudioPlaybackService.instance
            if (service == null) {
                promise.reject("NOT_INITIALIZED", "AudioPlaybackService not initialized")
                return
            }

            val trackInfos = mutableListOf<AudioPlaybackService.TrackInfo>()
            for (i in 0 until tracksArray.size()) {
                val trackMap = tracksArray.getMap(i) ?: continue
                trackInfos.add(AudioPlaybackService.TrackInfo(
                    url = trackMap.getString("url") ?: "",
                    title = trackMap.getString("title") ?: "Track ${i + 1}",
                    startOffset = trackMap.getDouble("startOffset"),
                    duration = trackMap.getDouble("duration")
                ))
            }

            service.loadTracks(trackInfos, startIndex, startPositionMs.toLong(), autoPlay)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "loadTracks failed", e)
            promise.reject("LOAD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun play() {
        AudioPlaybackService.instance?.play()
    }

    @ReactMethod
    fun pause() {
        AudioPlaybackService.instance?.pause()
    }

    /**
     * Seek to global position in seconds.
     */
    @ReactMethod
    fun seekTo(positionSec: Double) {
        AudioPlaybackService.instance?.seekTo(positionSec)
    }

    @ReactMethod
    fun setRate(rate: Double) {
        AudioPlaybackService.instance?.setRate(rate.toFloat())
    }

    @ReactMethod
    fun setVolume(volume: Double) {
        AudioPlaybackService.instance?.setVolume(volume.toFloat())
    }

    /**
     * Update metadata for notification/lock screen display.
     */
    @ReactMethod
    fun setMetadata(title: String, author: String, artworkUrl: String?, chapterTitle: String?) {
        AudioPlaybackService.instance?.setMetadata(title, author, artworkUrl, chapterTitle)
    }

    /**
     * Get current playback state synchronously.
     */
    @ReactMethod
    fun getCurrentState(promise: Promise) {
        try {
            val service = AudioPlaybackService.instance
            if (service == null) {
                val map = Arguments.createMap().apply {
                    putBoolean("isPlaying", false)
                    putDouble("position", 0.0)
                    putDouble("duration", 0.0)
                    putBoolean("isBuffering", false)
                    putBoolean("didJustFinish", false)
                }
                promise.resolve(map)
                return
            }

            val state = service.getCurrentState()
            val map = Arguments.createMap().apply {
                putBoolean("isPlaying", state.getBoolean("isPlaying"))
                putDouble("position", state.getDouble("position"))
                putDouble("duration", state.getDouble("duration"))
                putBoolean("isBuffering", state.getBoolean("isBuffering"))
                putBoolean("didJustFinish", state.getBoolean("didJustFinish"))
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("STATE_ERROR", e.message, e)
        }
    }

    /**
     * Clean up ExoPlayer and release resources.
     */
    @ReactMethod
    fun cleanup(promise: Promise) {
        try {
            AudioPlaybackService.instance?.cleanup()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEANUP_ERROR", e.message, e)
        }
    }

    override fun getConstants(): MutableMap<String, Any> {
        return mutableMapOf(
            "EVENT_PLAYBACK_STATE" to EVENT_PLAYBACK_STATE,
            "EVENT_TRACK_CHANGE" to EVENT_TRACK_CHANGE,
            "EVENT_ERROR" to EVENT_ERROR,
            "EVENT_BOOK_END" to EVENT_BOOK_END,
            "EVENT_REMOTE_COMMAND" to EVENT_REMOTE_COMMAND
        )
    }

    @ReactMethod
    fun addListener(eventName: String) {
        Log.d(TAG, "addListener: $eventName")
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        Log.d(TAG, "removeListeners: $count")
    }
}
