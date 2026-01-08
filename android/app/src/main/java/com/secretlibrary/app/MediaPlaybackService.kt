package com.secretlibrary.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.FileObserver
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.media.MediaBrowserServiceCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * MediaBrowserService for Android Auto integration.
 * Provides a browse tree so users can browse and play audiobooks from the car UI.
 *
 * The actual playback is handled by expo-media-control and the React Native app.
 * This service provides the browsing interface and forwards playback commands.
 */
class MediaPlaybackService : MediaBrowserServiceCompat() {

    companion object {
        private const val TAG = "MediaPlaybackService"

        // Browse tree IDs
        const val ROOT_ID = "root"
        const val CONTINUE_LISTENING_ID = "continue_listening"
        const val DOWNLOADS_ID = "downloads"
        const val RECENTLY_ADDED_ID = "recently_added"
        const val LIBRARY_ID = "library"

        // Empty root for untrusted clients
        const val EMPTY_ROOT_ID = "empty_root"

        // JSON file name (written by React Native)
        private const val BROWSE_DATA_FILENAME = "android_auto_browse.json"

        // Cache duration before refreshing JSON
        private const val JSON_CACHE_DURATION_MS = 5000L
    }

    private var mediaSession: MediaSessionCompat? = null
    private lateinit var playbackStateBuilder: PlaybackStateCompat.Builder

    // Coroutine scope for async work
    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    // Cached browse data from JSON
    private var cachedBrowseData: Map<String, List<MediaBrowserCompat.MediaItem>> = emptyMap()
    private var lastJsonLoadTime: Long = 0

    // File observer for JSON changes
    private var fileObserver: FileObserver? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "MediaPlaybackService onCreate")

        // Register with AndroidAutoModule so RN can update our state
        AndroidAutoModule.mediaPlaybackService = this

        // Create a media session
        mediaSession = MediaSessionCompat(this, TAG).apply {
            // Set flags for handling media buttons and transport controls
            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            )

            // Set initial playback state
            playbackStateBuilder = PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackStateCompat.ACTION_SEEK_TO or
                    PlaybackStateCompat.ACTION_FAST_FORWARD or
                    PlaybackStateCompat.ACTION_REWIND or
                    PlaybackStateCompat.ACTION_PLAY_FROM_SEARCH or
                    PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID
                )
            setPlaybackState(playbackStateBuilder.build())

            // Set the session callback
            setCallback(MediaSessionCallback())

            // Set the session as active
            isActive = true
        }

        // Set the session token so Android Auto can connect
        sessionToken = mediaSession?.sessionToken

        // Start watching for JSON file changes
        startFileObserver()

        // Initial load of browse data
        serviceScope.launch {
            refreshBrowseData()
        }

        Log.d(TAG, "MediaPlaybackService created successfully")
    }

    override fun onDestroy() {
        Log.d(TAG, "MediaPlaybackService onDestroy")
        stopFileObserver()
        serviceScope.cancel()
        mediaSession?.release()
        mediaSession = null
        // Unregister from AndroidAutoModule
        AndroidAutoModule.mediaPlaybackService = null
        super.onDestroy()
    }

    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?
    ): BrowserRoot {
        Log.d(TAG, "onGetRoot called by: $clientPackageName")
        // Allow Android Auto and other trusted clients to browse
        return BrowserRoot(ROOT_ID, null)
    }

    override fun onLoadChildren(
        parentId: String,
        result: Result<MutableList<MediaBrowserCompat.MediaItem>>
    ) {
        Log.d(TAG, "onLoadChildren called for parentId: $parentId")

        // Detach result to load asynchronously
        result.detach()

        // Load data in background
        serviceScope.launch {
            val items = mutableListOf<MediaBrowserCompat.MediaItem>()

            // Refresh cached data if needed
            refreshBrowseDataIfNeeded()

            when (parentId) {
                ROOT_ID -> {
                    // Root level - show browsable categories (YouTube Music style)
                    items.add(createBrowsableItem(
                        CONTINUE_LISTENING_ID,
                        "Continue Listening",
                        "Pick up where you left off"
                    ))
                    items.add(createBrowsableItem(
                        DOWNLOADS_ID,
                        "Downloads",
                        "Books available offline"
                    ))
                    items.add(createBrowsableItem(
                        RECENTLY_ADDED_ID,
                        "Recently Added",
                        "New books in your library"
                    ))
                    items.add(createBrowsableItem(
                        LIBRARY_ID,
                        "Library",
                        "Browse all books"
                    ))
                }

                CONTINUE_LISTENING_ID -> {
                    // Map to "continue-listening" section from JSON
                    val sectionItems = cachedBrowseData["continue-listening"] ?: emptyList()
                    if (sectionItems.isNotEmpty()) {
                        items.addAll(sectionItems)
                        Log.d(TAG, "Added ${sectionItems.size} continue listening items")
                    } else {
                        items.add(createPlayableItem(
                            "empty_continue",
                            "No books in progress",
                            "Start a book from Downloads"
                        ))
                    }
                }

                DOWNLOADS_ID -> {
                    // Map to "downloads" section from JSON
                    val sectionItems = cachedBrowseData["downloads"] ?: emptyList()
                    if (sectionItems.isNotEmpty()) {
                        items.addAll(sectionItems)
                        Log.d(TAG, "Added ${sectionItems.size} download items")
                    } else {
                        items.add(createPlayableItem(
                            "empty_downloads",
                            "No downloads yet",
                            "Download books in the app"
                        ))
                    }
                }

                RECENTLY_ADDED_ID -> {
                    // Map to "recently-added" section from JSON
                    val sectionItems = cachedBrowseData["recently-added"] ?: emptyList()
                    if (sectionItems.isNotEmpty()) {
                        items.addAll(sectionItems)
                        Log.d(TAG, "Added ${sectionItems.size} recently added items")
                    } else {
                        items.add(createPlayableItem(
                            "empty_recent",
                            "No recent books",
                            "Add books to your library"
                        ))
                    }
                }

                LIBRARY_ID -> {
                    // Map to "library" section from JSON (if available)
                    val sectionItems = cachedBrowseData["library"] ?: emptyList()
                    if (sectionItems.isNotEmpty()) {
                        items.addAll(sectionItems)
                    } else {
                        items.add(createPlayableItem(
                            "empty_library",
                            "Library not available",
                            "Open the app to sync your library"
                        ))
                    }
                }

                else -> {
                    Log.w(TAG, "Unknown parentId: $parentId")
                }
            }

            Log.d(TAG, "Returning ${items.size} items for $parentId")
            result.sendResult(items)
        }
    }

    /**
     * Start watching the JSON file for changes
     */
    private fun startFileObserver() {
        try {
            val jsonFile = File(filesDir, BROWSE_DATA_FILENAME)
            val parentDir = jsonFile.parentFile ?: return

            // Watch the parent directory for file changes
            fileObserver = object : FileObserver(parentDir.absolutePath, CLOSE_WRITE or MODIFY or CREATE) {
                override fun onEvent(event: Int, path: String?) {
                    if (path == BROWSE_DATA_FILENAME) {
                        Log.d(TAG, "Browse data file changed (event: $event)")
                        // Invalidate cache
                        lastJsonLoadTime = 0
                        // Notify Android Auto to refresh all sections
                        notifyChildrenChanged(ROOT_ID)
                        notifyChildrenChanged(CONTINUE_LISTENING_ID)
                        notifyChildrenChanged(DOWNLOADS_ID)
                        notifyChildrenChanged(RECENTLY_ADDED_ID)
                        notifyChildrenChanged(LIBRARY_ID)
                    }
                }
            }

            fileObserver?.startWatching()
            Log.d(TAG, "Started watching browse data file: ${jsonFile.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting file observer", e)
        }
    }

    /**
     * Stop watching the JSON file
     */
    private fun stopFileObserver() {
        try {
            fileObserver?.stopWatching()
            fileObserver = null
            Log.d(TAG, "Stopped file observer")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping file observer", e)
        }
    }

    /**
     * Refresh browse data if cache is stale
     */
    private fun refreshBrowseDataIfNeeded() {
        val now = System.currentTimeMillis()
        if (now - lastJsonLoadTime > JSON_CACHE_DURATION_MS) {
            refreshBrowseData()
        }
    }

    /**
     * Force refresh of browse data from JSON file
     */
    private fun refreshBrowseData() {
        cachedBrowseData = loadBrowseDataFromJson()
        lastJsonLoadTime = System.currentTimeMillis()
        Log.d(TAG, "Refreshed browse data: ${cachedBrowseData.keys}")
    }

    /**
     * Reads browse data from JSON file written by React Native
     */
    private fun loadBrowseDataFromJson(): Map<String, List<MediaBrowserCompat.MediaItem>> {
        val result = mutableMapOf<String, MutableList<MediaBrowserCompat.MediaItem>>()

        try {
            val jsonFile = File(filesDir, BROWSE_DATA_FILENAME)
            if (!jsonFile.exists()) {
                Log.w(TAG, "Browse data file not found: ${jsonFile.absolutePath}")
                return result
            }

            val jsonContent = jsonFile.readText()
            if (jsonContent.isBlank()) {
                Log.w(TAG, "Browse data file is empty")
                return result
            }

            val sections = JSONArray(jsonContent)
            Log.d(TAG, "Parsing ${sections.length()} sections from JSON")

            for (i in 0 until sections.length()) {
                val section = sections.getJSONObject(i)
                val sectionId = section.getString("id")
                val items = section.getJSONArray("items")

                val mediaItems = mutableListOf<MediaBrowserCompat.MediaItem>()

                for (j in 0 until items.length()) {
                    val item = items.getJSONObject(j)
                    val mediaItem = createMediaItemFromJson(item)
                    if (mediaItem != null) {
                        mediaItems.add(mediaItem)
                    }
                }

                result[sectionId] = mediaItems
                Log.d(TAG, "Loaded ${mediaItems.size} items for section: $sectionId")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error loading browse data from JSON", e)
        }

        return result
    }

    /**
     * Creates a MediaItem from JSON object
     */
    private fun createMediaItemFromJson(json: JSONObject): MediaBrowserCompat.MediaItem? {
        return try {
            val id = json.getString("id")
            val title = json.getString("title")
            val subtitle = json.optString("subtitle", "")
            val imageUrl = json.optString("imageUrl", null)
            val isPlayable = json.optBoolean("isPlayable", true)
            val isBrowsable = json.optBoolean("isBrowsable", false)

            // Build media description
            val descBuilder = MediaDescriptionCompat.Builder()
                .setMediaId(id)
                .setTitle(title)
                .setSubtitle(subtitle)

            // Set cover art URI if available
            if (!imageUrl.isNullOrEmpty()) {
                descBuilder.setIconUri(Uri.parse(imageUrl))
            }

            // Add extras for additional metadata
            val extras = Bundle().apply {
                putString("imageUrl", imageUrl)
            }
            descBuilder.setExtras(extras)

            // Determine flags
            val flags = when {
                isPlayable && isBrowsable -> MediaBrowserCompat.MediaItem.FLAG_PLAYABLE or MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
                isPlayable -> MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
                isBrowsable -> MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
                else -> MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
            }

            MediaBrowserCompat.MediaItem(descBuilder.build(), flags)

        } catch (e: Exception) {
            Log.e(TAG, "Error creating MediaItem from JSON", e)
            null
        }
    }

    private fun createBrowsableItem(
        id: String,
        title: String,
        subtitle: String? = null
    ): MediaBrowserCompat.MediaItem {
        val description = MediaDescriptionCompat.Builder()
            .setMediaId(id)
            .setTitle(title)
            .setSubtitle(subtitle)
            .build()
        return MediaBrowserCompat.MediaItem(
            description,
            MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
        )
    }

    private fun createPlayableItem(
        id: String,
        title: String,
        subtitle: String? = null,
        artworkUri: Uri? = null
    ): MediaBrowserCompat.MediaItem {
        val descriptionBuilder = MediaDescriptionCompat.Builder()
            .setMediaId(id)
            .setTitle(title)
            .setSubtitle(subtitle)

        artworkUri?.let { descriptionBuilder.setIconUri(it) }

        return MediaBrowserCompat.MediaItem(
            descriptionBuilder.build(),
            MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
        )
    }

    /**
     * Callback for handling media session events from Android Auto
     */
    private inner class MediaSessionCallback : MediaSessionCompat.Callback() {
        override fun onPlay() {
            Log.d(TAG, "onPlay")
            sendCommandToApp("play")
        }

        override fun onPause() {
            Log.d(TAG, "onPause")
            sendCommandToApp("pause")
        }

        override fun onSkipToNext() {
            Log.d(TAG, "onSkipToNext")
            sendCommandToApp("skipNext")
        }

        override fun onSkipToPrevious() {
            Log.d(TAG, "onSkipToPrevious")
            sendCommandToApp("skipPrevious")
        }

        override fun onFastForward() {
            Log.d(TAG, "onFastForward")
            sendCommandToApp("fastForward")
        }

        override fun onRewind() {
            Log.d(TAG, "onRewind")
            sendCommandToApp("rewind")
        }

        override fun onSeekTo(pos: Long) {
            Log.d(TAG, "onSeekTo: $pos")
            sendCommandToApp("seekTo", pos.toString())
        }

        override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
            Log.d(TAG, "onPlayFromMediaId: $mediaId")
            // Handle playback request from browse tree
            mediaId?.let {
                // Skip empty/placeholder items
                if (!it.startsWith("empty_")) {
                    sendCommandToApp("playFromMediaId", it)
                }
            }
        }

        override fun onPlayFromSearch(query: String?, extras: Bundle?) {
            Log.d(TAG, "onPlayFromSearch: $query")
            // Handle voice search - "Play [book name]"
            query?.let {
                if (it.isNotBlank()) {
                    sendCommandToApp("search", it)
                }
            }
        }
    }

    private fun sendCommandToApp(command: String, param: String? = null) {
        Log.d(TAG, "Sending command to app: $command, param: $param")
        // Use direct method call instead of broadcast to avoid Android 8+ restrictions
        AndroidAutoModule.forwardCommand(command, param)
    }

    /**
     * Update the media session with current playback state
     * This should be called from React Native when playback state changes
     */
    fun updatePlaybackState(isPlaying: Boolean, position: Long, speed: Float = 1.0f) {
        val state = if (isPlaying) {
            PlaybackStateCompat.STATE_PLAYING
        } else {
            PlaybackStateCompat.STATE_PAUSED
        }

        playbackStateBuilder.setState(state, position, speed)
        mediaSession?.setPlaybackState(playbackStateBuilder.build())
    }

    /**
     * Update the media session with current metadata
     * This should be called from React Native when the current book changes
     */
    fun updateMetadata(title: String, author: String, duration: Long, artworkUri: String?) {
        val metadataBuilder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, author)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, title)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration)

        artworkUri?.let {
            metadataBuilder.putString(MediaMetadataCompat.METADATA_KEY_ALBUM_ART_URI, it)
        }

        mediaSession?.setMetadata(metadataBuilder.build())
    }
}
