const { InstallationRegistry } = require("./registry");
const registry = new InstallationRegistry();
const runclient = require("./index");
// Scan for existing installations first
registry.scanExistingInstallations();

// Pull the installation paths
const paths = registry.pullInstallation("1.21.5");

if (paths) {
  console.log("📁 Retrieved file paths:");
  console.log(`   JAR: ${paths.jarPath}`);
  console.log(`   JSON: ${paths.jsonPath}`);
} else {
  console.log("❌ Failed to retrieve installation paths");
}
runclient.launchMinecraft(paths.jsonPath, paths.jarPath)