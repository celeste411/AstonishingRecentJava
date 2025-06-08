
const minecraftlauncher = require("./Encoderdecoder");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");

const skibs = require("./main");

async function main(profileName, selected) {
  try {
    console.log("🔧 Starting Forge Installation Process...");
    
    // Show existing installations first
    console.log("\n📋 Current installations:");
    skibs.registry.displayInstallations();
    
    // Select Minecraft version

    
    if (!selected) {
      console.log("❌ No version selected. Exiting.");
      return;
    }
    
    console.log(`✅ Selected version: ${selected.id}`);
    
    // Check if already installed
    const existingInstall = skibs.registry.getInstallation(selected.id);
    if (existingInstall) {
      console.log(`📦 ${selected.id} is already installed!`);
      console.log(`   Installed: ${new Date(existingInstall.installedAt).toLocaleDateString()}`);
      console.log(`   Size: ${skibs.registry.formatSize(existingInstall.size)}`);
    } else {
      // Download Minecraft
      const { versionJSON, jarPath, libPaths } = await skibs.downloadMinecraft(selected, profileName);
      console.log("✅ Minecraft downloaded successfully!");
    }
    
    console.log("🚀 Ready for Forge installation...");
    
    // You can add Forge installation logic here
    
  } catch (error) {
    console.error("❌ Error in Forge installation:", error.message);
  }
}

module.exports = {  main };
