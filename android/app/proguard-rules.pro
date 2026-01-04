# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Android Auto / MediaBrowserService
-keep class com.secretlibrary.app.MediaPlaybackService { *; }
-keep class com.secretlibrary.app.AndroidAutoModule { *; }
-keep class com.secretlibrary.app.AndroidAutoPackage { *; }

# AndroidX Media classes for Android Auto
-keep class androidx.media.** { *; }
-keep class android.support.v4.media.** { *; }
-keep class android.support.v4.media.session.** { *; }
