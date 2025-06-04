const { InstallationRegistry } = require("./registry");
const registry = new InstallationRegistry();

// Scan for existing installations first
registry.scanExistingInstallations();

// Pull the installation paths
const paths = registry.pullInstallation("1.21.5");

if (paths) {
  console.log("📁 Retrieved file paths:");
  console.log(`   JAR: ${paths.jarPath}`);
  console.log(`   JSON: ${paths.jsonPath}`);
  
  if (paths.jarPath && paths.jsonPath) {
    console.log("🚀 Ready to launch Minecraft with these files!");
    console.log("✅ All required files found for version 1.21.5");
  } else {
    console.log("⚠️ Some required files are missing");
  }
} else {
  console.log("❌ Failed to retrieve installation paths");
  console.log("💡 Make sure version 1.21.5 is installed first");
}