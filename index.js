const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function getAllClientJarLinks() {
  const manifestURL = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
  const manifest = await fetchJSON(manifestURL);

  const versions = manifest.versions.slice(0, 1000); // You can increase this limit
  const results = [];

  for (const version of versions) {
    try {
      const meta = await fetchJSON(version.url);
      const client = meta.downloads?.client?.url;

      if (client) {
        results.push({
          version: version.id,
          url: client
        });
      }
    } catch (e) {
      console.error(`Error fetching ${version.id}:`, e.message);
    }
  }

  //console.log(JSON.stringify(results, null, 2))
  return (JSON.stringify(results, null, 2))
}


const fs = require('node:fs');

async function writeToFile() {
  try {
    const content = await getAllClientJarLinks();
    fs.writeFile('test.txt', content, err => {
      if (err) {
        console.error(err);
      } else {
        console.log('File written successfully');
      }
    });
  } catch (error) {
    console.error('Error getting client jar links:', error);
  }
}

writeToFile();
