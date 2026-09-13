const { withAppBuildGradle, withMainApplication, withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_ID = '1505538731791093820';
const moduleRoot = path.join(__dirname, '..', 'modules', 'anivault-discord-presence', 'android');

function copyRecursive(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

module.exports = function withDiscordPresence(config) {
  config = withProjectBuildGradle(config, cfg => {
    if (cfg.modResults.language === 'groovy') {
      const marker = "maven { url 'https://www.jitpack.io' }";
      if (!cfg.modResults.contents.includes(marker)) {
        cfg.modResults.contents = cfg.modResults.contents.replace(
          /allprojects\s*\{\s*repositories\s*\{/,
          match => `${match}\n        maven { url 'https://www.jitpack.io' }`
        );
      }
    }
    return cfg;
  });

  config = withAppBuildGradle(config, cfg => {
    let text = cfg.modResults.contents;
    if (!text.includes('discord_partner_sdk.aar')) {
      text = text.replace(/android\s*\{/, `android {\n    buildFeatures { prefab true }\n    defaultConfig {\n        ndk { abiFilters 'arm64-v8a' }\n        buildConfigField 'long', 'DISCORD_APPLICATION_ID', '${APP_ID}'\n    }\n    externalNativeBuild {\n        cmake {\n            path file('src/main/cpp/CMakeLists.txt')\n            version '3.22.1'\n            arguments '-DANDROID_STL=c++_shared', '-DCMAKE_ANDROID_STL_TYPE=c++_shared'\n        }\n    }`);
    }
    if (!text.includes("implementation files('libs/discord_partner_sdk.aar')")) {
      text = text.replace(/dependencies\s*\{/, `dependencies {\n    implementation files('libs/discord_partner_sdk.aar')`);
    }
    cfg.modResults.contents = text;
    return cfg;
  });

  config = withMainApplication(config, cfg => {
    let text = cfg.modResults.contents;
    if (!text.includes('co.anivault.presence.DiscordPresencePackage')) {
      text = text.replace(
        /package\s+([^\n]+)\n/,
        match => `${match}\nimport co.anivault.presence.DiscordPresencePackage\n`
      );
      const patterns = [
        /(PackageList\(this\)\.packages\.apply\s*\{)/,
        /(PackageList\(this\)\.packages\s*\.toMutableList\(\)\s*\.apply\s*\{)/,
      ];
      let injected = false;
      for (const re of patterns) {
        if (re.test(text)) {
          text = text.replace(re, '$1\n            add(DiscordPresencePackage())');
          injected = true;
          break;
        }
      }
      if (!injected) {
        text = text.replace(/(override\s+fun\s+getPackages\(\):\s*List<ReactPackage>\s*\{)/, '$1\n        return PackageList(this).packages + DiscordPresencePackage()');
      }
    }
    cfg.modResults.contents = text;
    return cfg;
  });

  config.modRequest = config.modRequest || {};
  const { withDangerousMod } = require('@expo/config-plugins');
  config = withDangerousMod(config, ['android', async cfg => {
    const root = cfg.modRequest.platformProjectRoot;
    copyRecursive(path.join(moduleRoot, 'discord_partner_sdk.aar'), path.join(root, 'app', 'libs', 'discord_partner_sdk.aar'));
    copyRecursive(path.join(moduleRoot, 'src', 'main', 'cpp'), path.join(root, 'app', 'src', 'main', 'cpp'));
    copyRecursive(path.join(moduleRoot, 'src', 'main', 'java'), path.join(root, 'app', 'src', 'main', 'java'));
    return cfg;
  }]);

  return config;
};
