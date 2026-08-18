/** Metro probe — theme/tokens only (no routes). */
const tokens = require("./src/theme/tokens");
if (!tokens.colors?.orange) throw new Error("colors undefined");
module.exports = tokens;
