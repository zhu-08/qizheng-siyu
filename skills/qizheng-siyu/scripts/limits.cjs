// qizheng-siyu 1.0.0 | QZSY-20261118-7DE98D1C7FF0B5DF | LICENSE.md applies to licensable original content.
'use strict';

const { computeTransformations } = require('./transformations.cjs');

// 洞微行限采用约取节月，顶星按同络宫内度计算。
const FIXED_TERM_DAYS = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7];
const PERIOD_YEARS = [10, 11, 15, 8, 7, 11, 4.5, 4.5, 4.5, 5, 5];
const CHILD_PALACE_STEPS = [0, 1, 7, 6, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const TRINES = ['寅午戌', '亥卯未', '申子辰', '巳酉丑'];
const SIGNS = '戌酉申未午巳辰卯寅丑子亥';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const EXTRA_BODIES = '计罗炁孛';
const CUSP_EPS = 1e-8;
const AGE_EPS = 1e-9;

function mod(number, divisor) {
  return number - Math.floor(number / divisor) * divisor;
}

function limitCalendar(localDateTime) {
  const [year, month, day] = localDateTime.slice(0, 10).split('-').map(Number);
  // 公历年初至约取立春以前都在上年丑月槽。
  if (month === 1 || (month === 2 && day < FIXED_TERM_DAYS[1])) {
    return { year: year - 1, month: 12 };
  }
  const slot = month - (day >= FIXED_TERM_DAYS[month - 1] ? 1 : 2);
  return { year, month: slot };
}

function nominalDate(position) {
  const year = Math.floor(position + CUSP_EPS);
  const month = Math.round((position - year) * 12);
  if (month >= 12) return { year: year + 1, month: 1 };
  return { year, month: Math.max(1, month) };
}

function nominalAge(birthYear, calendar) {
  return calendar.year - birthYear + 1 + calendar.month / 12;
}

function periodMansions(period, describe) {
  const { cusp, startAge, endAge } = period;
  const segments = [];
  let cursor = cusp;
  while (cursor > cusp - 30 + CUSP_EPS) {
    const inside = cursor - CUSP_EPS;
    const position = describe(inside);
    const next = Math.max(cusp - 30, inside - position.mansionDegree);
    segments.push({
      mansion: position.mansion,
      mansionRuler: position.mansionRuler,
      startAge: startAge + (cusp - cursor) / 30 * (endAge - startAge),
      endAge: startAge + (cusp - next) / 30 * (endAge - startAge),
      startLongitude: mod(cursor, 360),
      endLongitude: mod(next, 360),
    });
    cursor = next;
  }
  return segments;
}

function makePeriods(natal, birthYear, birthAge, exitAge, describe) {
  let endAge = birthAge;
  return natal.houses.map((house, index) => {
    const startAge = endAge;
    endAge = index === 0 ? exitAge : startAge + PERIOD_YEARS[index - 1];
    const start = nominalDate(birthYear + startAge - 1);
    const end = nominalDate(birthYear + endAge - 1);
    const cusp = house.startLongitude + 30;
    const mansionSegments = periodMansions({ cusp, startAge, endAge }, describe);
    return {
      house: house.name,
      sign: house.sign,
      ruler: house.ruler,
      startAge,
      endAge,
      startYear: start.year,
      startMonth: start.month,
      endYear: end.year,
      endMonth: end.month,
      startLongitude: mod(cusp, 360),
      endLongitude: house.startLongitude,
      startMansion: mansionSegments[0].mansion,
      endMansion: mansionSegments.at(-1).mansion,
      mansionSegments,
    };
  });
}

function activePeriod(periods, age, describe) {
  const period = periods.find(candidate => age < candidate.endAge - AGE_EPS);
  if (!period) return null;
  const cusp = period.endLongitude + 30;
  const elapsed = Math.max(0, age - period.startAge);
  const travelled = Math.min(30, 30 * elapsed / (period.endAge - period.startAge));
  const signDegree = 30 - travelled;
  const position = describe(cusp - travelled);
  return {
    ...position,
    house: period.house,
    sign: period.sign,
    signDegree,
    signRuler: period.ruler,
    roundedSignDegree: Math.round(signDegree * 100) / 100,
    startAge: period.startAge,
    endAge: period.endAge,
  };
}

function topStars(bodies, current) {
  if (!current) return [];
  const matches = [];
  for (const body of bodies) {
    const gap = Math.abs(body.signDegree - current.roundedSignDegree);
    const gapDegrees = Math.min(gap, 30 - gap);
    if (gapDegrees <= 1) {
      const { name, sign, house, signDegree } = body;
      matches.push({ name, sign, house, signDegree, gapDegrees });
    }
  }
  return matches;
}

function taiSuiGroups(sign, bySign, natal, transit) {
  const group = [...TRINES.find(trine => trine.includes(sign))];
  const trines = group.filter(branch => branch !== sign);
  if (group.at(-1) === sign) trines.reverse();
  const positions = [
    ['填', sign],
    ['冲', BRANCHES[mod(BRANCHES.indexOf(sign) + 6, 12)]],
    ...trines.map(branch => ['三合', branch]),
  ];
  return {
    sign,
    houses: positions.map(([relation, branch]) => ({
      relation,
      ...bySign(branch),
      natal: natal.filter(body => body.sign === branch).map(body => body.name),
      transitExtras: transit.filter(body => body.sign === branch && EXTRA_BODIES.includes(body.name)).map(body => body.name),
    })),
  };
}

function readTarget(natal, chart, current, periods, age, exitAge) {
  const { yearGanzhi, dayGanzhi, hourBranch: targetHour } = chart.calendar;
  const yearBranch = yearGanzhi[1];
  const dayBranch = dayGanzhi[1];
  const lifeSignIndex = SIGNS.indexOf(natal.life.sign);
  const bySign = sign => ({ sign, house: natal.houses.find(house => house.sign === sign).name });
  const step = (sign, count) => bySign(SIGNS[mod(SIGNS.indexOf(sign) + count, 12)]);

  const { byStar } = computeTransformations({ ...chart.calendar, lifeSign: natal.life.sign });
  const transit = chart.bodies.map(body => {
    const { traditional, tenGod, secondary, supplementary } = byStar[body.name];
    return {
      ...body,
      house: bySign(body.sign).house,
      hua: { traditional, tenGod, secondary, supplementary: supplementary.filter(label => label === '科甲') },
    };
  });
  const moon = transit.find(body => body.name === '月');
  const virtualYear = Math.max(1, Math.floor(age + CUSP_EPS));
  const ageIndex = virtualYear - 1;
  const small = step(SIGNS[lifeSignIndex], ageIndex);
  const child = ageIndex < Math.round(exitAge) && ageIndex < CHILD_PALACE_STEPS.length
    ? step(SIGNS[lifeSignIndex], CHILD_PALACE_STEPS[ageIndex])
    : null;
  const monthlyDelta = chart.calendar.monthNumber - natal.calendar.monthNumber;
  const monthlyGeneral = BRANCHES[mod(1 - chart.calendar.monthNumber, 12)];

  return {
    localDateTime: chart.input.localDateTime,
    utcDateTime: chart.utcDateTime,
    timeZone: chart.input.timeZone,
    utcOffsetMinutes: chart.input.utcOffsetMinutes,
    yearGanzhi,
    monthBranch: chart.calendar.monthBranch,
    currentSolarTerm: chart.calendar.currentSolarTerm,
    lunarPhase: chart.lunarPhase,
    dayGanzhi,
    hourBranch: targetHour,
    nominalVirtualAge: age,
    virtualYear,
    current,
    beyondFirstCycle: age >= periods.at(-1).endAge - AGE_EPS,
    child,
    small,
    monthly: { limit: step(small.sign, monthlyDelta), general: bySign(monthlyGeneral) },
    day: { dayBranch: bySign(dayBranch), moon: bySign(moon.sign) },
    hour: {
      moonOrigin: step(moon.sign, BRANCHES.indexOf(targetHour) - BRANCHES.indexOf('酉')),
      dayOrigin: step(dayBranch, BRANCHES.indexOf('卯') - BRANCHES.indexOf(targetHour)),
    },
    top: { natal: topStars(natal.bodies, current), transit: topStars(transit, current) },
    taiSui: taiSuiGroups(yearBranch, bySign, natal.bodies, transit),
    transit,
  };
}

function computeLimits(natal, targetChart, {
  childBaseYears = 10,
  describePosition = require('./chart-core.cjs').describePosition,
} = {}) {
  if (childBaseYears !== 9 && childBaseYears !== 10) throw new RangeError('童限基数须为 9 或 10 年。');
  const sun = natal.bodies.find(body => body.name === '日');
  const birthCalendar = limitCalendar(natal.input.localDateTime);
  const birthAge = nominalAge(birthCalendar.year, birthCalendar);
  const exitAge = childBaseYears + sun.signDegree / 3 + (birthCalendar.month - 1) / 12;
  const exitDate = nominalDate(birthCalendar.year + exitAge - 1);
  const lifeSector = Math.floor(natal.life.longitude / 30);
  const describe = longitude => describePosition(mod(longitude, 360), lifeSector);
  const periods = makePeriods(natal, birthCalendar.year, birthAge, exitAge, describe);
  let target = null;
  if (targetChart) {
    if (Date.parse(targetChart.utcDateTime) < Date.parse(natal.utcDateTime)) {
      throw new RangeError('行限目标时刻早于出生时刻。');
    }
    const targetAge = nominalAge(birthCalendar.year, limitCalendar(targetChart.input.localDateTime));
    const age = Math.max(birthAge, targetAge);
    target = readTarget(natal, targetChart, activePeriod(periods, age, describe), periods, age, exitAge);
  }
  return {
    method: { name: '洞微大限', childBaseYears, calendar: '约取节月槽' },
    exit: { virtualAge: exitAge, nominalYear: exitDate.year, nominalMonth: exitDate.month },
    periods,
    target,
  };
}

function annualSampleDates(year) {
  // 每个约取节月中旬取样；年末丑月取下一公历年 1 月 15 日。
  const samples = Array.from({ length: 11 }, (_, index) => `${year}-${String(index + 2).padStart(2, '0')}-15`);
  samples.push(`${year + 1}-01-15`);
  return samples;
}

module.exports = { computeLimits, annualSampleDates };
