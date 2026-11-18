#!/usr/bin/env node
// qizheng-siyu 1.0.0 | QZSY-20261118-7DE98D1C7FF0B5DF | LICENSE.md applies to licensable original content.
'use strict';

const { parseArgs } = require('node:util');
const path = require('node:path');
const { compute } = require('./chart-core.cjs');
const { annualSampleDates, computeLimits } = require('./limits.cjs');

const { release, releaseLabel, verifyRelease } = require('./release-info.cjs');
const { matchInput } = require('./input-rules.cjs');
const { getInstallation } = require('./installation-info.cjs');

function installationInfo() {
  return getInstallation({ skillRoot: path.resolve(__dirname, '..'), distributionId: release.distributionId });
}

const HELP = `七政四余本命排盘｜郑氏星案恒星制

node scripts/chart.cjs --birth "2000-01-01T06:00" --tz Asia/Shanghai

  --birth   公历出生地民用钟表时间，YYYY-MM-DDTHH:mm[:ss]
  --tz      IANA 时区（如 Asia/Shanghai）或出生当时的 UTC 偏移（如 +08:00）
  --lon     出生地经度，东正西负；与纬度同时填写时附日出日落
  --lat     出生地纬度，北正南负
  --nodes   ji-north（默认，计北罗南）或 luo-north（计南罗北）
  --at      查询行限和流曜的公历钟表时间，格式同 --birth
  --year    查询节气年的十二节月中旬样点，1800–2199，与 --at 二选一
  --at-tz   查询时间的时区或 UTC 偏移，默认沿用 --tz
  --child-base  洞微童限基数，10（默认）或 9
  --format  markdown（默认）或 json
  --help    显示帮助
  --version 显示版本及发布标记
  --verify  核对发布文件的 SHA-256 清单及 Ed25519 签名
  --trusted-key  验签时使用作者另行提供的公钥 SHA-256 指纹
  --match-input  检查简短输入的快捷规则

负偏移或坐标可用等号传入，例如 --tz=-05:00 --lon=-74.01。`;

const options = {
  birth: { type: 'string' },
  tz: { type: 'string' },
  lon: { type: 'string' },
  lat: { type: 'string' },
  nodes: { type: 'string', default: 'ji-north' },
  at: { type: 'string' },
  year: { type: 'string' },
  'at-tz': { type: 'string' },
  'child-base': { type: 'string', default: '10' },
  format: { type: 'string', default: 'markdown' },
  help: { type: 'boolean' },
  version: { type: 'boolean' },
  verify: { type: 'boolean' },
  'trusted-key': { type: 'string' },
  'match-input': { type: 'string' },
};

function parseClock(value, label) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value ?? '');
  if (!match) throw new Error(`请按 YYYY-MM-DDTHH:mm[:ss] 填写公历${label}时间。`);

  const [, year, month, day, hour, minute, second = '00'] = match;
  const normalized = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  const wallTime = Date.parse(`${normalized}Z`);
  if (!Number.isFinite(wallTime) || new Date(wallTime).toISOString().slice(0, 19) !== normalized) {
    throw new Error(`${label}日期或时间无效。`);
  }

  return { normalized, wallTime };
}

function resolveOffset(timeZone, wallTime) {
  if (!timeZone) throw new Error('请提供出生地时区或出生当时的 UTC 偏移。');

  const fixed = /^([+-])(\d{2}):(\d{2})$/.exec(timeZone);
  if (fixed) {
    const hours = Number(fixed[2]);
    const minutes = Number(fixed[3]);
    const total = hours * 60 + minutes;
    if (minutes > 59 || total > 14 * 60) throw new Error('UTC 偏移超出 ±14:00 范围。');
    return (fixed[1] === '-' ? -1 : 1) * total;
  }
  if (/^[+-]/.test(timeZone)) throw new Error('UTC 偏移请使用 ±HH:MM 格式。');

  let formatter;
  try {
    formatter = new Intl.DateTimeFormat('en', {
      timeZone,
      timeZoneName: 'longOffset',
    });
  } catch {
    throw new Error('时区无效，请输入 IANA 时区或 ±HH:MM。');
  }

  function offsetAt(instant) {
    const label = formatter.formatToParts(instant).find(part => part.type === 'timeZoneName').value;
    if (label === 'GMT') return 0;
    const parts = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(label);
    if (!parts) throw new Error('当前 Node.js 无法读取该时区的 UTC 偏移。');
    const [, direction, hours, minutes, seconds = '0'] = parts;
    return (direction === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes) + Number(seconds) / 60);
  }

  // Nearby offsets expose both sides of DST transitions. Round-trip candidates through the named zone.
  const candidates = new Set();
  for (let hours = -48; hours <= 48; hours += 6) {
    candidates.add(offsetAt(wallTime + hours * 3_600_000));
  }
  const matches = [...candidates].filter(offset => offsetAt(wallTime - offset * 60_000) === offset);
  if (matches.length === 0) {
    throw new Error('该钟表时间在指定时区不存在，请核对出生记录与夏令时。');
  }
  if (matches.length > 1) {
    throw new Error('该钟表时间在指定时区出现两次，请确认出生当时的 UTC 偏移后用 ±HH:MM 重试。');
  }
  return matches[0];
}

function coordinate(value, limit, label) {
  if (value === undefined) return undefined;
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) || Math.abs(Number(value)) > limit) {
    throw new Error(`${label}必须是 −${limit} 至 ${limit} 的十进制度数。`);
  }
  return Number(value);
}

function chartAt(when, timeZone, nodeConvention, options = {}) {
  const clock = parseClock(when, options.label || '查询');
  return compute({
    localDateTime: clock.normalized,
    utcOffsetMinutes: resolveOffset(timeZone, clock.wallTime),
    timeZone,
    nodeConvention,
    longitude: options.longitude,
    latitude: options.latitude,
  });
}

function main() {
  const { values } = parseArgs({ options, strict: true });
  if (values['match-input'] !== undefined) {
    process.stdout.write(`${JSON.stringify(matchInput(values['match-input']))}\n`);
    return;
  }
  if (values.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  if (values.version) {
    process.stdout.write(`${releaseLabel(installationInfo())}\n`);
    return;
  }
  if (values.verify) {
    const result = verifyRelease({ trustedKeyFingerprint: values['trusted-key'] });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
    return;
  }
  if (values['trusted-key'] !== undefined) throw new Error('--trusted-key 需要与 --verify 一起使用。');
  const formats = ['json', 'markdown'];
  if (!formats.includes(values.format)) throw new Error('--format 只接受 json 或 markdown。');
  const nodeOptions = new Map([['ji-north', 'jiNorth'], ['luo-north', 'luoNorth']]);
  if (!nodeOptions.has(values.nodes)) throw new Error('--nodes 只接受 ji-north 或 luo-north。');
  const nodeConvention = nodeOptions.get(values.nodes);

  const longitude = coordinate(values.lon, 180, '经度');
  const latitude = coordinate(values.lat, 90, '纬度');
  if ((longitude === undefined) !== (latitude === undefined)) {
    throw new Error('提供经纬度时请同时填写 --lon 和 --lat。');
  }

  if (values.at !== undefined && values.year !== undefined) throw new Error('--at 和 --year 二选一。');
  if (values['at-tz'] !== undefined && values.at === undefined && values.year === undefined) {
    throw new Error('--at-tz 需要与 --at 或 --year 一起使用。');
  }
  if (!['9', '10'].includes(values['child-base'])) throw new Error('--child-base 只接受 9 或 10。');
  const limitOptions = { childBaseYears: Number(values['child-base']) };
  const installation = installationInfo();
  const chart = chartAt(values.birth, values.tz, nodeConvention, {
    label: '出生', longitude, latitude,
  });
  const targetZone = values['at-tz'] ?? values.tz;
  const target = values.at === undefined ? null : chartAt(values.at, targetZone, nodeConvention);
  chart.limits = computeLimits(chart, target, limitOptions);
  if (values.year !== undefined) {
    const year = Number(values.year);
    if (!/^\d{4}$/.test(values.year) || year < 1800 || year > 2199) {
      throw new Error('--year 只接受 1800–2199 年。');
    }
    const samples = annualSampleDates(year)
      .map(date => chartAt(`${date}T12:00`, targetZone, nodeConvention))
      .filter(sample => sample.utcDateTime >= chart.utcDateTime)
      .map(sample => computeLimits(chart, sample, limitOptions).target);
    if (!samples.length) throw new Error('该节气年没有出生后的中旬样点。可用 --at 查询具体时间。');
    chart.limits.annual = { year, timeZone: targetZone, samples };
  }
  chart.installation = installation;
  const output = values.format === 'json'
    ? JSON.stringify(chart, null, 2)
    : require('./format-chart.cjs').markdown(chart);
  process.stdout.write(`${output}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`排盘失败：${error.message}\n`);
  process.exitCode = 1;
}
