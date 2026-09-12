package co.anivault.presence

import com.discord.socialsdk.DiscordSocialSdkInit
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

class DiscordPresenceModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var presence: DiscordPresence? = null

    override fun getName(): String = "AniVaultDiscordPresence"

    @ReactMethod
    fun start(applicationId: String) {
        val activity = reactContext.currentActivity ?: return
        try {
            DiscordSocialSdkInit.setEngineActivity(activity)
            if (presence == null) presence = DiscordPresence(activity.applicationContext)
            presence?.start(applicationId)
        } catch (_: Throwable) {
            // Discord is optional. Never crash the app when the desktop/mobile client is unavailable.
        }
    }

    @ReactMethod
    fun update(json: String) {
        try {
            presence?.update(JSONObject(json))
        } catch (_: Throwable) {
            // Presence must never interrupt playback.
        }
    }

    @ReactMethod
    fun clear() {
        try { presence?.clear() } catch (_: Throwable) {}
    }

    @ReactMethod
    fun close() {
        try { presence?.close() } catch (_: Throwable) {}
        presence = null
    }
}
