
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
  try {
    // Try to read from local test.txt first
    const jarManifest = JSON.parse(fs.readFileSync('test.txt', 'utf8'));
    return jarManifest.map(v => ({
      id: v.version,
      type: v.version.includes('pre') || v.version.includes('rc') || v.version.includes('snapshot') || v.version.includes('w') ? 'snapshot' : 'release',
      jarUrl: v.url,
      releaseTime: '2024-01-01T00:00:00+00:00' // Default since jar manifest doesn't include dates
    }));
  } catch (error) {
    console.log('📄 Using fallback version manifest...');
    const manifest = await fetchJSON(VERSION_MANIFEST);
    return manifest.versions.map(v => ({
      id: v.id,
      type: v.type,
      url: v.url,
      releaseTime: v.releaseTime
    }));
  }
}

function createVersionList(versions) {
  const releaseVersions = versions.filter(v => v.type === 'release');
  const snapshotVersions = versions.filter(v => v.type === 'snapshot');
  
  console.log('\n=== MINECRAFT VERSION SELECTOR ===\n');
  console.log(`📦 RELEASE VERSIONS (${releaseVersions.length} total):`);
  
  // Show first 20 releases for better readability
  const displayReleases = releaseVersions.slice(0, 20);
  displayReleases.forEach((version, index) => {
    const hasJar = version.jarUrl ? '✅' : '❌';
    console.log(`${index + 1}. ${version.id} ${hasJar}`);
  });
  
  if (releaseVersions.length > 20) {
    console.log(`... and ${releaseVersions.length - 20} more releases`);
  }
  
  console.log(`\n🔬 SNAPSHOT VERSIONS (${snapshotVersions.length} total):`);
  
  // Show first 10 snapshots
  const displaySnapshots = snapshotVersions.slice(0, 10);
  const startIndex = releaseVersions.length;
  displaySnapshots.forEach((version, index) => {
    const hasJar = version.jarUrl ? '✅' : '❌';
    console.log(`${startIndex + index + 1}. ${version.id} ${hasJar}`);
  });
  
  if (snapshotVersions.length > 10) {
    console.log(`... and ${snapshotVersions.length - 10} more snapshots`);
  }
  
  console.log('\n✅ = JAR available | ❌ = Requires download');
  
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

  let versionJSON, jarURL;
  
  if (version.jarUrl) {
    // Use direct jar URL from test.txt manifest
    jarURL = version.jarUrl;
    
    // Try to get version JSON, fallback to minimal JSON if not available
    try {
      versionJSON = await fetchJSON(version.url);
    } catch (error) {
      console.log(`⚠️  Could not fetch version JSON for ${version.id}, using minimal config`);
      versionJSON = {
        id: version.id,
        type: version.type,
        mainClass: "net.minecraft.client.main.Main",
        assets: "legacy",
        downloads: {
          client: {
            url: jarURL
          }
        },
        libraries: []
      };
    }
  } else {
    // Fallback to original method
    versionJSON = await fetchJSON(version.url);
    jarURL = versionJSON.downloads.client.url;
  }

  const jarPath = path.join(versionDir, `${version.id}.jar`);
  const jsonPath = path.join(versionDir, `${version.id}.json`);

  // Save JAR and JSON
  await download(jarURL, jarPath);
  fs.writeFileSync(jsonPath, JSON.stringify(versionJSON, null, 2));

  console.log(`✅ Downloaded Minecraft ${version.id}`);

  // Get classpath - handle cases where libraries might not be available
  let libPaths = [];
  
  if (versionJSON.libraries && versionJSON.libraries.length > 0) {
    libPaths = versionJSON.libraries
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
  } else {
    console.log(`⚠️  No libraries found for ${version.id} - this might be an older version`);
  }

  return { versionJSON, jarPath, libPaths };
}

async function launchMinecraft(versionData, jarPath, libPaths) {
  // Build classpath
  const cp = libPaths
    .map((l) => l.path)
    .concat([jarPath])
    .join(path.delimiter);

  // Determine main class - fallback for older versions
  const mainClass = versionData.mainClass || "net.minecraft.client.Minecraft";
  
  // Launch Java process with compatible arguments
  const args = [
    "-Xmx2G",
    "-Djava.library.path=" + path.join(MINECRAFT_DIR, "natives"),
    "-cp",
    cp,
    mainClass,
    "--username",
    "OfflinePlayer",
    "--version",
    versionData.id,
    "--gameDir",
    MINECRAFT_DIR,
    "--uuid",
    "00000000-0000-0000-0000-000000000000",
    "--accessToken",
    "0",
    "--userType",
    "legacy",
  ];

  // Add optional arguments if available
  if (versionData.assets) {
    args.push("--assetsDir", path.join(MINECRAFT_DIR, "assets"));
    args.push("--assetIndex", versionData.assets);
  }

  console.log(`\n🚀 Launching Minecraft ${versionData.id}...`);
  console.log(`📋 Using main class: ${mainClass}`);
  console.log(`📁 Game directory: ${MINECRAFT_DIR}`);
  
  const child = spawn("java", args);
  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));
  child.on("close", (code) => {
    console.log(`\n🎮 Minecraft exited with code: ${code}`);
  });
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
async function displayAllVersions() {
  try {
    const versions = await getAvailableVersions();
    const releaseVersions = versions.filter(v => v.type === 'release');
    const snapshotVersions = versions.filter(v => v.type === 'snapshot');
    
    console.log('\n=== ALL MINECRAFT VERSIONS ===\n');
    console.log(`Total versions available: ${versions.length}`);
    console.log(`📦 Releases: ${releaseVersions.length}`);
    console.log(`🔬 Snapshots: ${snapshotVersions.length}\n`);
    
    console.log('📦 ALL RELEASE VERSIONS:');
    releaseVersions.forEach((version, index) => {
      console.log(`${index + 1}. ${version.id} (${version.releaseTime.split('T')[0]})`);
    });
    
    console.log('\n🔬 ALL SNAPSHOT VERSIONS:');
    snapshotVersions.forEach((version, index) => {
      console.log(`${index + 1}. ${version.id} (${version.releaseTime.split('T')[0]})`);
    });
    
  } catch (error) {
    console.error('Error fetching versions:', error);
  }
}

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

// Function to search for specific versions
async function searchVersions(query) {
  try {
    const versions = await getAvailableVersions();
    const matches = versions.filter(v => 
      v.id.toLowerCase().includes(query.toLowerCase())
    );
    
    console.log(`\n🔍 Search results for "${query}":`);
    matches.slice(0, 10).forEach((version, index) => {
      const hasJar = version.jarUrl ? '✅' : '❌';
      console.log(`${index + 1}. ${version.id} [${version.type}] ${hasJar}`);
    });
    
    if (matches.length > 10) {
      console.log(`... and ${matches.length - 10} more matches`);
    }
    
    return matches;
  } catch (error) {
    console.error('Error searching versions:', error);
    return [];
  }
}

// Uncomment the line below to display all versions without launching
// displayAllVersions();

// Uncomment and modify to search for specific versions
// searchVersions("1.20");

// Run the program
main();

// Also save the version list for reference
saveVersionList();
