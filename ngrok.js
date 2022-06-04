// imports
const fs = require('fs');
const path = require('path');
const { platform } = require('os');
const { spawn } = require('child_process');

// settings
const pollInterval = 500;
const ngrokConfig = path.resolve('ngrok.yml');

// needed for spawning NGROK
let ngrokBin = '';
let ngrokDir = '';
let ngrokProc = '';
let ngrokEnabled=true;
try {
    const ext = platform() === 'win32' ? '.exe' : '';
    ngrokDir = path.dirname(require.resolve('ngrok')) + '/bin';
    ngrokProc = 'ngrok' + ext;
    ngrokBin = ngrokDir + '/' + ngrokProc;
}
catch { }

async function ensureConnection(callback) {

  if (!ngrokEnabled) return false;

  if (!fs.existsSync(ngrokConfig)) {
    console.log(`Can't run ngrok - missing ${ngrokConfig}.`);
    return false;
  }

  if (ngrokBin == '') {
    console.log("Can't run ngrok - are dev dependencies installed?");
    return false;
  }

  console.log("Ensuring ngrok...");
  const url = await connect();
  if (url == null) return false;

  callback(url);
  return true;
}

async function connect() {
  let url = await getNgrokUrl();
  if (url) {
    console.log("ngrok already running.");
    return url;
  }

  console.log("Starting ngrok...");
  await startProcess();

  while (true) {
    url = await getNgrokUrl();
    if (url) return url;
    await delay(pollInterval);
  }
}

async function getNgrokUrl() {
    const axios = require('axios');
    const ping = 'http://127.0.0.1:4040/api/tunnels';
    let url = "";
    try {
        const response = await axios.get(ping);
        url = response.data.tunnels[0].public_url;
        if (url.startsWith("http://")) {
            url = "https://" + url.substr("http://".length);
        }
    }
    catch (ex) {
        return null;
    }
    try {
        await axios.get(url);
    }
    catch (ex) {
        if (ex && ex.response && ex.response.status == "402") {
            console.log("Killing expired tunnel...");
            stopProcess();
            await delay(2000);
            return null;
        }
    }
    return url;
}

function startProcess() {
  const start = ['start', '-config=' + ngrokConfig, "app"];
  const proc = spawn(ngrokBin, start, { cwd: ngrokDir, detached: true });
  proc.unref();
}

function stopProcess() {
    const fkill = require('fkill');
    fkill(ngrokProc, { force: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.ensureConnection = ensureConnection;
module.exports.getNgrokUrl = getNgrokUrl;