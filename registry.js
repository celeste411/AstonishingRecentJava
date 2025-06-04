
const fs = require("fs");
const path = require("path");

const MINECRAFT_DIR = path.join(__dirname, ".minecraft");
const REGISTRY_FILE = path.join(MINECRAFT_DIR, "installations_registry.json");

class InstallationRegistry {
  constructor() {
    this.registryPath = REGISTRY_FILE;
    this.installations = this.loadRegistry();
  }

  loadRegistry() {
    try {
      if (fs.existsSync(this.registryPath)) {
        const data = fs.readFileSync(this.registryPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn("⚠️ Could not load registry:", error.message);
    }
    return {};
  }

  saveRegistry() {
    try {
      fs.mkdirSync(path.dirname(this.registryPath), { recursive: true });
      fs.writeFileSync(this.registryPath, JSON.stringify(this.installations, null, 2));
    } catch (error) {
      console.error("❌ Failed to save registry:", error.message);
    }
  }

  addInstallation(versionId, installData) {
    const timestamp = new Date().toISOString();
    this.installations[versionId] = {
      id: versionId,
      type: installData.type || "unknown",
      installedAt: timestamp,
      lastAccessed: timestamp,
      jarPath: installData.jarPath,
      jsonPath: installData.jsonPath,
      size: this.getInstallationSize(versionId),
      hasForge: false, // Will be updated when Forge is installed
      forgeVersion: null
    };
    this.saveRegistry();
    console.log(`✅ Added ${versionId} to registry`);
  }

  updateLastAccessed(versionId) {
    if (this.installations[versionId]) {
      this.installations[versionId].lastAccessed = new Date().toISOString();
      this.saveRegistry();
    }
  }

  getInstallationSize(versionId) {
    try {
      const versionDir = path.join(MINECRAFT_DIR, "versions", versionId);
      if (!fs.existsSync(versionDir)) return 0;
      
      let size = 0;
      const files = fs.readdirSync(versionDir);
      files.forEach(file => {
        const filePath = path.join(versionDir, file);
        const stats = fs.statSync(filePath);
        size += stats.size;
      });
      return size;
    } catch (error) {
      return 0;
    }
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  scanExistingInstallations() {
    const versionsDir = path.join(MINECRAFT_DIR, "versions");
    if (!fs.existsSync(versionsDir)) return;

    console.log("🔍 Scanning for existing installations...");
    const versionFolders = fs.readdirSync(versionsDir);
    
    versionFolders.forEach(versionId => {
      const versionDir = path.join(versionsDir, versionId);
      const jarPath = path.join(versionDir, `${versionId}.jar`);
      const jsonPath = path.join(versionDir, `${versionId}.json`);
      
      if (fs.existsSync(jarPath) && !this.installations[versionId]) {
        let versionType = "unknown";
        try {
          if (fs.existsSync(jsonPath)) {
            const versionData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            versionType = versionData.type || "unknown";
          }
        } catch (error) {
          // Ignore JSON parsing errors
        }
        
        this.addInstallation(versionId, {
          type: versionType,
          jarPath,
          jsonPath
        });
      }
    });
  }

  displayInstallations() {
    console.log("\n=== MINECRAFT INSTALLATIONS REGISTRY ===\n");
    
    const installations = Object.values(this.installations);
    if (installations.length === 0) {
      console.log("📭 No installations found in registry.");
      return;
    }

    // Sort by installation date (newest first)
    installations.sort((a, b) => new Date(b.installedAt) - new Date(a.installedAt));

    console.log(`📦 Found ${installations.length} installation(s):\n`);

    installations.forEach((install, index) => {
      const sizeStr = this.formatSize(install.size);
      const installedDate = new Date(install.installedAt).toLocaleDateString();
      const lastAccessedDate = new Date(install.lastAccessed).toLocaleDateString();
      
      console.log(`${index + 1}. ${install.id}`);
      console.log(`   📅 Installed: ${installedDate}`);
      console.log(`   🕒 Last accessed: ${lastAccessedDate}`);
      console.log(`   📊 Size: ${sizeStr}`);
      console.log(`   🏷️  Type: ${install.type}`);
      if (install.hasForge) {
        console.log(`   🔧 Forge: ${install.forgeVersion}`);
      }
      console.log(`   📁 JAR: ${install.jarPath}`);
      console.log("");
    });

    // Summary statistics
    const totalSize = installations.reduce((sum, install) => sum + install.size, 0);
    const releaseCount = installations.filter(i => i.type === "release").length;
    const snapshotCount = installations.filter(i => i.type === "snapshot").length;
    
    console.log("📈 SUMMARY:");
    console.log(`   Total installations: ${installations.length}`);
    console.log(`   Releases: ${releaseCount} | Snapshots: ${snapshotCount}`);
    console.log(`   Total disk usage: ${this.formatSize(totalSize)}`);
  }

  removeInstallation(versionId) {
    if (this.installations[versionId]) {
      delete this.installations[versionId];
      this.saveRegistry();
      console.log(`🗑️ Removed ${versionId} from registry`);
      return true;
    }
    return false;
  }

  getInstallation(versionId) {
    return this.installations[versionId] || null;
  }

  getAllInstallations() {
    return Object.values(this.installations);
  }

  pullInstallation(versionId, destinationDir) {
    const installation = this.getInstallation(versionId);
    if (!installation) {
      console.log(`❌ Installation ${versionId} not found in registry`);
      return false;
    }

    try {
      // Create destination directory
      fs.mkdirSync(destinationDir, { recursive: true });

      // Copy JAR file
      if (fs.existsSync(installation.jarPath)) {
        const jarDestination = path.join(destinationDir, `${versionId}.jar`);
        fs.copyFileSync(installation.jarPath, jarDestination);
        console.log(`✅ Pulled JAR: ${jarDestination}`);
      } else {
        console.log(`⚠️ JAR file not found: ${installation.jarPath}`);
      }

      // Copy JSON file
      if (fs.existsSync(installation.jsonPath)) {
        const jsonDestination = path.join(destinationDir, `${versionId}.json`);
        fs.copyFileSync(installation.jsonPath, jsonDestination);
        console.log(`✅ Pulled JSON: ${jsonDestination}`);
      } else {
        console.log(`⚠️ JSON file not found: ${installation.jsonPath}`);
      }

      // Update last accessed time
      this.updateLastAccessed(versionId);

      console.log(`🎯 Successfully pulled ${versionId} to ${destinationDir}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to pull ${versionId}:`, error.message);
      return false;
    }
  }

  pullAllInstallations(destinationDir) {
    const installations = this.getAllInstallations();
    if (installations.length === 0) {
      console.log("📭 No installations to pull");
      return false;
    }

    console.log(`📦 Pulling ${installations.length} installations to ${destinationDir}...`);

    let successCount = 0;
    installations.forEach(installation => {
      const versionDir = path.join(destinationDir, installation.id);
      if (this.pullInstallation(installation.id, versionDir)) {
        successCount++;
      }
    });

    console.log(`✅ Successfully pulled ${successCount}/${installations.length} installations`);
    return successCount > 0;
  }
}

module.exports = { InstallationRegistry };
