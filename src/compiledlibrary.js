const Forgeinstalation = require('./Forgeinstalation');
const Forgerun = require('./Forgerun');
const registry = require('./registry');



function addprofile(name, version) {
  Forgeinstalation.main(name, version)
}

function getprofile(name) {
  if (typeof name !== 'string') {
    throw new Error('Profile name must be a string');
  }
  return profiles.find(profile => profile.name === name);
}
function removeprofile(name) {
  if (typeof name !== 'string') {
    throw new Error('Profile name must be a string');
  }
  const index = profiles.findIndex(profile => profile.name === name);
  if (index !== -1) {
    profiles.splice(index, 1);
    return true;
  }
  return false;
}
function runprofileunderclient(name) {
    Forgerun.main(name)
}
module.exports = { addprofile, runprofileunderclient };