#!/usr/bin/env node
// Schreibt build-info.json: Version, `git describe` (z. B. v1.1.0-3-gdd745e6 =
// drei Commits nach 1.1.0), Commit, Branch und Bauzeitpunkt — damit man am
// laufenden Server erkennt, welcher Stand dort läuft.
//
// Läuft überall, wo gebaut wird: deploy.sh vor dem rsync, der CI-Workflow vor
// `docker build`, und im Dockerfile als Fallback (dort gibt es kein git — eine
// vorhandene Datei bleibt dann unverändert).
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ziel = path.join(wurzel, "build-info.json");
const pkg = JSON.parse(fs.readFileSync(path.join(wurzel, "package.json"), "utf8"));

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: wurzel, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

const beschreibung = git("describe --tags --dirty --always");

if (!beschreibung) {
  if (fs.existsSync(ziel)) {
    const vorhanden = JSON.parse(fs.readFileSync(ziel, "utf8"));
    console.log(`build-info.json bleibt: ${vorhanden.beschreibung}`);
  } else {
    const info = { version: pkg.version, beschreibung: `v${pkg.version}`, commit: "unbekannt", branch: "", gebautAm: new Date().toISOString() };
    fs.writeFileSync(ziel, JSON.stringify(info, null, 2) + "\n");
    console.log(`build-info.json ohne git-Angaben: ${info.beschreibung}`);
  }
  process.exit(0);
}

const info = {
  version: pkg.version,
  beschreibung,
  commit: git("rev-parse --short HEAD"),
  branch: git("rev-parse --abbrev-ref HEAD"),
  gebautAm: new Date().toISOString(),
};
fs.writeFileSync(ziel, JSON.stringify(info, null, 2) + "\n");
console.log(`build-info.json: ${info.beschreibung} (${info.branch})`);
