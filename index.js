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
  return manifest.versions.map((v) => ({
    id: v.id,
    type: v.type,
    url: v.url,
    releaseTime: v.releaseTime,
  }));
}

function createVersionList(versions) {
  const releaseVersions = versions.filter((v) => v.type === "release");
  const snapshotVersions = versions.filter((v) => v.type === "snapshot");

  console.log("\n=== MINECRAFT VERSION SELECTOR ===\n");
  console.log(`📦 RELEASE VERSIONS (${releaseVersions.length} total):`);
  const displayReleases = releaseVersions.slice(0, 20);
  displayReleases.forEach((version, index) => {
    console.log(`${index + 1}. ${version.id} ✅`);
  });

  if (releaseVersions.length > 1000) {
    console.log(`... and ${releaseVersions.length - 20} more releases`);
  }

  console.log(`\n🔬 SNAPSHOT VERSIONS (${snapshotVersions.length} total):`);
  const displaySnapshots = snapshotVersions.slice(0, 10);
  const startIndex = releaseVersions.length;
  displaySnapshots.forEach((version, index) => {
    console.log(`${startIndex + index + 1}. ${version.id} ✅`);
  });

  if (snapshotVersions.length > 10) {
    console.log(`... and ${snapshotVersions.length - 10} more snapshots`);
  }

  console.log("\n✅ = JAR will be downloaded from Mojang");
  return [...releaseVersions, ...snapshotVersions];
}

async function selectVersion() {
  const versions = await getAvailableVersions();
  const displayVersions = createVersionList(versions);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `\nEnter version number (1-${displayVersions.length}): `,
      (answer) => {
        const choice = parseInt(answer) - 1;
        if (choice >= 0 && choice < displayVersions.length) {
          console.log(`\n✅ Selected: ${displayVersions[choice].id}`);
          resolve(displayVersions[choice]);
        } else {
          console.log("❌ Invalid selection. Using default version 1.20.1");
          resolve(versions.find((v) => v.id === "1.20.1") || versions[0]);
        }
        rl.close();
      },
    );
  });
}

async function downloadMinecraft(version) {
  const versionDir = path.join(MINECRAFT_DIR, "versions", version.id);
  fs.mkdirSync(versionDir, { recursive: true });

  console.log(`\n🔄 Downloading Minecraft ${version.id}...`);

  const versionJSON = await fetchJSON(version.url);
  const jarURL = versionJSON.downloads.client.url;

  const jarPath = path.join(versionDir, `${version.id}.jar`);
  const jsonPath = path.join(versionDir, `${version.id}.json`);

  await download(jarURL, jarPath);
  fs.writeFileSync(jsonPath, JSON.stringify(versionJSON, null, 2));
  console.log(`✅ Downloaded Minecraft ${version.id}`);

  let libPaths = [];

  if (versionJSON.libraries) {
    libPaths = versionJSON.libraries
      .filter(
        (lib) =>
          !lib.rules || lib.rules.every((rule) => rule.action === "allow"),
      )
      .map((lib) => {
        const artifact = lib.downloads?.artifact;
        if (!artifact) return null;
        const libPath = path.join(
          MINECRAFT_DIR,
          "libraries",
          artifact.path.replace(/\//g, path.sep),
        );
        fs.mkdirSync(path.dirname(libPath), { recursive: true });
        return { url: artifact.url, path: libPath };
      })
      .filter(Boolean);

    console.log(`📦 Downloading ${libPaths.length} libraries...`);
    for (const lib of libPaths) {
      if (!fs.existsSync(lib.path)) {
        console.log(`⬇️ Downloading: ${path.basename(lib.path)}`);
        await download(lib.url, lib.path);
      }
    }
    console.log(`✅ All libraries downloaded`);
  }

  return { versionJSON, jarPath, libPaths };
}

async function launchMinecraft(versionData, jarPath, libPaths) {
  // Ensure jopt-simple is in the classpath
  const joptSimplePath = path.join(MINECRAFT_DIR, "libraries", "net", "sf", "jopt-simple", "jopt-simple", "5.0.4", "jopt-simple-5.0.4.jar");
  
  const cp = libPaths
    .map((l) => l.path)
    .concat([jarPath])
    .join(path.delimiter);
  
  console.log(`🔍 Checking jopt-simple at: ${joptSimplePath}`);
  console.log(`📁 Exists: ${fs.existsSync(joptSimplePath)}`);
  
  const mainClass = versionData.mainClass || "net.minecraft.client.Minecraft";

  const args = [
    "-Xmx2G",
    `-Djava.library.path=${path.join(MINECRAFT_DIR, "natives")}`,
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

  if (versionData.assets) {
    args.push("--assetsDir", path.join(MINECRAFT_DIR, "assets"));
    args.push("--assetIndex", versionData.assets);
  }

  console.log(`\n🚀 Launching Minecraft ${versionData.id}...`);
  const child = spawn("java", args);
  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));
  child.on("close", (code) => {
    console.log(`\n🎮 Minecraft exited with code: ${code}`);
  });
}

async function main(selectedVersion) {
  try {
   // const selectedVersion = await selectVersion();
    const { versionJSON, jarPath, libPaths } =
    await downloadMinecraft(selectedVersion);
    await launchMinecraft(versionJSON, jarPath, libPaths);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

//main();
module.exports = { main, launchMinecraft, downloadMinecraft }