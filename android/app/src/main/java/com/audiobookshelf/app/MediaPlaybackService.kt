package com.audiobookshelf.app

import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import androidx.media.MediaBrowserServiceCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat

/**
 * MediaBrowserService for Android Auto integration.
 *
 * This service exposes the app's media library to Android Auto,
 * allowing users to browse and play audiobooks from the car's display.
 *
 * The actual playback is handled by the React Native layer via expo-media-control,
 * which already manages the MediaSession. This service provides the browse tree
 * for the library navigation in Android Auto.
 */
class MediaPlaybackService : MediaBrowserServiceCompat() {

    companion object {
        private const val ROOT_ID = "root"
        private const val CONTINUE_LISTENING_ID = "continue_listening"
        private const val DOWNLOADS_ID = "downloads"
        private const val LIBRARY_ID = "library"
    }

    private lateinit var mediaSession: MediaSessionCompat

    override fun onCreate() {
        super.onCreate()

        // Create media session for Android Auto
        mediaSession = MediaSessionCompat(this, "AudiobookshelfService").apply {
            // Set initial playback state
            setPlaybackState(
                PlaybackStateCompat.Builder()
                    .setActions(
                        PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                        PlaybackStateCompat.ACTION_SEEK_TO or
                        PlaybackStateCompat.ACTION_FAST_FORWARD or
                        PlaybackStateCompat.ACTION_REWIND
                    )
                    .setState(PlaybackStateCompat.STATE_NONE, 0, 1.0f)
                    .build()
            )

            // Set flags for media buttons and transport controls
            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            )

            isActive = true
        }

        sessionToken = mediaSession.sessionToken
    }

    override fun onDestroy() {
        mediaSession.release()
        super.onDestroy()
    }

    /**
     * Called when Android Auto connects to browse the media library.
     * Returns the root of the browse tree.
     */
    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?
    ): BrowserRoot {
        // Allow all clients to browse
        // In production, you might want to verify the client package
        return BrowserRoot(ROOT_ID, null)
    }

    /**
     * Called when the client requests children of a browsable item.
     * This populates the browse tree for Android Auto.
     */
    override fun onLoadChildren(
        parentId: String,
        result: Result<MutableList<MediaBrowserCompat.MediaItem>>
    ) {
        val items = mutableListOf<MediaBrowserCompat.MediaItem>()

        when (parentId) {
            ROOT_ID -> {
                // Root level - show main categories
                items.add(createBrowsableItem(
                    CONTINUE_LISTENING_ID,
                    "Continue Listening",
                    "Resume your audiobooks"
                ))
                items.add(createBrowsableItem(
                    DOWNLOADS_ID,
                    "Downloads",
                    "Offline audiobooks"
                ))
                items.add(createBrowsableItem(
                    LIBRARY_ID,
                    "Library",
                    "All audiobooks"
                ))
            }
            CONTINUE_LISTENING_ID -> {
                // Continue listening items would be populated from React Native
                // The React Native side will update these via a native module bridge
                // For now, show empty state - items are populated dynamically
            }
            DOWNLOADS_ID -> {
                // Downloaded items would be populated from React Native
                // For now, show empty state - items are populated dynamically
            }
            LIBRARY_ID -> {
                // Full library items would be populated from React Native
                // For now, show empty state - items are populated dynamically
            }
        }

        result.sendResult(items)
    }

    /**
     * Create a browsable media item (folder/category)
     */
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

    /**
     * Create a playable media item (audiobook)
     */
    private fun createPlayableItem(
        id: String,
        title: String,
        subtitle: String? = null,
        artworkUri: android.net.Uri? = null
    ): MediaBrowserCompat.MediaItem {
        val description = MediaDescriptionCompat.Builder()
            .setMediaId(id)
            .setTitle(title)
            .setSubtitle(subtitle)
            .setIconUri(artworkUri)
            .build()

        return MediaBrowserCompat.MediaItem(
            description,
            MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
        )
    }
}
