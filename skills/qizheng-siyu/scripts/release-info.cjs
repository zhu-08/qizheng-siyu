// qizheng-siyu 1.0.0 | QZSY-20261118-7DE98D1C7FF0B5DF | LICENSE.md applies to licensable original content.
'use strict';

const { createHash, createPublicKey, verify } = require('node:crypto');
const { lstatSync, readFileSync, readdirSync, realpathSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const EXCLUDED_FILES = new Set(['release-manifest.json', 'release-signature.json']);
const HEX_DIGEST = /^[0-9a-f]{64}$/i;

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJson(relative) {
  return JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
}

function regularFile(relative) {
  if (typeof relative !== 'string' || relative.length === 0 || relative.includes('\\') ||
      relative.includes('\0') || relative.split('/').some(part => part === '' || part === '.' || part === '..')) {
    throw new Error('发布清单包含无效文件路径。');
  }
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(root + path.sep)) throw new Error('发布清单包含越界文件路径。');
  let cursor = root;
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error('发布文件包含符号链接。');
  }
  if (!lstatSync(absolute).isFile()) throw new Error('发布清单中的项目不是普通文件。');
  if (!realpathSync(absolute).startsWith(realpathSync(root) + path.sep)) {
    throw new Error('发布文件解析到技能目录之外。');
  }
  return absolute;
}

function installedFiles(directory = root, prefix = '') {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('技能目录包含符号链接。');
    if (entry.isDirectory()) files.push(...installedFiles(path.join(directory, entry.name), relative + '/'));
    else if (entry.isFile()) files.push(relative);
    else throw new Error('技能目录包含非普通文件。');
  }
  return files;
}

function fingerprintValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new TypeError('可信公钥指纹须为 SHA-256 十六进制字符串。');
  const normalized = value.replace(/^sha256:/i, '').toLowerCase();
  if (!HEX_DIGEST.test(normalized)) throw new TypeError('可信公钥指纹须为 64 位 SHA-256 十六进制字符串。');
  return normalized;
}

function verifyRelease({ trustedKeyFingerprint } = {}) {
  const trustedFingerprint = fingerprintValue(trustedKeyFingerprint);
  const result = {
    checkedFiles: 0,
    valid: false,
    fileMismatches: [],
    mismatches: [],
    signatureValid: false,
    keyFingerprintSha256: null,
    trustedKeyMatched: trustedFingerprint === null ? null : false,
    errors: [],
  };
  try {
    regularFile('release.json');
    const currentRelease = readJson('release.json');
    for (const field of ['name', 'version', 'distributionId', 'releasedOn', 'license', 'licenseFile', 'publicKeyFingerprintSha256']) {
      if (Object.hasOwn(currentRelease, field)) result[field] = currentRelease[field];
    }
    const manifestBytes = readFileSync(regularFile('release-manifest.json'));
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const signature = JSON.parse(readFileSync(regularFile('release-signature.json'), 'utf8'));
    if (typeof currentRelease.version !== 'string' || typeof currentRelease.distributionId !== 'string' ||
        manifest.version !== currentRelease.version || manifest.distributionId !== currentRelease.distributionId) {
      throw new Error('发布清单与版本标记不一致。');
    }
    if (manifest.sha256 === null || typeof manifest.sha256 !== 'object' || Array.isArray(manifest.sha256) ||
        Object.keys(manifest.sha256).length === 0) throw new Error('文件摘要清单无效。');
    if (!Object.hasOwn(manifest.sha256, 'release.json') || !Object.hasOwn(manifest.sha256, 'release-public-key.pem')) {
      throw new Error('文件摘要清单缺少版本或公钥文件。');
    }
    for (const [relative, expected] of Object.entries(manifest.sha256)) {
      if (EXCLUDED_FILES.has(relative) || typeof expected !== 'string' || !HEX_DIGEST.test(expected)) {
        throw new Error('文件摘要清单包含无效项目。');
      }
      result.checkedFiles += 1;
      try {
        const actual = digest(readFileSync(regularFile(relative)));
        if (actual !== expected.toLowerCase()) result.fileMismatches.push(relative);
      } catch {
        result.fileMismatches.push(relative);
      }
    }
    for (const relative of installedFiles()) {
      if (!EXCLUDED_FILES.has(relative) && !Object.hasOwn(manifest.sha256, relative)) result.fileMismatches.push(relative);
    }
    const publicKey = createPublicKey(readFileSync(regularFile('release-public-key.pem')));
    if (publicKey.asymmetricKeyType !== 'ed25519') throw new Error('签名公钥类型须为 Ed25519。');
    const keyFingerprint = digest(publicKey.export({ type: 'spki', format: 'der' }));
    result.keyFingerprintSha256 = keyFingerprint;
    result.trustedKeyMatched = trustedFingerprint === null ? null : keyFingerprint === trustedFingerprint;
    if (currentRelease.publicKeyFingerprintSha256 !== undefined &&
        currentRelease.publicKeyFingerprintSha256 !== keyFingerprint) {
      throw new Error('版本文件中的公钥指纹不匹配。');
    }
    if (signature.algorithm !== 'Ed25519' || signature.keyFingerprintSha256 !== keyFingerprint ||
        signature.manifestSha256 !== digest(manifestBytes) || typeof signature.signature !== 'string') {
      throw new Error('签名说明与发布清单或公钥不匹配。');
    }
    const bytes = Buffer.from(signature.signature, 'base64');
    if (bytes.length !== 64 || bytes.toString('base64') !== signature.signature) throw new Error('数字签名格式无效。');
    result.signatureValid = verify(null, manifestBytes, publicKey, bytes);
    if (!result.signatureValid) result.errors.push('数字签名校验失败。');
    if (result.trustedKeyMatched === false) result.errors.push('公钥与指定的可信指纹不匹配。');
    result.valid = result.signatureValid && result.fileMismatches.length === 0 && result.trustedKeyMatched !== false;
  } catch (error) {
    result.errors.push(error.message);
  }
  result.mismatches = result.fileMismatches;
  return result;
}

let release;
try {
  release = readJson('release.json');
} catch {
  release = {};
}

function releaseLabel(installation) {
  const localMarker = installation?.id
    ? ` · ${installation.id}${installation.persistence === 'session' ? '（本次运行）' : ''}`
    : '';
  return `qizheng-siyu ${release.version || '未知版本'} · ${release.distributionId || '未知发布标记'}${localMarker} · 个人非商业使用`;
}

module.exports = { release, releaseLabel, verifyRelease };
