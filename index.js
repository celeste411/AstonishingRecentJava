
const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");

const MINECRAFT_DIR = path.join(__dirname, ".minecraft");
const VERSION_MANIFEST =
  "https://launchermeta.mojang.com/mc/game/version_manifest.json";

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });
}

async function getAvailableVersions() {
  const manifest = await fetchJSON(VERSION_MANIFEST);
  return manifest.versions.map(v => ({
    id: v.id,
    type: v.type,
    url: v.url,
    releaseTime: v.releaseTime
  }));
}

function createVersionList(versions) {
  const releaseVersions = versions.filter(v => v.type === 'release').slice(0, 20);
  const snapshotVersions = versions.filter(v => v.type === 'snapshot').slice(0, 10);
  
  console.log('\n=== MINECRAFT VERSION SELECTOR ===\n');
  console.log('📦 RELEASE VERSIONS (Latest 20):');
  releaseVersions.forEach((version, index) => {
    console.log(`${index + 1}. ${version.id} (${version.releaseTime.split('T')[0]})`);
  });
  
  console.log('\n🔬 SNAPSHOT VERSIONS (Latest 10):');
  const startIndex = releaseVersions.length;
  snapshotVersions.forEach((version, index) => {
    console.log(`${startIndex + index + 1}. ${version.id} (${version.releaseTime.split('T')[0]})`);
  });
  
  return [...releaseVersions, ...snapshotVersions];
}

async function selectVersion() {
  const versions = await getAvailableVersions();
  const displayVersions = createVersionList(versions);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`\nEnter version number (1-${displayVersions.length}): `, (answer) => {
      const choice = parseInt(answer) - 1;
      if (choice >= 0 && choice < displayVersions.length) {
        console.log(`\n✅ Selected: ${displayVersions[choice].id}`);
        resolve(displayVersions[choice]);
      } else {
        console.log('❌ Invalid selection. Using default version 1.20.1');
        resolve(versions.find(v => v.id === '1.20.1') || versions[0]);
      }
      rl.close();
    });
  });
}

async function downloadMinecraft(version) {
  // Make game directory
  const versionDir = path.join(MINECRAFT_DIR, "versions", version.id);
  fs.mkdirSync(versionDir, { recursive: true });

  console.log(`\n🔄 Downloading Minecraft ${version.id}...`);

  // Download version JSON
  const versionJSON = await fetchJSON(version.url);
  const jarURL = versionJSON.downloads.client.url;
  const jarPath = path.join(versionDir, `${version.id}.jar`);
  const jsonPath = path.join(versionDir, `${version.id}.json`);

  // Save JAR and JSON
  await download(jarURL, jarPath);
  fs.writeFileSync(jsonPath, JSON.stringify(versionJSON, null, 2));

  console.log(`✅ Downloaded Minecraft ${version.id}`);

  // Get classpath
  const libPaths = versionJSON.libraries
    .filter(
      (lib) => !lib.rules || lib.rules.every((rule) => rule.action === "allow"),
    )
    .map((lib) => {
      const artifact = lib.downloads?.artifact;
      if (!artifact) return null;
      const libPath = path.join(
        MINECRAFT_DIR,
        "libraries",
        artifact.path.replace(/\//g, path.sep),
      );
      // Ensure directory
      fs.mkdirSync(path.dirname(libPath), { recursive: true });
      return { url: artifact.url, path: libPath };
    })
    .filter(Boolean);

  console.log(`📦 Downloading ${libPaths.length} libraries...`);
  for (const lib of libPaths) {
    if (!fs.existsSync(lib.path)) await download(lib.url, lib.path);
  }

  return { versionJSON, jarPath, libPaths };
}

async function launchMinecraft(versionData, jarPath, libPaths) {
  // Build classpath
  const cp = libPaths
    .map((l) => l.path)
    .concat([jarPath])
    .join(path.delimiter);

  // Launch Java process
  const args = [
    "-Xmx2G",
    "-cp",
    cp,
    versionData.mainClass,
    "--username",
    "OfflinePlayer",
    "--version",
    versionData.id,
    "--gameDir",
    MINECRAFT_DIR,
    "--assetsDir",
    path.join(MINECRAFT_DIR, "assets"),
    "--assetIndex",
    versionData.assets,
    "--uuid",
    "00000000-0000-0000-0000-000000000000",
    "--accessToken",
    "0",
    "--userType",
    "legacy",
  ];

  console.log(`\n🚀 Launching Minecraft ${versionData.id}...`);
  const child = spawn("java", args);
  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));
}

async function main() {
  try {
    // Let user select version
    const selectedVersion = await selectVersion();
    
    // Download selected version
    const { versionJSON, jarPath, libPaths } = await downloadMinecraft(selectedVersion);
    
    // Launch the game
    await launchMinecraft(versionJSON, jarPath, libPaths);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Save version list to file for reference
async function saveVersionList() {
  try {
    const versions = await getAvailableVersions();
    const versionList = {
      lastUpdated: new Date().toISOString(),
      totalVersions: versions.length,
      releases: versions.filter(v => v.type === 'release').map(v => ({
        id: v.id,
        releaseTime: v.releaseTime,
        jarUrl: `Will be fetched from: ${v.url}`
      })),
      snapshots: versions.filter(v => v.type === 'snapshot').map(v => ({
        id: v.id,
        releaseTime: v.releaseTime,
        jarUrl: `Will be fetched from: ${v.url}`
      }))
    };
    
    fs.writeFileSync('minecraft-versions.json', JSON.stringify(versionList, null, 2));
    console.log('📄 Version list saved to minecraft-versions.json');
  } catch (error) {
    console.error('Error saving version list:', error);
  }
}

// Run the program
main();

// Also save the version list for reference
saveVersionList();
