package co.anivault.presence

import android.content.Context
import org.json.JSONObject

class DiscordPresence(context: Context) {
    companion object {
        init {
            System.loadLibrary("anivault_presence")
        }
    }

    private var ready = false

    fun start(applicationId: String) {
        nativeInit(applicationId)
        ready = true
    }

    fun update(data: JSONObject) {
        if (!ready) return

        val event = data.optString("event", "")
        if (event == "ended" || event == "pagehide") {
            nativeClear()
            return
        }

        nativeUpdate(
            data.optString("title", "Anime"),
            data.optInt("episode", 0),
            data.optString("episodeTitle", ""),
            data.optString("url", "https://www.anivault.co/"),
            data.optString("image", ""),
            data.optString("banner", ""),
            data.optDouble("currentTime", 0.0).coerceAtLeast(0.0),
            data.optDouble("duration", 0.0).coerceAtLeast(0.0),
            data.optBoolean("playing", false),
            data.optLong("at", System.currentTimeMillis())
        )
    }

    fun clear() {
        if (ready) nativeClear()
    }

    fun close() {
        if (ready) nativeShutdown()
        ready = false
    }

    private external fun nativeInit(applicationId: String)
    private external fun nativeUpdate(
        title: String,
        episode: Int,
        episodeTitle: String,
        url: String,
        image: String,
        banner: String,
        currentTime: Double,
        duration: Double,
        playing: Boolean,
        sourceTimeMs: Long
    )
    private external fun nativeClear()
    private external fun nativeShutdown()
}
