
const minecraftlauncher = require("./Encoderdecoder");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");

const skibs = require("./index");

async function main() {
  try {
    console.log("🔧 Starting Forge Installation Process...");
    
    // Select Minecraft version
    const selected = await minecraftlauncher.selectMinecraftVersion();
    
    if (!selected) {
      console.log("❌ No version selected. Exiting.");
      return;
    }
    
    console.log(`✅ Selected version: ${selected.id}`);
    
    // Download Minecraft
    const { versionJSON, jarPath, libPaths } = await skibs.downloadMinecraft(selected);
    
    console.log("✅ Minecraft downloaded successfully!");
    console.log("🚀 Ready for Forge installation...");
    
    // You can add Forge installation logic here
    
  } catch (error) {
    console.error("❌ Error in Forge installation:", error.message);
  }
}

main();
