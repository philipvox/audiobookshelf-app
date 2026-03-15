package com.secretlibrary.app.exoplayer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.Timeline
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaStyleNotificationHelper
import com.bumptech.glide.Glide
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.bumptech.glide.request.RequestOptions
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

/**
 * Foreground Service that owns all audio playback on Android via ExoPlayer.
 *
 * Single ExoPlayer + single MediaSession = single source of truth.
 * JS becomes a thin control surface via ExoPlayerModule.
 * Android Auto, lock screen, and notification all share this MediaSession.
 */
class AudioPlaybackService {

    companion object {
        private const val TAG = "AudioPlaybackService"
        private const val NOTIFICATION_CHANNEL_ID = "audio_playback_channel"
        private const val NOTIFICATION_ID = 1

        // Position update interval (ms)
        private const val POSITION_UPDATE_INTERVAL_MS = 100L

        // Cover art dimensions
        private const val COVER_ART_SIZE = 400

        // Stuck detection threshold
        private const val STUCK_THRESHOLD_MS = 3000L

        // Singleton instance — accessible by ExoPlayerModule and AndroidAutoMediaBrowserService
        @Volatile
        var instance: AudioPlaybackService? = null
            private set
    }

    data class TrackInfo(
        val url: String,
        val title: String,
        val startOffset: Double,  // Global start position of this track (seconds)
        val duration: Double      // Track duration (seconds)
    )

    // Core components
    private var exoPlayer: ExoPlayer? = null
    var mediaSession: MediaSessionCompat? = null
        private set
    private var media3Session: MediaSession? = null
    private var context: Context? = null

    // Track management
    private var tracks: List<TrackInfo> = emptyList()
    private var currentTrackIndex: Int = 0
    private var totalDuration: Double = 0.0

    // Position update handler
    private val mainHandler = Handler(Looper.getMainLooper())
    private var positionUpdateRunnable: Runnable? = null

    // Stuck detection
    private var lastReportedPosition: Double = 0.0
    private var lastPositionChangeTime: Long = 0L

    // State
    private var isInitialized = false
    private var hasReachedEnd = false

    // Cover art
    private val glideOptions = RequestOptions()
        .diskCacheStrategy(DiskCacheStrategy.ALL)
        .override(COVER_ART_SIZE, COVER_ART_SIZE)
        .centerCrop()

    // Coroutine scope for async operations (cover art loading)
    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // Metadata for notification/lock screen
    private var currentTitle: String = ""
    private var currentAuthor: String = ""
    private var currentArtworkUrl: String? = null
    private var currentArtworkBitmap: Bitmap? = null
    private var currentChapterTitle: String? = null

    // Supported playback actions for MediaSession
    private val SUPPORTED_ACTIONS =
        PlaybackStateCompat.ACTION_PLAY or
        PlaybackStateCompat.ACTION_PAUSE or
        PlaybackStateCompat.ACTION_PLAY_PAUSE or
        PlaybackStateCompat.ACTION_STOP or
        PlaybackStateCompat.ACTION_SEEK_TO or
        PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
        PlaybackStateCompat.ACTION_REWIND or
        PlaybackStateCompat.ACTION_FAST_FORWARD or
        PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID or
        PlaybackStateCompat.ACTION_PLAY_FROM_SEARCH

    /**
     * Initialize the playback service. Called once from ExoPlayerModule.
     */
    fun initialize(context: Context) {
        if (isInitialized) return
        this.context = context.applicationContext
        instance = this

        Log.d(TAG, "Initializing AudioPlaybackService")

        // Create notification channel (required for Android 8+)
        createNotificationChannel()

        // Create ExoPlayer
        val player = ExoPlayer.Builder(context.applicationContext)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
                    .setUsage(C.USAGE_MEDIA)
                    .build(),
                true  // handleAudioFocus = true (ExoPlayer manages audio focus automatically)
            )
            .setHandleAudioBecomingNoisy(true)  // Auto-pause on headphone unplug
            .setWakeMode(C.WAKE_MODE_NETWORK)   // Keep CPU + WiFi awake during playback
            .build()

        exoPlayer = player

        // Create legacy MediaSessionCompat (for Android Auto compatibility)
        mediaSession = MediaSessionCompat(context.applicationContext, TAG).apply {
            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            )
            setCallback(LegacyMediaSessionCallback())
            isActive = true
        }

        // Create Media3 MediaSession (wraps ExoPlayer, auto-syncs state)
        media3Session = MediaSession.Builder(context.applicationContext, player)
            .build()

        // Set up ExoPlayer listeners
        player.addListener(PlayerEventListener())

        // Set initial playback state
        updateMediaSessionState()

        isInitialized = true
        Log.d(TAG, "AudioPlaybackService initialized")
    }

    /**
     * Load tracks into ExoPlayer and optionally start playback.
     */
    fun loadTracks(
        trackInfos: List<TrackInfo>,
        startIndex: Int,
        startPositionMs: Long,
        autoPlay: Boolean
    ) {
        val player = exoPlayer ?: return
        Log.d(TAG, "loadTracks: ${trackInfos.size} tracks, startIndex=$startIndex, startPos=${startPositionMs}ms, autoPlay=$autoPlay")

        // Stop position updates during load
        stopPositionUpdates()

        // Reset state
        hasReachedEnd = false
        tracks = trackInfos
        currentTrackIndex = startIndex
        totalDuration = if (trackInfos.isNotEmpty()) {
            val lastTrack = trackInfos.last()
            lastTrack.startOffset + lastTrack.duration
        } else 0.0

        // Build MediaItems from tracks
        val mediaItems = trackInfos.map { track ->
            MediaItem.Builder()
                .setUri(Uri.parse(track.url))
                .setMediaId(track.title)
                .build()
        }

        // Clear and set new playlist
        player.stop()
        player.clearMediaItems()
        player.setMediaItems(mediaItems, startIndex, startPositionMs)
        player.playWhenReady = autoPlay
        player.prepare()

        // Reset stuck detection
        lastReportedPosition = 0.0
        lastPositionChangeTime = System.currentTimeMillis()

        // Start position updates
        startPositionUpdates()

        // Update notification metadata
        updateMediaSessionMetadata()

        Log.d(TAG, "Tracks loaded, totalDuration=${totalDuration}s")
    }

    fun play() {
        exoPlayer?.play()
        updateMediaSessionState()
    }

    fun pause() {
        exoPlayer?.pause()
        updateMediaSessionState()
    }

    /**
     * Seek to a global position across all tracks.
     * Converts global position (seconds) to track-local position.
     */
    fun seekTo(globalPositionSec: Double) {
        val player = exoPlayer ?: return

        if (tracks.isEmpty()) {
            // Single track mode
            player.seekTo((globalPositionSec * 1000).toLong())
            return
        }

        // Find which track contains this position
        var targetIndex = 0
        var positionInTrack = globalPositionSec

        for (i in tracks.indices) {
            val track = tracks[i]
            if (globalPositionSec >= track.startOffset &&
                globalPositionSec < track.startOffset + track.duration) {
                targetIndex = i
                positionInTrack = globalPositionSec - track.startOffset
                break
            }
            if (i == tracks.lastIndex) {
                targetIndex = i
                positionInTrack = (globalPositionSec - track.startOffset)
                    .coerceAtMost(track.duration - 0.5)
                    .coerceAtLeast(0.0)
            }
        }

        // If near end of track, jump to start of next
        if (targetIndex < tracks.lastIndex) {
            val trackDur = tracks[targetIndex].duration
            if (positionInTrack >= trackDur - 0.5) {
                targetIndex++
                positionInTrack = 0.0
            }
        }

        currentTrackIndex = targetIndex
        hasReachedEnd = false
        player.seekTo(targetIndex, (positionInTrack * 1000).toLong())
    }

    fun setRate(rate: Float) {
        exoPlayer?.playbackParameters = PlaybackParameters(rate)
    }

    fun setVolume(volume: Float) {
        exoPlayer?.volume = volume
    }

    /**
     * Get current global position in seconds.
     */
    fun getCurrentPositionSec(): Double {
        val player = exoPlayer ?: return 0.0
        val windowIndex = player.currentMediaItemIndex
        val positionMs = player.currentPosition

        if (tracks.isEmpty()) {
            return positionMs / 1000.0
        }

        if (windowIndex < tracks.size) {
            return tracks[windowIndex].startOffset + positionMs / 1000.0
        }

        return positionMs / 1000.0
    }

    /**
     * Get current playback state for synchronous reads from JS.
     */
    fun getCurrentState(): Bundle {
        val player = exoPlayer
        val bundle = Bundle()

        if (player == null) {
            bundle.putBoolean("isPlaying", false)
            bundle.putDouble("position", 0.0)
            bundle.putDouble("duration", 0.0)
            bundle.putBoolean("isBuffering", false)
            bundle.putBoolean("didJustFinish", false)
            return bundle
        }

        bundle.putBoolean("isPlaying", player.isPlaying)
        bundle.putDouble("position", getCurrentPositionSec())
        bundle.putDouble("duration", totalDuration)
        bundle.putBoolean("isBuffering", player.playbackState == Player.STATE_BUFFERING)
        bundle.putBoolean("didJustFinish", hasReachedEnd)

        return bundle
    }

    /**
     * Update metadata for notification/lock screen display.
     */
    fun setMetadata(title: String, author: String, artworkUrl: String?, chapterTitle: String?) {
        currentTitle = title
        currentAuthor = author
        currentChapterTitle = chapterTitle

        // Load artwork async if URL changed
        if (artworkUrl != currentArtworkUrl) {
            currentArtworkUrl = artworkUrl
            currentArtworkBitmap = null
            if (!artworkUrl.isNullOrEmpty()) {
                loadArtworkAsync(artworkUrl)
            }
        }

        updateMediaSessionMetadata()
    }

    fun cleanup() {
        Log.d(TAG, "Cleaning up AudioPlaybackService")
        stopPositionUpdates()
        serviceScope.cancel()

        media3Session?.release()
        media3Session = null

        mediaSession?.release()
        mediaSession = null

        exoPlayer?.release()
        exoPlayer = null

        currentArtworkBitmap?.let {
            if (!it.isRecycled) it.recycle()
        }
        currentArtworkBitmap = null

        isInitialized = false
        instance = null
    }

    // ── Private helpers ──────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Audio Playback",
                NotificationManager.IMPORTANCE_LOW  // Low = no sound for notification
            ).apply {
                description = "Controls for audio playback"
                setShowBadge(false)
            }
            val nm = context?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.createNotificationChannel(channel)
        }
    }

    private fun updateMediaSessionState() {
        val player = exoPlayer ?: return
        val session = mediaSession ?: return

        val state = when {
            player.isPlaying -> PlaybackStateCompat.STATE_PLAYING
            player.playbackState == Player.STATE_BUFFERING -> PlaybackStateCompat.STATE_BUFFERING
            player.playWhenReady -> PlaybackStateCompat.STATE_BUFFERING
            else -> PlaybackStateCompat.STATE_PAUSED
        }

        val positionMs = (getCurrentPositionSec() * 1000).toLong()
        val speed = player.playbackParameters.speed

        val stateBuilder = PlaybackStateCompat.Builder()
            .setActions(SUPPORTED_ACTIONS)
            .setState(state, positionMs, speed)

        session.setPlaybackState(stateBuilder.build())
    }

    private fun updateMediaSessionMetadata() {
        val session = mediaSession ?: return

        val builder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentAuthor)
            .putString(MediaMetadataCompat.METADATA_KEY_AUTHOR, currentAuthor)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, (totalDuration * 1000).toLong())

        if (!currentChapterTitle.isNullOrEmpty()) {
            builder.putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentChapterTitle)
            builder.putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentTitle)
        } else {
            builder.putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
        }

        currentArtworkBitmap?.let { bitmap ->
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, bitmap)
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, bitmap)
        }

        session.setMetadata(builder.build())
    }

    private fun loadArtworkAsync(url: String) {
        val ctx = context ?: return
        serviceScope.launch {
            try {
                val bitmap = withContext(Dispatchers.IO) {
                    Glide.with(ctx)
                        .asBitmap()
                        .load(url)
                        .apply(glideOptions)
                        .submit()
                        .get(5, TimeUnit.SECONDS)
                }
                currentArtworkBitmap = bitmap
                updateMediaSessionMetadata()
                Log.d(TAG, "Artwork loaded: ${bitmap.width}x${bitmap.height}")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load artwork: ${e.message}")
            }
        }
    }

    private fun startPositionUpdates() {
        stopPositionUpdates()

        val runnable = object : Runnable {
            override fun run() {
                val player = exoPlayer ?: return

                val position = getCurrentPositionSec()
                val isPlaying = player.isPlaying
                val isBuffering = player.playbackState == Player.STATE_BUFFERING

                // Stuck detection
                if (isPlaying && !isBuffering) {
                    val now = System.currentTimeMillis()
                    val posDelta = Math.abs(position - lastReportedPosition)

                    if (posDelta < 0.5) {
                        if (now - lastPositionChangeTime > STUCK_THRESHOLD_MS) {
                            Log.w(TAG, "Stuck detected at ${position}s")
                            ExoPlayerModule.emitPlaybackState(
                                isPlaying = true,
                                position = position,
                                duration = totalDuration,
                                isBuffering = false,
                                didJustFinish = false,
                                isStuck = true
                            )
                            lastPositionChangeTime = now
                            mainHandler.postDelayed(this, POSITION_UPDATE_INTERVAL_MS)
                            return
                        }
                    } else {
                        lastReportedPosition = position
                        lastPositionChangeTime = now
                    }
                }

                // Emit position to JS
                ExoPlayerModule.emitPlaybackState(
                    isPlaying = isPlaying,
                    position = position,
                    duration = totalDuration,
                    isBuffering = isBuffering,
                    didJustFinish = false,
                    isStuck = false
                )

                // Update MediaSession state periodically (every ~1s, not every 100ms)
                // to keep lock screen/Android Auto in sync without excessive updates
                if (player.currentPosition % 1000 < POSITION_UPDATE_INTERVAL_MS) {
                    updateMediaSessionState()
                }

                mainHandler.postDelayed(this, POSITION_UPDATE_INTERVAL_MS)
            }
        }

        positionUpdateRunnable = runnable
        mainHandler.post(runnable)
    }

    private fun stopPositionUpdates() {
        positionUpdateRunnable?.let { mainHandler.removeCallbacks(it) }
        positionUpdateRunnable = null
    }

    // ── ExoPlayer event listener ──────────────────────────────────────

    private inner class PlayerEventListener : Player.Listener {

        override fun onPlaybackStateChanged(playbackState: Int) {
            Log.d(TAG, "onPlaybackStateChanged: $playbackState")

            when (playbackState) {
                Player.STATE_ENDED -> {
                    val player = exoPlayer ?: return
                    // Check if this is truly the end of the playlist
                    if (player.currentMediaItemIndex >= player.mediaItemCount - 1) {
                        hasReachedEnd = true
                        Log.d(TAG, "Book complete — last track ended")
                        ExoPlayerModule.emitPlaybackState(
                            isPlaying = false,
                            position = totalDuration,
                            duration = totalDuration,
                            isBuffering = false,
                            didJustFinish = true,
                            isStuck = false
                        )
                        ExoPlayerModule.emitEvent("onBookEnd", null)
                        updateMediaSessionState()
                    }
                }
                Player.STATE_READY -> {
                    updateMediaSessionState()
                }
                Player.STATE_BUFFERING -> {
                    updateMediaSessionState()
                }
                Player.STATE_IDLE -> {
                    // Player stopped or not initialized
                }
            }
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            Log.d(TAG, "onIsPlayingChanged: $isPlaying")
            updateMediaSessionState()
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            val player = exoPlayer ?: return
            val newIndex = player.currentMediaItemIndex
            Log.d(TAG, "Track transition: $currentTrackIndex → $newIndex (reason=$reason)")

            currentTrackIndex = newIndex

            // Emit track change event to JS
            val trackData = Bundle().apply {
                putInt("trackIndex", newIndex)
                putInt("totalTracks", tracks.size)
                if (newIndex < tracks.size) {
                    putString("title", tracks[newIndex].title)
                    putDouble("startOffset", tracks[newIndex].startOffset)
                }
            }
            ExoPlayerModule.emitEvent("onTrackChange", trackData)
        }

        override fun onPlayerError(error: PlaybackException) {
            Log.e(TAG, "Player error: ${error.message}, code=${error.errorCode}")

            val errorData = Bundle().apply {
                putString("message", error.message ?: "Unknown error")
                putInt("errorCode", error.errorCode)
                putDouble("position", getCurrentPositionSec())
            }

            // Detect URL expiration (HTTP 403/401)
            val cause = error.cause
            val isAuthError = error.errorCode == PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS
            if (isAuthError) {
                errorData.putString("type", "URL_EXPIRED")
            } else {
                errorData.putString("type", "PLAYBACK_ERROR")
            }

            ExoPlayerModule.emitEvent("onError", errorData)
        }
    }

    // ── Legacy MediaSession callback (for Android Auto compatibility) ──

    /**
     * Handles commands from Android Auto, lock screen, and notification.
     * These commands are forwarded to JS via ExoPlayerModule events,
     * EXCEPT play/pause/seek which are handled natively by ExoPlayer.
     */
    private inner class LegacyMediaSessionCallback : MediaSessionCompat.Callback() {

        override fun onPlay() {
            Log.d(TAG, "MediaSession: onPlay")
            play()
        }

        override fun onPause() {
            Log.d(TAG, "MediaSession: onPause")
            pause()
        }

        override fun onStop() {
            Log.d(TAG, "MediaSession: onStop")
            pause()
        }

        override fun onSeekTo(pos: Long) {
            Log.d(TAG, "MediaSession: onSeekTo $pos ms")
            seekTo(pos / 1000.0)
        }

        override fun onSkipToNext() {
            Log.d(TAG, "MediaSession: onSkipToNext")
            // Forward to JS for chapter navigation
            ExoPlayerModule.emitEvent("onRemoteCommand", Bundle().apply {
                putString("command", "nextChapter")
            })
        }

        override fun onSkipToPrevious() {
            Log.d(TAG, "MediaSession: onSkipToPrevious")
            ExoPlayerModule.emitEvent("onRemoteCommand", Bundle().apply {
                putString("command", "prevChapter")
            })
        }

        override fun onFastForward() {
            Log.d(TAG, "MediaSession: onFastForward")
            ExoPlayerModule.emitEvent("onRemoteCommand", Bundle().apply {
                putString("command", "skipForward")
            })
        }

        override fun onRewind() {
            Log.d(TAG, "MediaSession: onRewind")
            ExoPlayerModule.emitEvent("onRemoteCommand", Bundle().apply {
                putString("command", "skipBackward")
            })
        }

        override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
            Log.d(TAG, "MediaSession: onPlayFromMediaId: $mediaId")
            mediaId?.let { id ->
                val itemId = if (id.startsWith("item:")) id.removePrefix("item:") else id
                ExoPlayerModule.emitEvent("onRemoteCommand", Bundle().apply {
                    putString("command", "playFromMediaId")
                    putString("param", itemId)
                })
            }
        }

        override fun onPlayFromSearch(query: String?, extras: Bundle?) {
            Log.d(TAG, "MediaSession: onPlayFromSearch: $query")
            ExoPlayerModule.emitEvent("onRemoteCommand", Bundle().apply {
                putString("command", "playFromSearch")
                putString("param", query ?: "")
            })
        }
    }
}
