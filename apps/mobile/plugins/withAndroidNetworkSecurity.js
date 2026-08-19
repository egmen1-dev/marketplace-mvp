const { withAndroidManifest, AndroidConfig, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

/**
 * Ensures release builds trust system CA for Railway HTTPS and block cleartext.
 */
function withAndroidNetworkSecurity(config) {
  const withXml = withDangerousMod(config, [
    "android",
    async (config) => {
      const resDir = path.join(config.modRequest.platformProjectRoot, "app/src/main/res/xml");
      fs.mkdirSync(resDir, { recursive: true });
      fs.writeFileSync(path.join(resDir, "network_security_config.xml"), NETWORK_SECURITY_XML, "utf8");
      return config;
    },
  ]);

  return withAndroidManifest(withXml, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    app.$["android:usesCleartextTraffic"] = "false";
    return config;
  });
}

module.exports = withAndroidNetworkSecurity;
