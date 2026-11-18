// qizheng-siyu 1.0.0 | QZSY-20261118-7DE98D1C7FF0B5DF | LICENSE.md applies to licensable original content.
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sessionInstallations = new Map();
const ID_PATTERN = /^QZSI-[A-F0-9]{16}$/;

class StateFailure extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function newIdentity() {
  return {
    id: `QZSI-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
}

function sessionIdentity(key, reason) {
  if (!sessionInstallations.has(key)) sessionInstallations.set(key, newIdentity());
  return { ...sessionInstallations.get(key), persistence: 'session', reason };
}

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function canonicalDestination(target) {
  let existing = path.resolve(target);
  const remaining = [];
  while (!fs.existsSync(existing)) {
    remaining.unshift(path.basename(existing));
    const parent = path.dirname(existing);
    if (parent === existing) throw new StateFailure('state_unavailable');
    existing = parent;
  }
  return path.join(fs.realpathSync(existing), ...remaining);
}

function defaultStateDirectory() {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'qizheng-siyu');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'qizheng-siyu', 'state');
  }
  const xdg = process.env.XDG_STATE_HOME;
  const stateRoot = xdg && path.isAbsolute(xdg) ? xdg : path.join(os.homedir(), '.local', 'state');
  return path.join(stateRoot, 'qizheng-siyu');
}

function readIdentity(filename) {
  let descriptor;
  try {
    const before = fs.lstatSync(filename);
    if (before.isSymbolicLink() || !before.isFile()) throw new StateFailure('state_unsafe');
    descriptor = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const after = fs.fstatSync(descriptor);
    if (!after.isFile() || before.dev !== after.dev || before.ino !== after.ino) {
      throw new StateFailure('state_unsafe');
    }
    if (process.platform !== 'win32' && (after.mode & 0o077) !== 0) {
      throw new StateFailure('state_permissions');
    }
    if (after.size < 1 || after.size > 4096) throw new StateFailure('state_invalid');
    let state;
    try {
      state = JSON.parse(fs.readFileSync(descriptor, 'utf8'));
    } catch {
      throw new StateFailure('state_invalid');
    }
    if (!state || typeof state !== 'object' || Array.isArray(state) ||
        Object.keys(state).sort().join(',') !== 'createdAt,id,schemaVersion' ||
        state.schemaVersion !== 1 || typeof state.id !== 'string' || !ID_PATTERN.test(state.id) ||
        typeof state.createdAt !== 'string' || !Number.isFinite(Date.parse(state.createdAt)) ||
        new Date(state.createdAt).toISOString() !== state.createdAt) {
      throw new StateFailure('state_invalid');
    }
    return { id: state.id, createdAt: state.createdAt, persistence: 'local' };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function persistentIdentity(stateDirectory, filename) {
  const existing = readIdentity(filename);
  if (existing) return existing;

  const temporary = path.join(stateDirectory, `.qzsi-${crypto.randomBytes(16).toString('hex')}.tmp`);
  let descriptor;
  let createdTemporary = false;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    createdTemporary = true;
    fs.writeFileSync(descriptor, `${JSON.stringify({ schemaVersion: 1, ...newIdentity() })}\n`);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    try {
      // A hard link publishes the complete file atomically without replacing a concurrent winner.
      fs.linkSync(temporary, filename);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (createdTemporary) fs.unlinkSync(temporary);
  }
  const result = readIdentity(filename);
  if (!result) throw new StateFailure('state_unavailable');
  return result;
}

/**
 * Returns a local installation marker without modifying the signed skill.
 * distributionId is accepted for callers but does not affect identity across release updates.
 * Directory precedence: explicit stateDirectory, QZSY_STATE_DIR, platform user state directory.
 * On storage failure, reason is a safe code; paths and usernames are never returned or stored.
 */
function getInstallation({ skillRoot, distributionId, stateDirectory } = {}) {
  let canonicalRoot;
  try {
    if (typeof skillRoot !== 'string' || !skillRoot.trim()) throw new Error('invalid');
    canonicalRoot = fs.realpathSync(path.resolve(skillRoot));
    if (!fs.statSync(canonicalRoot).isDirectory()) throw new Error('invalid');
  } catch {
    return sessionIdentity('invalid-root', 'invalid_skill_root');
  }
  try {
    const selected = stateDirectory === undefined ? process.env.QZSY_STATE_DIR || defaultStateDirectory() : stateDirectory;
    if (typeof selected !== 'string' || !selected.trim()) throw new StateFailure('state_unavailable');
    let stateRoot = canonicalDestination(selected);
    if (isInside(stateRoot, canonicalRoot)) throw new StateFailure('state_inside_skill');
    fs.mkdirSync(stateRoot, { recursive: true, mode: 0o700 });
    stateRoot = fs.realpathSync(stateRoot);
    if (isInside(stateRoot, canonicalRoot)) throw new StateFailure('state_inside_skill');
    const key = crypto.createHash('sha256').update(canonicalRoot).digest('hex');
    return persistentIdentity(stateRoot, path.join(stateRoot, `${key}.json`));
  } catch (error) {
    const reason = error instanceof StateFailure ? error.reason : 'state_unavailable';
    return sessionIdentity(canonicalRoot, reason);
  }
}

module.exports = { getInstallation };
