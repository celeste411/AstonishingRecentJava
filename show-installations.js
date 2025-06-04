
#!/usr/bin/env node
const { InstallationRegistry } = require("./registry");

function showMenu(registry) {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log("\nOptions:");
    console.log("1. Refresh registry (scan for new installations)");
    console.log("2. Remove installation from registry");
    console.log("3. Show installations again");
    console.log("4. Exit");
    
    rl.question("\nSelect option (1-4): ", (answer) => {
      switch(answer) {
        case "1":
          console.log("🔄 Refreshing registry...");
          registry.scanExistingInstallations();
          console.log("✅ Registry refreshed!");
          registry.displayInstallations();
          rl.close();
          resolve(false); // Continue menu
          break;
        case "2":
          rl.question("Enter version ID to remove: ", (versionId) => {
            if (registry.removeInstallation(versionId)) {
              console.log("✅ Installation removed from registry");
            } else {
              console.log("❌ Installation not found in registry");
            }
            registry.displayInstallations();
            rl.close();
            resolve(false); // Continue menu
          });
          break;
        case "3":
          registry.displayInstallations();
          rl.close();
          resolve(false); // Continue menu
          break;
        case "4":
        default:
          console.log("👋 Goodbye!");
          rl.close();
          resolve(true); // Exit
          break;
      }
    });
  });
}

async function main() {
  const registry = new InstallationRegistry();
  
  // Scan for any existing installations not in registry
  console.log("🔍 Scanning for installations...");
  registry.scanExistingInstallations();
  
  // Display all installations
  registry.displayInstallations();
  
  // Interactive menu loop
  let shouldExit = false;
  while (!shouldExit) {
    try {
      shouldExit = await showMenu(registry);
    } catch (error) {
      console.error("❌ Menu error:", error.message);
      shouldExit = true;
    }
  }
}

main().catch(console.error);
