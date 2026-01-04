package com.secretlibrary.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
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
 * Receives broadcast commands from MediaPlaybackService and forwards them to React Native.
 */
class AndroidAutoModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "AndroidAutoModule"
        private const val MEDIA_COMMAND_ACTION = "com.secretlibrary.app.MEDIA_COMMAND"
        private const val REFRESH_BROWSE_DATA_ACTION = "com.secretlibrary.app.REFRESH_BROWSE_DATA"
    }

    private var receiver: BroadcastReceiver? = null
    private var listenerCount = 0

    override fun getName(): String = "AndroidAutoModule"

    /**
     * Start listening for media commands from MediaPlaybackService
     */
    @ReactMethod
    fun startListening(promise: Promise) {
        try {
            if (receiver != null) {
                Log.d(TAG, "Already listening for commands")
                promise.resolve(true)
                return
            }

            receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    intent?.let {
                        val command = it.getStringExtra("command") ?: return
                        val param = it.getStringExtra("param")

                        Log.d(TAG, "Received command: $command, param: $param")

                        // Send event to React Native
                        val params = Arguments.createMap().apply {
                            putString("command", command)
                            if (param != null) {
                                putString("param", param)
                            }
                        }
                        sendEvent("onAndroidAutoCommand", params)
                    }
                }
            }

            val filter = IntentFilter(MEDIA_COMMAND_ACTION)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                reactContext.registerReceiver(receiver, filter)
            }

            Log.d(TAG, "Started listening for Android Auto commands")
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
            receiver?.let {
                reactContext.unregisterReceiver(it)
                receiver = null
                Log.d(TAG, "Stopped listening for Android Auto commands")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping listener", e)
            promise.reject("ERROR", e.message)
        }
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
        receiver?.let {
            try {
                reactContext.unregisterReceiver(it)
                Log.d(TAG, "Unregistered receiver on destroy")
            } catch (e: Exception) {
                // Ignore - receiver may not be registered
            }
            receiver = null
        }
    }
}
