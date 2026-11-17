'use strict';

const BODY_NAMES = {
  日: '太阳', 月: '太阴', 金: '金星', 木: '木星', 水: '水星', 火: '火星', 土: '土星',
  计: '计都', 罗: '罗睺', 炁: '紫炁', 孛: '月孛',
};

function localClock(value) {
  return value.replace('T', ' ');
}

function offsetLabel(minutes) {
  const secs = Math.round(Math.abs(minutes) * 60);
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0');
  const mm = String(Math.floor(secs / 60) % 60).padStart(2, '0');
  const ss = secs % 60;
  return `UTC${minutes < 0 ? '-' : '+'}${hh}:${mm}${ss ? ':' + String(ss).padStart(2, '0') : ''}`;
}

function angle(value) {
  // Truncate display precision so a value below a cusp never prints at the cusp.
  return `${(Math.floor(value * 10000) / 10000).toFixed(4)}°`;
}

function mansionText(position) {
  return `${position.mansion}${position.mansionRuler} ${angle(position.mansionDegree)}`;
}

function phaseText(phase) {
  return `${phase.label}，照明 ${(phase.illuminatedFraction * 100).toFixed(1)}%`;
}

function pointRow(label, position) {
  return `| ${label} | ${position.house} | ${position.sign} ${angle(position.signDegree)} | ${mansionText(position)} | ${position.signRuler} | ${position.mansionRuler} |`;
}

function labels(items) {
  return items.join('、') || '—';
}

function helperRow(label, relation) {
  return `| ${label} | ${relation.ruler} | ${labels(relation.en)} | ${labels(relation.nan)} | ${labels(relation.chou)} | ${labels(relation.yong)} |`;
}

function bodyRow(body) {
  const motion = (body.motion.hidden ? '伏' : '') + body.motion.pace;
  const status = labels([...body.status, motion].filter(Boolean));
  const { traditional, tenGod, secondary, supplementary } = body.hua;
  const hua = labels([...traditional, ...secondary, ...supplementary]);
  return `| ${BODY_NAMES[body.name]} | ${angle(body.longitude)} | ${body.sign} ${angle(body.signDegree)} | ${mansionText(body)} | ${body.house} | ${status} | ${hua} | ${labels(tenGod)} |`;
}

function bodyTable(bodies) {
  return [
    '| 星曜 | 恒星黄经 | 地支宫与宫内度 | 所躔宿度 | 人事宫 | 庙垣与行态 | 化曜 | 年化十神 |',
    '| --- | ---: | --- | --- | --- | --- | --- | --- |',
    ...bodies.map(bodyRow),
  ];
}

function signAndHouse(position) {
  return `${position.sign}·${position.house}`;
}

function timingRows(limits) {
  const { method, exit, periods, target, annual } = limits;
  const lines = [
    '',
    '## 洞微大限',
    '',
    `采用 ${method.childBaseYears} 年童限基数。出童限约 ${exit.virtualAge.toFixed(2)} 虚岁，名义节月 ${exit.nominalYear} 年第 ${exit.nominalMonth} 月槽。`,
    '',
    '| 宫限 | 地支 | 名义虚岁区间 | 起讫名义节月槽 | 宿序 |',
    '| --- | --- | --- | --- | --- |',
    ...periods.map(period => {
      const ages = `${period.startAge.toFixed(2)}–${period.endAge.toFixed(2)}`;
      const dates = `${period.startYear}/${period.startMonth}–${period.endYear}/${period.endMonth}`;
      return `| ${period.house} | ${period.sign} | ${ages} | ${dates} | ${period.mansionSegments.map(segment => segment.mansion).join(' → ')} |`;
    }),
  ];
  if (annual) {
    lines.push(
      '',
      `## ${annual.year} 节气年行限样点`,
      '',
      `以下为 ${annual.timeZone} 各节月中旬的代表时刻。宫度交界按所问日期另查。`,
      '',
      '| 取样日期 | 宫限与度限 | 本命顶星 | 小限 | 月限 | 太岁宫流年神煞 |',
      '| --- | --- | --- | --- | --- | --- |',
      ...annual.samples.map(sample => {
        const current = sample.current ? `${signAndHouse(sample.current)} · ${mansionText(sample.current)}` : '超出首轮';
        const top = labels(sample.top.natal.map(body => BODY_NAMES[body.name]));
        const shensha = labels(sample.shensha.find(row => row.sign === sample.taiSui.sign).names);
        return `| ${sample.localDateTime.slice(0, 10)} | ${current} | ${top} | ${signAndHouse(sample.small)} | ${signAndHouse(sample.monthly.limit)} | ${shensha} |`;
      }),
    );
  }
  if (!target) return lines;

  const zone = target.timeZone && !/^[+-]/.test(target.timeZone) ? ` ${target.timeZone}` : '';
  lines.push(
    '',
    '## 所问时刻行限',
    '',
    `**时刻**　${localClock(target.localDateTime)} ${offsetLabel(target.utcOffsetMinutes)}${zone} · ${target.yearGanzhi}年 ${target.monthBranch}月 ${target.dayGanzhi}日 ${target.hourBranch}时`,
    `**最近交节／中气**　${target.currentSolarTerm}　**月相**　${phaseText(target.lunarPhase)}`,
    `**宫限和度限**　${target.current ? `${signAndHouse(target.current)}，宫内 ${angle(target.current.signDegree)}，${mansionText(target.current)}` : '该时刻超出首轮十二宫大限'}`,
    `**童限宫**　${target.child ? signAndHouse(target.child) : '—'}　**小限**　${signAndHouse(target.small)}　**月限**　${signAndHouse(target.monthly.limit)}　**月将**　${signAndHouse(target.monthly.general)}`,
    `**流日查宫**　日支 ${signAndHouse(target.day.dayBranch)}、月位 ${signAndHouse(target.day.moon)}　**流时查宫**　月位起 ${signAndHouse(target.hour.moonOrigin)}、日位起 ${signAndHouse(target.hour.dayOrigin)}`,
    `**本命顶星**　${labels(target.top.natal.map(body => BODY_NAMES[body.name]))}　**当时流曜顶星**　${labels(target.top.transit.map(body => BODY_NAMES[body.name]))}`,
    '',
    '### 太岁填冲',
    '',
    '| 关系 | 本命宫 | 本命星 | 流四余 |',
    '| --- | --- | --- | --- |',
    ...target.taiSui.houses.map(house => `| ${house.relation} | ${signAndHouse(house)} | ${labels(house.natal.map(name => BODY_NAMES[name]))} | ${labels(house.transitExtras.map(name => BODY_NAMES[name]))} |`),
    '',
    '### 流年神煞',
    '',
    '| 本命地支宫 | 流年神煞 |',
    '| --- | --- |',
    ...target.shensha.map(row => `| ${signAndHouse(row)} | ${labels(row.names)} |`),
    '',
    '### 流曜落本命宫',
    '',
    ...bodyTable(target.transit),
  );
  return lines;
}

function markdown(chart) {
  const { input, method, calendar, lunarPhase, life, self, helpers, houses, bodies, shensha } = chart;
  const shenshaBySign = Object.fromEntries(shensha.map(row => [row.sign, row.names]));
  const zone = /^[+-]/.test(input.timeZone) ? '' : ` ${input.timeZone}`;
  const lines = [
    '# 七政四余本命盘',
    '',
    `**盘制**　${method.zodiac} · ${method.life} · ${method.nodes}`,
    `**出生钟表时间**　${localClock(input.localDateTime)} ${offsetLabel(input.utcOffsetMinutes)}${zone}`,
    `**四柱**　${calendar.yearGanzhi}年 · ${calendar.monthGanzhi}月（${calendar.solarTerm}起） · ${calendar.dayGanzhi}日 · ${calendar.hourGanzhi}时 · 时支${calendar.traditionalDayBirth ? '昼' : '夜'}生`,
    `**最近交节／中气**　${calendar.currentSolarTerm}　**月相**　${phaseText(lunarPhase)}`,
  ];
  if (input.longitude !== null) {
    const eventTime = value => value ? localClock(value) : '当日无事件';
    lines.push(`**实地日出／日落**　${eventTime(chart.sunriseLocal)} ／ ${eventTime(chart.sunsetLocal)}`);
  }
  lines.push(
    '',
    '| 命身 | 人事宫 | 地支宫与宫内度 | 所躔宿度 | 宫主 | 度主 |',
    '| --- | --- | --- | --- | --- | --- |',
    pointRow('命度', life),
    pointRow('身度', self),
    '',
    '## 恩难仇用',
    '',
    '| 所取太极 | 主曜 | 恩 | 难 | 仇 | 用 |',
    '| --- | --- | --- | --- | --- | --- |',
    helperRow('命宫主', helpers.lifePalace),
    helperRow('命度主', helpers.lifeMansion),
    helperRow('身度主', helpers.selfMansion),
    '',
    '## 七政四余',
    '',
    ...bodyTable(bodies),
    '',
    '## 十二人事宫',
    '',
    '| 人事宫 | 地支宫 | 宫主 | 守宫星 | 本命神煞 |',
    '| --- | --- | --- | --- | --- |',
    ...houses.map(house => {
      const occupants = bodies.filter(body => body.house === house.name)
        .sort((a, b) => a.signDegree - b.signDegree)
        .map(body => BODY_NAMES[body.name]);
      return `| ${house.name} | ${house.sign} | ${house.ruler} | ${labels(occupants)} | ${labels(shenshaBySign[house.sign])} |`;
    }),
  );
  if (chart.limits) lines.push(...timingRows(chart.limits));
  return lines.join('\n');
}

module.exports = { markdown };
