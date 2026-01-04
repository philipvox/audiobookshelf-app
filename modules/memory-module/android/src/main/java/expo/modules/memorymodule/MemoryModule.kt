package expo.modules.memorymodule

import android.app.ActivityManager
import android.content.Context
import android.os.Debug
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MemoryModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MemoryModule")

    AsyncFunction("getMemoryInfo") {
      val context = appContext.reactContext ?: throw Exception("React context is null")

      val memInfo = Debug.MemoryInfo()
      Debug.getMemoryInfo(memInfo)

      val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      val memoryInfo = ActivityManager.MemoryInfo()
      activityManager.getMemoryInfo(memoryInfo)

      // totalPss is the proportional set size (accounts for shared memory)
      val usedMb = memInfo.totalPss / 1024.0
      val totalMb = memoryInfo.totalMem / 1024.0 / 1024.0
      val availableMb = memoryInfo.availMem / 1024.0 / 1024.0

      mapOf(
        "usedMb" to usedMb,
        "totalMb" to totalMb,
        "availableMb" to availableMb,
        "usedPercent" to (usedMb / totalMb) * 100,
        "lowMemory" to memoryInfo.lowMemory,
        "threshold" to memoryInfo.threshold / 1024.0 / 1024.0,
        "platform" to "android"
      )
    }

    // Synchronous version for quick checks
    Function("getMemoryUsageMb") {
      val context = appContext.reactContext ?: return@Function -1.0

      val memInfo = Debug.MemoryInfo()
      Debug.getMemoryInfo(memInfo)

      memInfo.totalPss / 1024.0
    }
  }
}
