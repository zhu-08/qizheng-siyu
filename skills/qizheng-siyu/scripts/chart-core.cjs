// qizheng-siyu 1.0.0 | QZSY-20261118-7DE98D1C7FF0B5DF | LICENSE.md applies to licensable original content.
'use strict';

const astronomy = require('./vendor/astronomy.cjs');
const { computeTransformations } = require('./transformations.cjs');

astronomy.SetDeltaTFunction(astronomy.DeltaT_EspenakMeeus);

const DAY_MS = 86400000;
const UNIX_EPOCH_JD = 2440587.5;
const J2000 = 2451545;
const MIN_YEAR = 1800;
const MAX_YEAR = 2200;
const ZHENG_EPOCH_MS = Date.UTC(1300, 0, 1);
const PURPLE_EPOCH_JD = Date.UTC(1975, 2, 13, 16) / DAY_MS + UNIX_EPOCH_JD;
const DEG_TO_RAD = Math.PI / 180;
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const SIGNS = '戌酉申未午巳辰卯寅丑子亥';
const SIGN_RULERS = '火金水月日水金火木土土木';
const HOUSES = ['命宫', '相貌', '福德', '官禄', '迁移', '疾厄', '夫妻', '奴仆', '男女', '田宅', '兄弟', '财帛'];

// 每行按恩、难、仇、用排列。日月各自取曜。
const RULER_RELATIONS = {
  日: ['金水', '木炁', '土计', '火罗'],
  月: ['金水', '土计', '火罗', '木炁'],
  金: ['土计', '火罗', '木炁', '水孛'],
  木: ['水孛', '金', '土计', '火罗'],
  水: ['金', '土计', '火罗', '木炁'],
  火: ['木炁', '水孛', '金', '土计'],
  土: ['火罗', '木炁', '水孛', '金'],
};

// 郑氏星案恒星制的今宿边界，按恒星黄经自娄宿起顺列。
const MANSIONS = [
  ['娄', '金', 15.9], ['胃', '土', 26.3], ['昴', '日', 41.1], ['毕', '月', 53.2],
  ['觜', '火', 69.0], ['参', '水', 70.0], ['井', '木', 81.8], ['鬼', '金', 112.3],
  ['柳', '土', 115.2], ['星', '日', 130.5], ['张', '月', 136.4], ['翼', '火', 151.4],
  ['轸', '水', 170.1], ['角', '木', 187.2], ['亢', '金', 200.0], ['氐', '土', 208.9],
  ['房', '日', 225.2], ['心', '月', 230.6], ['尾', '火', 237.0], ['箕', '水', 255.6],
  ['斗', '木', 266.3], ['牛', '金', 290.1], ['女', '土', 298.0], ['虚', '日', 308.9],
  ['危', '月', 318.3], ['室', '火', 333.6], ['壁', '水', 349.4], ['奎', '木', 358.3],
];

const PLANETS = [
  ['日', astronomy.Body.Sun], ['月', astronomy.Body.Moon], ['金', astronomy.Body.Venus],
  ['木', astronomy.Body.Jupiter], ['水', astronomy.Body.Mercury], ['火', astronomy.Body.Mars],
  ['土', astronomy.Body.Saturn],
];

// 阳历月份对应十二节的回归黄经，不与恒星宫度混用。
const MONTH_TERMS = ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪'];
const MIDDLE_TERMS = ['大寒', '雨水', '春分', '谷雨', '小满', '夏至', '大暑', '处暑', '秋分', '霜降', '小雪', '冬至'];
const MONTH_BRANCHES = '丑寅卯辰巳午未申酉戌亥子';
const MOON_PHASE_LABELS = ['朔附近', '蛾眉月', '上弦附近', '盈凸月', '望附近', '亏凸月', '下弦附近', '残月'];

const PLANET_SPEED_BANDS = {
  金: [1.205, 1.011, 1.240], 木: [0.177, 0.087, 0.218], 水: [1.510, 0.908, 1.801],
  火: [0.649, 0.515, 0.741], 土: [0.089, 0.039, 0.116],
};
const SIGN_STATUS = {
  日: '午垣午庙巳旺戌旺午乐辰乐寅喜',
  月: '未垣戌庙酉旺未乐卯喜亥喜',
  金: '酉垣辰垣酉庙辰庙午旺亥旺酉乐辰乐巳喜寅怒',
  木: '寅垣亥垣亥庙未旺寅乐亥乐未喜子怒',
  水: '申垣巳垣午庙申旺巳旺子旺申乐巳乐辰喜戌怒',
  火: '卯垣戌垣卯庙丑旺卯乐申喜丑喜酉怒',
  土: '丑垣子垣丑庙子庙辰旺卯旺丑乐子乐午喜巳怒',
  计: '巳庙亥庙卯旺寅旺戌旺卯乐子喜',
  罗: '午庙寅庙卯旺戌喜',
  炁: '申庙丑旺亥旺戌喜',
  孛: '未庙巳旺寅旺子乐酉乐亥喜',
};

function modulo(value, period) {
  return value - Math.floor(value / period) * period;
}

function angleDifference(to, from) {
  return modulo(to - from + 180, 360) - 180;
}

function midnightMilliseconds(year, monthIndex, day = 1) {
  const midnight = new Date(0);
  midnight.setUTCFullYear(year, monthIndex, day);
  return midnight.getTime();
}

function parseInput(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('请提供含当地出生时间和 UTC 偏移的排盘参数。');
  }
  const { localDateTime, utcOffsetMinutes, longitude, latitude, timeZone, nodeConvention = 'jiNorth' } = input;
  const match = typeof localDateTime === 'string' && /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localDateTime);
  if (!match) throw new TypeError('出生时间须为当地公历 YYYY-MM-DDTHH:mm[:ss]。');
  const [year, month, day, hour, minute, second] = match.slice(1).map(part => Number(part ?? 0));
  const localMidnightMs = midnightMilliseconds(year, month - 1, day);
  const midnight = new Date(localMidnightMs);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`出生民用年份须在 ${MIN_YEAR} 至 ${MAX_YEAR} 年之间。`);
  }
  if (midnight.getUTCFullYear() !== year || midnight.getUTCMonth() !== month - 1 ||
      midnight.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) {
    throw new RangeError('出生日期或时间超出公历范围。');
  }
  const offsetSeconds = utcOffsetMinutes * 60;
  if (!Number.isFinite(utcOffsetMinutes) || Math.abs(utcOffsetMinutes) > 14 * 60 ||
      Math.abs(offsetSeconds - Math.round(offsetSeconds)) > 1e-7) {
    throw new RangeError('必须提供出生时实际 UTC 偏移（以分钟为单位，可精确到秒，−14:00 至 +14:00）。');
  }
  if (longitude !== undefined || latitude !== undefined) {
    if (!Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
        !Number.isFinite(latitude) || Math.abs(latitude) > 90) {
      throw new RangeError('经纬度应同时提供，东经和北纬为正，取值分别为 −180° 至 180°、−90° 至 90°。');
    }
  }
  if (nodeConvention !== 'jiNorth' && nodeConvention !== 'luoNorth') {
    throw new RangeError('交点约定须为 jiNorth（计北罗南）或 luoNorth（计南罗北）。');
  }
  const civilMs = localMidnightMs + ((hour * 60 + minute) * 60 + second) * 1000;
  return { civilMs, hour, localMidnightMs, nodeConvention, utcOffsetMinutes, offsetMs: Math.round(offsetSeconds) * 1000, longitude, latitude, timeZone };
}

function zhengAyanamsha(localMidnightMs) {
  const years = (localMidnightMs - ZHENG_EPOCH_MS) / DAY_MS / 365.25;
  return 4 + years * (50.290966 / 3600);
}

function extraLongitudes(julianDayUtc, nodeConvention) {
  const centuries = (julianDayUtc - J2000) / 36525;
  const elongation = (297.8501921 + 445267.1114034 * centuries) * DEG_TO_RAD;
  const sunAnomaly = (357.5291092 + 35999.0502909 * centuries) * DEG_TO_RAD;
  const moonAnomaly = (134.9633964 + 477198.8675055 * centuries) * DEG_TO_RAD;
  const latitudeArgument = (93.2720950 + 483202.0175233 * centuries) * DEG_TO_RAD;
  const meanNode = 125.0445479 - 1934.1362891 * centuries + 0.0020754 * centuries ** 2;
  const nodeCorrection =
    -1.2740 * Math.sin(moonAnomaly) + 0.6583 * Math.sin(2 * elongation) - 0.1869 * Math.sin(sunAnomaly)
    - 0.0598 * Math.sin(2 * moonAnomaly) - 0.0571 * Math.sin(2 * elongation - moonAnomaly)
    + 0.0531 * Math.sin(2 * elongation + moonAnomaly) + 0.0460 * Math.sin(2 * elongation - sunAnomaly)
    + 0.0412 * Math.sin(moonAnomaly - sunAnomaly) - 0.0348 * Math.sin(2 * latitudeArgument)
    - 0.0305 * Math.sin(2 * elongation + sunAnomaly);
  const north = modulo(meanNode + nodeCorrection, 360);
  const south = modulo(north + 180, 360);

  return {
    计: nodeConvention === 'jiNorth' ? north : south,
    罗: nodeConvention === 'jiNorth' ? south : north,
    炁: modulo(230.5 + (360 / 10227.1792) * (julianDayUtc - PURPLE_EPOCH_JD), 360),
    孛: modulo(83.3532465 + 4069.0137287 * centuries - 0.01032 * centuries ** 2 + 180, 360),
  };
}

function planetLongitude(body, time) {
  if (body === astronomy.Body.Moon) return astronomy.EclipticGeoMoon(time).lon;
  return astronomy.Ecliptic(astronomy.GeoVector(body, time, true)).elon;
}

function signIndex(longitude) {
  return Math.floor(longitude / 30);
}

function mingLongitude(sunLongitude, localHour) {
  // 00 点和 23 点都归子时。以卯时为零点，每过一个时辰使宫序前进一位。
  const hourBranchIndex = Math.floor((localHour + 1) / 2) % 12;
  const mingIndex = modulo(signIndex(sunLongitude) + hourBranchIndex - 3, 12);
  const longitude = mingIndex * 30 + (sunLongitude % 30);
  const end = (mingIndex + 1) * 30;
  // Floating-point addition near the upper boundary can round into the next sign.
  return longitude < end ? longitude : end - Number.EPSILON * end;
}

function describePosition(longitude, lifeSignIndex) {
  const index = signIndex(longitude);
  const [mansion, mansionRuler, mansionStart] = MANSIONS.findLast(row => row[2] <= longitude) || MANSIONS.at(-1);
  return {
    longitude,
    sign: SIGNS[index],
    signDegree: longitude - index * 30,
    signRuler: SIGN_RULERS[index],
    mansion,
    mansionDegree: modulo(longitude - mansionStart, 360),
    mansionRuler,
    house: HOUSES[modulo(lifeSignIndex - index, 12)],
  };
}

function rulerRelations(ruler) {
  const [en, nan, chou, yong] = RULER_RELATIONS[ruler];
  return { ruler, en: [...en], nan: [...nan], chou: [...chou], yong: [...yong] };
}

function planetMotion(name, current, previous, sunLongitude) {
  const speedDegreesPerDay = angleDifference(current, previous);
  const band = PLANET_SPEED_BANDS[name];
  const retrograde = speedDegreesPerDay < 0;
  if (!band) {
    // Reference presentation marks both nodes 逆. The fitted true-node longitude can have positive daily differences.
    const pace = name === '计' || name === '罗' ? '逆' : '';
    return { speedDegreesPerDay, retrograde, stationary: false, hidden: false, pace };
  }

  const [reference, low, high] = band;
  const stationary = Math.abs(speedDegreesPerDay) <= reference * 0.1;
  const hidden = Math.abs(angleDifference(current, sunLongitude)) <= 15;
  let pace = '';
  if (stationary) pace = retrograde ? '逆留' : '留';
  else if (retrograde) pace = '逆';
  else if (speedDegreesPerDay >= high) pace = '速';
  else if (speedDegreesPerDay <= low) pace = '迟';
  return { speedDegreesPerDay, retrograde, stationary, hidden, pace };
}

function planetStatus(name, position) {
  const status = [];
  if (position.mansionRuler === name) status.push('殿');
  for (const [sign, state] of SIGN_STATUS[name].match(/../gu)) {
    if (position.sign === sign) status.push(state);
  }
  return status;
}

function termAtMonthStart(year, monthIndex) {
  const start = midnightMilliseconds(year, monthIndex);
  const end = midnightMilliseconds(year, monthIndex + 1);
  const angle = (285 + monthIndex * 30) % 360;
  const event = astronomy.SearchSunLongitude(angle, new Date(start), (end - start) / DAY_MS);
  if (!event || event.date.getTime() >= end) {
    throw new RangeError(`无法计算 ${year} 年 ${monthIndex + 1} 月的交节时刻。`);
  }
  return event;
}

function calendarAt(utcDate, civilMidnightMs, hour) {
  const year = utcDate.getUTCFullYear();
  let monthIndex = utcDate.getUTCMonth();
  let term = termAtMonthStart(year, monthIndex);
  let termYear = year;
  if (utcDate < term.date) {
    if (monthIndex === 0) termYear -= 1;
    monthIndex = modulo(monthIndex - 1, 12);
    term = termAtMonthStart(termYear, monthIndex);
  }
  const lichunYear = monthIndex === 0 ? termYear - 1 : termYear;
  const yearCycle = modulo(lichunYear - 4, 60);
  const monthNumber = monthIndex === 0 ? 12 : monthIndex;
  const monthBranch = MONTH_BRANCHES[monthIndex];
  const monthStem = STEMS[(2 * ((yearCycle % 10) % 5) + monthNumber + 1) % 10];
  const hourBranchIndex = Math.floor((hour + 1) / 2) % 12;
  const dayCycle = modulo(civilMidnightMs / DAY_MS + UNIX_EPOCH_JD + 0.5 + 49, 60);
  const hourStem = STEMS[(2 * (dayCycle % 5) + hourBranchIndex) % 10];
  const middleAngle = (300 + monthIndex * 30) % 360;
  const middleTerm = astronomy.SearchSunLongitude(middleAngle, term, 20);
  if (!middleTerm) throw new RangeError('无法计算当前月令的中气。');
  const afterMiddle = utcDate >= middleTerm.date;

  return {
    yearGanzhi: STEMS[yearCycle % 10] + BRANCHES[yearCycle % 12],
    monthGanzhi: monthStem + monthBranch,
    dayGanzhi: STEMS[dayCycle % 10] + BRANCHES[dayCycle % 12],
    hourGanzhi: hourStem + BRANCHES[hourBranchIndex],
    monthBranch,
    monthNumber,
    hourBranch: BRANCHES[hourBranchIndex],
    traditionalDayBirth: hourBranchIndex >= 3 && hourBranchIndex <= 8,
    solarTerm: MONTH_TERMS[monthIndex],
    solarTermStartUtc: term.date.toISOString(),
    currentSolarTerm: afterMiddle ? MIDDLE_TERMS[monthIndex] : MONTH_TERMS[monthIndex],
    currentSolarTermStartUtc: (afterMiddle ? middleTerm : term).date.toISOString(),
  };
}

function lunarPhaseAt(time) {
  const elongationDegrees = astronomy.MoonPhase(time);
  const index = Math.floor((elongationDegrees + 22.5) / 45) % MOON_PHASE_LABELS.length;
  return {
    label: MOON_PHASE_LABELS[index],
    elongationDegrees,
    illuminatedFraction: astronomy.Illumination(astronomy.Body.Moon, time).phase_fraction,
  };
}

function localTimestampFormatter(timeZone, offsetMs) {
  if (timeZone == null) return date => new Date(date.getTime() + offsetMs).toISOString().slice(0, 19);
  const fixed = /^([+-])(\d{2}):(\d{2})$/.exec(timeZone);
  if (fixed) {
    const [, sign, hours, minutes] = fixed;
    const fixedOffsetMs = (Number(hours) * 60 + Number(minutes)) * 60000 * (sign === '-' ? -1 : 1);
    if (Number(minutes) > 59 || fixedOffsetMs !== offsetMs) throw new RangeError('固定时区与出生当时的 UTC 偏移不匹配。');
    return date => new Date(date.getTime() + fixedOffsetMs).toISOString().slice(0, 19);
  }
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone, calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  return date => {
    const { year, month, day, hour, minute, second } = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  };
}

function solarEventOnDate(observer, direction, start, end, localDay, localTimestamp) {
  let cursor = start;
  while (cursor < end) {
    const event = astronomy.SearchRiseSet(astronomy.Body.Sun, observer, direction, new Date(cursor), (end - cursor) / DAY_MS);
    if (!event) return null;
    const local = localTimestamp(event.date);
    if (local.startsWith(localDay)) return { date: event.date, local };
    cursor = event.date.getTime() + 1000;
  }
  return null;
}

function horizonEvents(input, utcDate, localTimestamp) {
  if (input.longitude === undefined) return { sunriseLocal: null, sunsetLocal: null, dayBirth: null };
  const observer = new astronomy.Observer(input.latitude, input.longitude, 0);
  const approxStart = input.localMidnightMs - input.offsetMs;
  const localDay = localTimestamp(utcDate).slice(0, 10);
  // Search adjacent UTC days so a civil offset change at midnight cannot drop a local event.
  const start = approxStart - DAY_MS;
  const end = approxStart + 2 * DAY_MS;
  const rise = solarEventOnDate(observer, +1, start, end, localDay, localTimestamp);
  const set = solarEventOnDate(observer, -1, start, end, localDay, localTimestamp);
  let dayBirth = null;
  if (rise && set) {
    dayBirth = rise.date < set.date
      ? utcDate >= rise.date && utcDate < set.date
      : utcDate >= rise.date || utcDate < set.date;
  }
  return { sunriseLocal: rise?.local ?? null, sunsetLocal: set?.local ?? null, dayBirth };
}

function compute(input) {
  const birth = parseInput(input);
  const utcDate = new Date(birth.civilMs - birth.offsetMs);
  const civilIso = new Date(birth.civilMs).toISOString().slice(0, 19);
  const localTimestamp = localTimestampFormatter(birth.timeZone, birth.offsetMs);
  if (localTimestamp(utcDate) !== civilIso) throw new RangeError('该时区与出生当时的 UTC 偏移不匹配。');
  const julianDayUtc = utcDate.getTime() / DAY_MS + UNIX_EPOCH_JD;
  const time = astronomy.MakeTime(utcDate);
  const yesterday = time.AddDays(-1);
  const ayanamshaDegrees = zhengAyanamsha(birth.localMidnightMs);
  const tropical = Object.fromEntries(PLANETS.map(([name, planet]) => [name, planetLongitude(planet, time)]));
  const previous = Object.fromEntries(PLANETS.map(([name, planet]) => [name, planetLongitude(planet, yesterday)]));
  Object.assign(tropical, extraLongitudes(julianDayUtc, birth.nodeConvention));
  Object.assign(previous, extraLongitudes(julianDayUtc - 1, birth.nodeConvention));

  const lifeLongitude = mingLongitude(modulo(tropical.日 - ayanamshaDegrees, 360), birth.hour);
  const lifeSignIndex = signIndex(lifeLongitude);
  const life = describePosition(lifeLongitude, lifeSignIndex);
  const self = describePosition(modulo(tropical.月 - ayanamshaDegrees, 360), lifeSignIndex);
  const calendar = calendarAt(utcDate, birth.localMidnightMs, birth.hour);
  const transformations = computeTransformations({ ...calendar, lifeSign: life.sign });
  const houses = HOUSES.map((name, index) => {
    const sign = modulo(lifeSignIndex - index, 12);
    return { name, sign: SIGNS[sign], ruler: SIGN_RULERS[sign], startLongitude: sign * 30 };
  });
  const bodies = Object.entries(tropical).map(([name, tropicalLongitude]) => {
    const position = describePosition(modulo(tropicalLongitude - ayanamshaDegrees, 360), lifeSignIndex);
    return {
      name,
      tropicalLongitude,
      ...position,
      status: planetStatus(name, position),
      motion: planetMotion(name, tropicalLongitude, previous[name], tropical.日),
      hua: transformations.byStar[name],
    };
  });
  const horizon = horizonEvents(birth, utcDate, localTimestamp);

  return {
    input: {
      localDateTime: civilIso,
      utcOffsetMinutes: birth.utcOffsetMinutes,
      timeZone: birth.timeZone ?? null,
      longitude: birth.longitude ?? null,
      latitude: birth.latitude ?? null,
      nodeConvention: birth.nodeConvention,
    },
    method: {
      zodiac: '郑氏星案恒星制',
      mansions: '今宿',
      life: '太阳起生时，遇卯安命',
      self: '太阴所在',
      nodes: birth.nodeConvention === 'jiNorth' ? '计北罗南' : '计南罗北',
      ephemeris: 'Astronomy Engine',
      transformations: '生年化曜，立春换年',
    },
    utcDateTime: utcDate.toISOString(),
    julianDayUtc,
    ayanamshaDegrees,
    calendar,
    lunarPhase: lunarPhaseAt(time),
    ...horizon,
    life,
    self,
    helpers: {
      lifePalace: rulerRelations(life.signRuler),
      lifeMansion: rulerRelations(life.mansionRuler),
      selfMansion: rulerRelations(self.mansionRuler),
    },
    houses,
    bodies,
  };
}

module.exports = { compute, describePosition, extraLongitudes, mingLongitude, zhengAyanamsha };
