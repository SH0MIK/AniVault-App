#define DISCORDPP_IMPLEMENTATION
#include <discordpp.h>
#include <jni.h>
#include <android/log.h>
#include <algorithm>
#include <atomic>
#include <chrono>
#include <cstdint>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#define LOG_TAG "AniVaultPresence"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
namespace {
std::shared_ptr<discordpp::Client> client;
std::mutex clientMutex;
std::thread callbackThread;
std::atomic_bool running{false};
uint64_t parseApplicationId(const std::string& value) { try { return std::stoull(value); } catch (...) { return 0; } }
std::string trim128(std::string value) { if (value.size() > 128) value.resize(128); return value; }
std::string trim300(std::string value) { if (value.size() > 300) value.resize(300); return value; }
void startCallbacks() {
    if (running.exchange(true)) return;
    callbackThread = std::thread([] { while (running.load()) { discordpp::RunCallbacks(); std::this_thread::sleep_for(std::chrono::milliseconds(50)); } });
}
}
extern "C" JNIEXPORT void JNICALL Java_co_anivault_presence_DiscordPresence_nativeInit(JNIEnv* env, jobject, jstring applicationId) {
    const char* chars = env->GetStringUTFChars(applicationId, nullptr);
    const std::string id = chars ? chars : "";
    if (chars) env->ReleaseStringUTFChars(applicationId, chars);
    const uint64_t appId = parseApplicationId(id);
    if (!appId) { LOGE("Invalid Discord application ID"); return; }
    std::lock_guard<std::mutex> lock(clientMutex);
    if (!client) { client = std::make_shared<discordpp::Client>(); client->SetApplicationId(appId); startCallbacks(); }
}
extern "C" JNIEXPORT void JNICALL Java_co_anivault_presence_DiscordPresence_nativeUpdate(JNIEnv* env, jobject, jstring title, jint episode, jstring episodeTitle, jstring url, jstring image, jstring banner, jdouble currentTime, jdouble duration, jboolean playing, jlong) {
    auto get = [&](jstring value) -> std::string { if (!value) return {}; const char* p = env->GetStringUTFChars(value, nullptr); std::string s = p ? p : ""; if (p) env->ReleaseStringUTFChars(value, p); return s; };
    std::string name = get(title); if (name.empty()) name = "Anime";
    std::string link = get(url); if (link.empty()) link = "https://www.anivault.co/";
    const std::string epTitle = get(episodeTitle), poster = get(image), bannerUrl = get(banner);
    std::lock_guard<std::mutex> lock(clientMutex);
    if (!client) return;
    discordpp::Activity activity;
    activity.SetType(discordpp::ActivityTypes::Watching);
    activity.SetName("AniVault");
    activity.SetDetails(trim128(name));
    std::string state = "Episode " + std::to_string(std::max(0, static_cast<int>(episode)));
    if (!epTitle.empty()) state += " — " + epTitle;
    activity.SetState(trim128(state));
    activity.SetDetailsUrl(link);
    const std::string art = !poster.empty() ? poster : bannerUrl;
    if (!art.empty()) { discordpp::ActivityAssets assets; assets.SetLargeImage(trim300(art)); assets.SetLargeText(trim128(name)); assets.SetLargeUrl(link); activity.SetAssets(assets); }
    discordpp::ActivityButton button; button.SetLabel(playing ? "Watch on AniVault" : "Resume on AniVault"); button.SetUrl(link); activity.AddButton(button);
    if (playing && duration > 0.0) {
        const double safe = std::clamp(static_cast<double>(currentTime), 0.0, static_cast<double>(duration));
        const int64_t now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        discordpp::ActivityTimestamps ts; const int64_t start = now - static_cast<int64_t>(safe * 1000.0);
        ts.SetStart(static_cast<uint64_t>(std::max<int64_t>(0, start)));
        ts.SetEnd(static_cast<uint64_t>(std::max<int64_t>(0, start + static_cast<int64_t>(duration * 1000.0))));
        activity.SetTimestamps(ts);
    } else activity.SetState(trim128(state + " · Paused"));
    client->UpdateRichPresence(std::move(activity), [](discordpp::ClientResult result) { if (!result.Successful()) LOGE("Discord Rich Presence update failed"); });
}
extern "C" JNIEXPORT void JNICALL Java_co_anivault_presence_DiscordPresence_nativeClear(JNIEnv*, jobject) {
    std::lock_guard<std::mutex> lock(clientMutex); if (client) client->ClearRichPresence();
}
extern "C" JNIEXPORT void JNICALL Java_co_anivault_presence_DiscordPresence_nativeShutdown(JNIEnv*, jobject) {
    running.store(false); if (callbackThread.joinable()) callbackThread.join();
    std::lock_guard<std::mutex> lock(clientMutex); if (client) client->ClearRichPresence(); client.reset();
}
