const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { InstallationRegistry } = require('./registry');
const MINECRAFT_DIR = path.join(__dirname, '..', '.minecraft');
//const PROFILE_NAME = 'name'; // Change this to your actual profile name

async function main(PROFILE_NAME) {
  const registry = new InstallationRegistry();

  // Use registry to get the installation paths by profile name
  const install = registry.pullInstallation(PROFILE_NAME);
  if (!install || !install.jarPath || !install.jsonPath) {
    return console.error(`❌ Could not find installation for profile: ${PROFILE_NAME}`);
  }

  // Ensure files exist
  if (!fs.existsSync(install.jarPath)) {
    return console.error(`Missing JAR file: ${install.jarPath}`);
  }
  if (!fs.existsSync(install.jsonPath)) {
    return console.error(`Missing JSON file: ${install.jsonPath}`);
  }

  // Load version JSON
  const versionJSON = JSON.parse(fs.readFileSync(install.jsonPath, 'utf-8'));

  // Collect valid library paths
  const libPaths = versionJSON.libraries
    .filter(lib => !lib.rules || lib.rules.every(rule => rule.action === 'allow'))
    .map(lib => {
      const artifact = lib.downloads?.artifact;
      if (!artifact) return null;
      return path.join(MINECRAFT_DIR, 'libraries', artifact.path.replace(/\//g, path.sep));
    })
    .filter(p => p && fs.existsSync(p));

  // Build classpath
  const cp = libPaths.concat([install.jarPath]).join(path.delimiter);

  // Launch Java process
  const args = [
    '-Xmx2G',
    '-cp', cp,
    versionJSON.mainClass,
    '--username', 'OfflinePlayer',
    '--version', versionJSON.id,
    '--gameDir', MINECRAFT_DIR,
    '--assetsDir', path.join(MINECRAFT_DIR, 'assets'),
    '--assetIndex', versionJSON.assets,
    '--uuid', '00000000-0000-0000-0000-000000000000',
    '--accessToken', '0',
    '--userType', 'legacy'
  ];

  const child = spawn('java', args);
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
}

module.exports = { main };