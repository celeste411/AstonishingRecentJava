const { InstallationRegistry } = require("./registry");
const fs = require("fs");
const registry = new InstallationRegistry();
const runclient = require("./index");

// Scan for existing installations first
registry.scanExistingInstallations();

// Pull the installation paths
const paths = registry.pullInstallation("1.20.1");

if (paths) {
  console.log("📁 Retrieved file paths:");
  console.log(`   JAR: ${paths.jarPath}`);
  console.log(`   JSON: ${paths.jsonPath}`);
  
  if (paths.jarPath && paths.jsonPath) {
    console.log("🚀 Ready to launch Minecraft with these files!");
    console.log("✅ All required files found for version 1.21.5");
    
    try {
      // Read and parse the JSON file
      const versionData = JSON.parse(fs.readFileSync(paths.jsonPath, 'utf8'));
      
      // Generate library paths from the version data
      const libPaths = versionData.libraries
        ? versionData.libraries
            .filter(lib => !lib.rules || lib.rules.every(rule => rule.action === "allow"))
            .map(lib => {
              const artifact = lib.downloads?.artifact;
              if (!artifact) return null;
              return { 
                path: require("path").join(__dirname, ".minecraft", "libraries", artifact.path.replace(/\//g, require("path").sep))
              };
            })
            .filter(Boolean)
        : [];
      
      // Launch Minecraft with correct parameters
      runclient.launchMinecraft(versionData, paths.jarPath, libPaths);
      
    } catch (error) {
      console.error("❌ Error launching Minecraft:", error.message);
    }
    
  } else {
    console.log("⚠️ Some required files are missing");
  }
} else {
  console.log("❌ Failed to retrieve installation paths");
  console.log("💡 Make sure version 1.21.5 is installed first");
}