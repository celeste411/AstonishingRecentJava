
//decodes the number to the version and encodes the version to the number
// launcher.js or // versionSelector.js

const https = require("https");
const readline = require("readline");

const VERSION_MANIFEST = "https://launchermeta.mojang.com/mc/game/version_manifest.json";

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
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

function displayVersionList(versions, limit = 20) {
  const releaseVersions = versions.filter(v => v.type === "release");
  const snapshotVersions = versions.filter(v => v.type === "snapshot");

  console.log(`\n📦 RELEASE VERSIONS (${releaseVersions.length} total):`);
  releaseVersions.slice(0, limit).forEach((v, i) => {
    console.log(`${i + 1}. ${v.id} (${v.releaseTime.split("T")[0]})`);
  });

  console.log(`\n🔬 SNAPSHOT VERSIONS (${snapshotVersions.length} total):`);
  snapshotVersions.slice(0, limit).forEach((v, i) => {
    console.log(`${releaseVersions.length + i + 1}. ${v.id} (${v.releaseTime.split("T")[0]})`);
  });

  return [...releaseVersions, ...snapshotVersions];
}

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

/**
 * Launches the standalone version selector.
 * @returns {Promise<Object>} Selected version object
 */
async function selectMinecraftVersion() {
  const versions = await getAvailableVersions();
  const displayVersions = displayVersionList(versions);

  const answer = await promptUser(`\n🎮 Choose a version (1-${displayVersions.length}): `);
  const index = parseInt(answer);

  if (!isNaN(index) && index >= 1 && index <= displayVersions.length) {
    const selected = displayVersions[index - 1];
    console.log(`\n✅ You selected: ${selected.id}`);
    return selected;
  }

  console.log("❌ Invalid selection. Returning null.");
  return null;
}

module.exports = { selectMinecraftVersion };
