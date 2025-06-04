
const { InstallationRegistry } = require("./registry");
const readline = require("readline");
const path = require("path");

const registry = new InstallationRegistry();

function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  console.log("🎯 MINECRAFT REGISTRY PULL TOOL\n");
  
  // Scan for existing installations first
  registry.scanExistingInstallations();
  
  // Display current installations
  registry.displayInstallations();
  
  const installations = registry.getAllInstallations();
  if (installations.length === 0) {
    console.log("❌ No installations found in registry");
    return;
  }

  console.log("\n📋 PULL OPTIONS:");
  console.log("1. Pull specific version");
  console.log("2. Pull all versions");
  console.log("3. Exit");

  const choice = await promptUser("\nSelect option (1-3): ");

  switch (choice) {
    case "1":
      // Pull specific version
      console.log("\n📦 Available versions:");
      installations.forEach((install, index) => {
        console.log(`${index + 1}. ${install.id} (${install.type})`);
      });

      const versionChoice = await promptUser(`\nSelect version (1-${installations.length}): `);
      const selectedIndex = parseInt(versionChoice) - 1;
      
      if (selectedIndex >= 0 && selectedIndex < installations.length) {
        const selectedVersion = installations[selectedIndex];
        const destination = await promptUser("Enter destination directory (or press enter for './pulled'): ");
        const destDir = destination.trim() || "./pulled";
        
        registry.pullInstallation(selectedVersion.id, path.join(destDir, selectedVersion.id));
      } else {
        console.log("❌ Invalid selection");
      }
      break;

    case "2":
      // Pull all versions
      const destination = await promptUser("Enter destination directory (or press enter for './pulled'): ");
      const destDir = destination.trim() || "./pulled";
      
      registry.pullAllInstallations(destDir);
      break;

    case "3":
      console.log("👋 Goodbye!");
      break;

    default:
      console.log("❌ Invalid option");
      break;
  }
}

main().catch(error => {
  console.error("❌ Error:", error.message);
});
