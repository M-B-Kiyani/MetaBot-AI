const crypto = require("crypto");

// Generate secure random keys
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

function generateApiKey() {
  // Generate a more structured API key with prefix
  const prefix = "mk_prod_"; // metalogics production
  const key = crypto.randomBytes(24).toString("hex");
  return prefix + key;
}

function generateWidgetKey() {
  // Generate widget key with prefix
  const prefix = "wk_"; // widget key
  const key = crypto.randomBytes(20).toString("hex");
  return prefix + key;
}

// Generate all missing keys
const keys = {
  API_KEY: generateApiKey(),
  PUBLIC_WIDGET_KEY: generateWidgetKey(),
  WIDGET_API_KEY: generateWidgetKey(),
};

console.log("Generated secure keys:");
console.log("=====================");
console.log(`API_KEY="${keys.API_KEY}"`);
console.log(`PUBLIC_WIDGET_KEY="${keys.PUBLIC_WIDGET_KEY}"`);
console.log(`WIDGET_API_KEY="${keys.WIDGET_API_KEY}"`);
console.log("");
console.log("Railway CLI commands:");
console.log("====================");
console.log(`railway variables set API_KEY="${keys.API_KEY}"`);
console.log(
  `railway variables set PUBLIC_WIDGET_KEY="${keys.PUBLIC_WIDGET_KEY}"`
);
console.log(`railway variables set WIDGET_API_KEY="${keys.WIDGET_API_KEY}"`);

// Export for use in other scripts
module.exports = keys;
