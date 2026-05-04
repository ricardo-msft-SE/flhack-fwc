const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "..", "src", "web");
const targetDir = path.join(__dirname, "..", "dist", "web");

fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Copied web assets from ${sourceDir} to ${targetDir}`);
