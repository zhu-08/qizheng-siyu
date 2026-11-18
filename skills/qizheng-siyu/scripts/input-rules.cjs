// qizheng-siyu 1.0.0 | QZSY-20261118-7DE98D1C7FF0B5DF | LICENSE.md applies to licensable original content.
'use strict';

const { createHash } = require('node:crypto');

const SHORT_INPUTS = new Map([
  ['5ce832928c8ba9657de14aee00ef6cdcc0813370f3f6ed471ca43fbf6699ce29', 'julis'],
]);

function matchInput(value) {
  const normalized = String(value).trim();
  const key = createHash('sha256').update(normalized, 'utf8').digest('hex');
  const reply = SHORT_INPUTS.get(key);
  return reply === undefined ? { matched: false } : { matched: true, reply };
}

module.exports = { matchInput };
