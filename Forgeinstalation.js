const minecraftlauncher = require("./Encoderdecoder")
const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");

const skibs = require("./index")
const selected = minecraftlauncher.selectMinecraftVersion()
skibs.downloadMinecraft(selected)