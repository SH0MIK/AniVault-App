package co.anivault.app

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.app.Activity
import android.content.pm.ActivityInfo
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.discord.socialsdk.DiscordSocialSdkInit
import co.anivault.presence.DiscordPresence
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progress: ProgressBar
    private var presence: DiscordPresence? = null
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(8, 9, 12)
        window.navigationBarColor = Color.rgb(8, 9, 12)

        try {
            DiscordSocialSdkInit.setEngineActivity(this)
            presence = DiscordPresence(applicationContext).also { it.start(DISCORD_APPLICATION_ID) }
        } catch (_: Throwable) {
            presence = null
        }

        swipeRefresh = SwipeRefreshLayout(this).apply {
            setColorSchemeColors(Color.rgb(232, 69, 60))
            setProgressBackgroundColorSchemeColor(Color.rgb(18, 19, 23))
        }
        val frame = FrameLayout(this).apply { setBackgroundColor(Color.rgb(8, 9, 12)) }
        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(8, 9, 12))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            settings.loadsImagesAutomatically = true
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            CookieManagerCompat.enable(this)
            addJavascriptInterface(PresenceBridge(), "AniVaultNative")
            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    this@MainActivity.progress.setVisibility(View.VISIBLE)
                }
                override fun onPageFinished(view: WebView?, url: String?) {
                    this@MainActivity.progress.setVisibility(View.GONE)
                    swipeRefresh.isRefreshing = false
                    view?.evaluateJavascript(PRESENCE_SCRIPT, null)
                }
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean = false
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowCustomView(view: View, callback: CustomViewCallback?) {
                    if (customView != null) { callback?.onCustomViewHidden(); return }
                    customView = view
                    customViewCallback = callback
                    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                    (view?.parent as? ViewGroup)?.removeView(view)
                    addContentView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                    swipeRefresh.visibility = View.GONE
                    window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
                }
                override fun onHideCustomView() { hideCustomView() }
            }
        }
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = true
            progressTintList = android.content.res.ColorStateList.valueOf(Color.rgb(232, 69, 60))
            visibility = View.VISIBLE
        }
        frame.addView(webView, FrameLayout.LayoutParams(-1, -1))
        frame.addView(progress, FrameLayout.LayoutParams(-1, dp(3)))
        swipeRefresh.addView(frame, ViewGroup.LayoutParams(-1, -1))
        swipeRefresh.setOnChildScrollUpCallback { _, _ -> webView.scrollY > 0 }
        swipeRefresh.setOnRefreshListener { webView.reload() }
        setContentView(swipeRefresh)

        if (savedInstanceState == null) webView.loadUrl(SITE_URL) else webView.restoreState(savedInstanceState)

    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (customView != null) hideCustomView()
        else if (webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun hideCustomView() {
        customView?.let { (it.parent as? ViewGroup)?.removeView(it) }
        customView = null
        customViewCallback?.onCustomViewHidden()
        customViewCallback = null
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        swipeRefresh.visibility = View.VISIBLE
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
    }

    inner class PresenceBridge {
        @JavascriptInterface
        fun postMessage(raw: String) {
            runOnUiThread {
                try {
                    val data = JSONObject(raw)
                    when (data.optString("event")) {
                        "clear", "pagehide", "ended" -> presence?.clear()
                        else -> if (data.optInt("episode") > 0) presence?.update(data)
                    }
                } catch (_: Throwable) { }
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        try { presence?.clear(); presence?.close() } catch (_: Throwable) { }
        presence = null
        webView.removeJavascriptInterface("AniVaultNative")
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val SITE_URL = "https://www.anivault.co"
        private const val DISCORD_APPLICATION_ID = "1505538731791093820"
        val PRESENCE_SCRIPT = """
        (() => {
          if (window.__anivaultPresenceBridge) return;
          window.__anivaultPresenceBridge = true;
          const state = { video: null, image: '', episodeImage: '', banner: '', artLoading: false, artLoadedFor: '', active: false, lastUrl: '' };
          const isWatchPage = () => location.pathname.replace(/\/$/, '') === '/watch';
          const post = (payload) => { try { window.AniVaultNative?.postMessage(JSON.stringify(payload)); } catch (_) {} };
          const clear = () => { if (!state.active) return; state.active = false; post({ event: 'clear' }); };
          const cssUrl = (value) => { const match = String(value || '').match(/url\((['"]?)(.*?)\1\)/i); return match ? match[2] : ''; };
          const send = (event) => {
            if (!isWatchPage()) { clear(); return; }
            const video = state.video;
            if (!video && event !== 'pagehide') return;
            state.active = true;
            state.lastUrl = location.href;
            try {
              const url = new URL(location.href);
              const episode = Number(url.searchParams.get('ep')) || 0;
              if (!episode) { clear(); return; }
              const meta = (name) => document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]')?.getAttribute('content') || '';
              const ambient = document.querySelector('.av-ambient-img');
              const poster = cssUrl(ambient?.style?.backgroundImage || '') || meta('og:image');
              const episodeImage = meta('og:image');
              if (episodeImage) state.episodeImage = new URL(episodeImage, location.href).href;
              const title = (meta('og:title') || document.title).replace(/^Ep\s+\d+\s+[—-]\s*/i, '').replace(/\s*\|\s*AniVault.*$/i, '').trim() || 'Anime';
              const episodeTitle = document.querySelector('.wp-ep-title, [data-episode-title]')?.textContent?.trim() || '';
              const currentTime = video && Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0;
              const duration = video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
              const playing = !!video && !video.paused && !video.ended && !video.seeking;
              post({ event, title, episode, episodeTitle, url: location.href, image: state.episodeImage || state.image || poster, banner: state.banner, currentTime, duration, playing, at: Date.now() });
            } catch (_) {}
          };
          const loadArt = async () => {
            try {
              const animeId = new URL(location.href).searchParams.get('anime') || '';
              if (!animeId || state.artLoading || state.artLoadedFor === animeId) return;
              state.artLoading = true;
              const response = await fetch('/anime?id=' + encodeURIComponent(animeId), { credentials: 'same-origin', cache: 'force-cache' });
              if (response.ok) {
                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const poster = doc.querySelector('.ih-thumb img')?.getAttribute('src') || '';
                const banner = cssUrl(doc.querySelector('.ih-bg')?.getAttribute('style') || '');
                if (!state.image && poster) state.image = new URL(poster, location.href).href;
                if (banner) state.banner = new URL(banner, location.href).href;
              }
              state.artLoadedFor = animeId;
            } catch (_) { } finally { state.artLoading = false; }
            send('art-ready');
          };
          const attach = () => {
            if (!isWatchPage()) { state.video = null; clear(); return; }
            const next = document.getElementById('sp-video') || document.querySelector('video');
            if (!(next instanceof HTMLVideoElement)) { loadArt(); return; }
            if (next === state.video) {
              if (state.lastUrl !== location.href) send('route-change');
              loadArt();
              return;
            }
            state.video = next;
            ['play','playing','pause','waiting','stalled','seeked','loadedmetadata','durationchange','ended'].forEach((name) => next.addEventListener(name, () => send(name), { passive: true }));
            send('ready');
            loadArt();
          };
          window.__anivaultPresenceSend = send;
          const originalPushState = history.pushState;
          history.pushState = function () { const result = originalPushState.apply(this, arguments); setTimeout(attach, 0); return result; };
          window.addEventListener('popstate', attach);
          window.addEventListener('pagehide', () => post({ event: 'pagehide' }), { capture: true });
          attach();
          setInterval(() => { if (state.active) send('heartbeat'); }, 10000);
          new MutationObserver(attach).observe(document.documentElement, { childList: true, subtree: true });
        })();
        """.trimIndent()
    }
}

private object CookieManagerCompat {
    fun enable(webView: WebView) {
        android.webkit.CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }
    }
}
