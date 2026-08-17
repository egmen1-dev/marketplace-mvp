/**
 * P0 token + route-graph probe for Metro dependency audit.
 * Loads theme/tokens (sync) then root layout + index routes only.
 */
process.env.EXPO_ROUTER_IMPORT_MODE = "sync";

const tokens = require("./src/theme/tokens");
if (!tokens.colors?.orange) {
  throw new Error("theme/tokens colors undefined at probe init");
}

require("./app/_layout");
require("./app/index");

module.exports = { ok: true };
