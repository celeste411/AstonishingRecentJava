
#!/usr/bin/env node
const { InstallationRegistry } = require("./registry");

async function main() {
  const registry = new InstallationRegistry();
  
  // Scan for any existing installations not in registry
  registry.scanExistingInstallations();
  
  // Display all installations
  registry.displayInstallations();
  
  // Interactive options
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("Options:");
  console.log("1. Refresh registry (scan for new installations)");
  console.log("2. Remove installation from registry");
  console.log("3. Exit");
  
  rl.question("\nSelect option (1-3): ", (answer) => {
    switch(answer) {
      case "1":
        registry.scanExistingInstallations();
        console.log("✅ Registry refreshed!");
        break;
      case "2":
        rl.question("Enter version ID to remove: ", (versionId) => {
          if (registry.removeInstallation(versionId)) {
            console.log("✅ Installation removed from registry");
          } else {
            console.log("❌ Installation not found in registry");
          }
          rl.close();
        });
        return;
      case "3":
      default:
        console.log("👋 Goodbye!");
        break;
    }
    rl.close();
  });
}

main().catch(console.error);
