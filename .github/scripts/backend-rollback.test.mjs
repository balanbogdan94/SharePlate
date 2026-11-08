import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./backend-rollback.sh", import.meta.url));
const agentSettings = [
  {
    name: "ApplicationInsightsAgent_EXTENSION_VERSION",
    value: "~3",
    slotSetting: false,
  },
];

function harness(t, { state = "Running", settings = agentSettings } = {}) {
  const root = mkdtempSync(join(tmpdir(), "shareplate-rollback-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, "bin");
  mkdirSync(bin);
  const dll = join(root, "SharePlate.API.dll");
  writeFileSync(dll, "synthetic-previous-api-package");
  const packagePath = join(root, "previous.zip");
  execFileSync("zip", ["-j", packagePath, dll], { stdio: "ignore" });
  const log = join(root, "commands.jsonl");
  writeFileSync(log, "");
  writeFileSync(
    join(bin, "az"),
    `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const operation = args[0] === 'account' ? 'token' : args[1] === 'config' ? args[3] : args[1];
const record = { command: 'az', operation, args };
if (operation === 'set') {
  const file = args[args.indexOf('--settings') + 1];
  record.settings = JSON.parse(fs.readFileSync(file.slice(1), 'utf8'));
}
fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify(record) + '\\n');
if (operation === process.env.FAIL_AT) process.exit(1);
if (operation === 'show') console.log(JSON.stringify({ state: process.env.MOCK_STATE, scmHost: 'api.scm.azurewebsites.net' }));
if (operation === 'list') console.log(process.env.MOCK_SETTINGS);
if (operation === 'token') console.log('synthetic-access-token');
`,
    { mode: 0o755 },
  );
  writeFileSync(
    join(bin, "curl"),
    `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({ command: 'curl', args }) + '\\n');
if (process.env.FAIL_AT === 'download') process.exit(1);
const file = args[args.indexOf('--output') + 1];
if (process.env.FAIL_AT === 'invalid-zip') fs.writeFileSync(file, 'not a zip');
else fs.copyFileSync(process.env.MOCK_PACKAGE, file);
`,
    { mode: 0o755 },
  );
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    RUNNER_TEMP: root,
    AZURE_RESOURCE_GROUP: "synthetic-group",
    AZURE_WEBAPP_NAME: "synthetic-api",
    GITHUB_ACTIONS: "false",
    MOCK_LOG: log,
    MOCK_STATE: state,
    MOCK_SETTINGS: JSON.stringify(settings),
    MOCK_PACKAGE: packagePath,
    FAIL_AT: "",
  };
  return {
    root,
    backup: join(root, "shareplate-backend-rollback"),
    run: (mode, failAt = "") =>
      spawnSync("bash", [script, mode], {
        env: { ...env, FAIL_AT: failAt },
        encoding: "utf8",
      }),
    commands: () =>
      readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
  };
}

function snapshot(h) {
  const result = h.run("snapshot");
  assert.equal(result.status, 0, result.stderr);
}

function rollbackCommands(h) {
  return h
    .commands()
    .filter(
      (command) =>
        command.command === "az" &&
        !["show", "list", "token"].includes(command.operation),
    );
}

test("snapshots the actual ZIP and only the telemetry settings without printing credentials", (t) => {
  const h = harness(t);
  const result = h.run("snapshot");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    JSON.parse(readFileSync(join(h.backup, "settings.json"), "utf8")),
    agentSettings,
  );
  assert.ok(existsSync(join(h.backup, "package.zip")));
  assert.ok(!result.stdout.includes("synthetic-access-token"));
  assert.equal(rollbackCommands(h).length, 0);
  const download = h.commands().find((command) => command.command === "curl");
  assert.ok(
    download.args.includes(
      "https://api.scm.azurewebsites.net/api/zip/site/wwwroot/",
    ),
  );
});

test("restores the previous package before agent settings and deletes previously absent flags", (t) => {
  const h = harness(t);
  snapshot(h);
  const result = h.run("rollback");
  assert.equal(result.status, 0, result.stderr);
  const commands = rollbackCommands(h);
  assert.deepEqual(
    commands.map((command) => command.operation),
    ["stop", "deploy", "set", "delete", "start"],
  );
  assert.deepEqual(commands[2].settings, agentSettings);
  const deploy = commands[1].args;
  for (const [flag, expected] of [
    ["--restart", "false"],
    ["--clean", "true"],
    ["--async", "false"],
    ["--track-status", "false"],
  ]) {
    assert.equal(deploy[deploy.indexOf(flag) + 1], expected);
  }
  const deletion = commands[3].args;
  assert.deepEqual(
    deletion.slice(
      deletion.indexOf("--setting-names") + 1,
      deletion.indexOf("--output"),
    ),
    ["Telemetry__Enabled", "APPINSIGHTS_JAVASCRIPT_ENABLED"],
  );
});

test("restores a previously SDK-enabled API without re-enabling the agent", (t) => {
  const settings = [
    {
      name: "ApplicationInsightsAgent_EXTENSION_VERSION",
      value: "disabled",
      slotSetting: false,
    },
    { name: "Telemetry__Enabled", value: "true", slotSetting: false },
    {
      name: "APPINSIGHTS_JAVASCRIPT_ENABLED",
      value: "false",
      slotSetting: false,
    },
  ];
  const h = harness(t, { settings });
  snapshot(h);
  const result = h.run("rollback");
  assert.equal(result.status, 0, result.stderr);
  const commands = rollbackCommands(h);
  assert.deepEqual(
    commands.map((command) => command.operation),
    ["stop", "deploy", "set", "start"],
  );
  assert.deepEqual(
    commands.find((command) => command.operation === "set").settings,
    settings,
  );
});

test("keeps an originally stopped app stopped and removes all flags when originally absent", (t) => {
  const h = harness(t, { state: "Stopped", settings: [] });
  snapshot(h);
  assert.equal(h.run("rollback").status, 0);
  assert.deepEqual(
    rollbackCommands(h).map((command) => command.operation),
    ["stop", "deploy", "delete"],
  );
});

test("does not restore agent settings or restart if the previous package cannot be deployed", (t) => {
  const h = harness(t);
  snapshot(h);
  const result = h.run("rollback", "deploy");
  assert.notEqual(result.status, 0);
  assert.deepEqual(
    rollbackCommands(h).map((command) => command.operation),
    ["stop", "deploy"],
  );
  assert.match(result.stderr, /Rollback failed/);
});

test("does not restart if restoring telemetry settings fails", (t) => {
  const h = harness(t);
  snapshot(h);
  const result = h.run("rollback", "set");
  assert.notEqual(result.status, 0);
  assert.deepEqual(
    rollbackCommands(h).map((command) => command.operation),
    ["stop", "deploy", "set"],
  );
  assert.match(result.stderr, /Rollback failed/);
});

test("does not change binaries or settings if the API cannot be stopped", (t) => {
  const h = harness(t);
  snapshot(h);
  const result = h.run("rollback", "stop");
  assert.notEqual(result.status, 0);
  assert.deepEqual(
    rollbackCommands(h).map((command) => command.operation),
    ["stop"],
  );
  assert.match(result.stderr, /Rollback failed/);
});

test("does not restart if deleting a previously absent telemetry setting fails", (t) => {
  const h = harness(t);
  snapshot(h);
  const result = h.run("rollback", "delete");
  assert.notEqual(result.status, 0);
  assert.deepEqual(
    rollbackCommands(h).map((command) => command.operation),
    ["stop", "deploy", "set", "delete"],
  );
  assert.match(result.stderr, /Rollback failed/);
});

for (const failure of ["download", "invalid-zip"]) {
  test(`fails before any settings mutation when the snapshot has ${failure} failure`, (t) => {
    const h = harness(t);
    const result = h.run("snapshot", failure);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Deployment snapshot failed/);
    assert.equal(rollbackCommands(h).length, 0);
  });
}

test("refuses rollback without a complete snapshot", (t) => {
  const h = harness(t);
  const result = h.run("rollback");
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /complete deployment snapshot/);
  assert.equal(rollbackCommands(h).length, 0);
});

test("cleans only snapshot files, not other runner files", (t) => {
  const h = harness(t);
  snapshot(h);
  const sentinel = join(h.backup, "unrelated.txt");
  writeFileSync(sentinel, "keep");
  assert.equal(h.run("cleanup").status, 0);
  for (const file of ["package.zip", "settings.json", "site.json"]) {
    assert.ok(!existsSync(join(h.backup, file)));
  }
  assert.ok(existsSync(sentinel));
});
