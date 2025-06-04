const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const MINECRAFT_DIR = path.join(__dirname, ".minecraft");
const VERSION = "1.20.1";
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

async function main() {
  // Make game directory
  const versionDir = path.join(MINECRAFT_DIR, "versions", VERSION);
  fs.mkdirSync(versionDir, { recursive: true });

  // Step 1: Download version manifest
  const manifest = await fetchJSON(VERSION_MANIFEST);
  const versionData = manifest.versions.find((v) => v.id === VERSION);
  if (!versionData) return console.error(`Version ${VERSION} not found`);

  // Step 2: Download version JSON
  const versionJSON = await fetchJSON(versionData.url);
  const jarURL = versionJSON.downloads.client.url;
  const jarPath = path.join(versionDir, `${VERSION}.jar`);
  const jsonPath = path.join(versionDir, `${VERSION}.json`);

  // Step 3: Save JAR and JSON
  await download(jarURL, jarPath);
  fs.writeFileSync(jsonPath, JSON.stringify(versionJSON, null, 2));

  console.log(`✅ Downloaded Minecraft ${VERSION}`);

  // Step 4: Get classpath
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

  for (const lib of libPaths) {
    if (!fs.existsSync(lib.path)) await download(lib.url, lib.path);
  }

  // Step 5: Build classpath
  const cp = libPaths
    .map((l) => l.path)
    .concat([jarPath])
    .join(path.delimiter);

  // Step 6: Launch Java process
  const args = [
    "-Xmx2G",
    "-cp",
    cp,
    versionJSON.mainClass,
    "--username",
    "OfflinePlayer",
    "--version",
    VERSION,
    "--gameDir",
    MINECRAFT_DIR,
    "--assetsDir",
    path.join(MINECRAFT_DIR, "assets"),
    "--assetIndex",
    versionJSON.assets,
    "--uuid",
    "00000000-0000-0000-0000-000000000000",
    "--accessToken",
    "0",
    "--userType",
    "legacy",
  ];

  const child = spawn("java", args);
  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));
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

main();
