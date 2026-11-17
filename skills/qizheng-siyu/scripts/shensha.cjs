'use strict';

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const LONGITUDE_PALACES = '戌酉申未午巳辰卯寅丑子亥';
const YEARS = Array.from({ length: 60 }, (_, index) => STEMS[index % 10] + BRANCHES[index % 12]);

// 每个规则的落宫依年干、年支、节月支或六十甲子顺序记录。

const YEAR_STEM_MARKS = [
  ['禄勋', '寅卯巳午巳午申酉亥子'],
  ['天贵', '未申酉亥丑子丑寅卯巳'],
  ['玉贵', '丑子亥酉未申未午巳卯'],
  ['天厨', '巳午子巳午申寅午酉亥'],
  ['文昌', '巳午申酉申酉亥戌寅卯'],
  ['刃', '卯辰午未午未酉戌子丑'],
  ['飞刃', '酉戌子丑子丑卯辰午未'],
  ['国印', '戌亥丑寅丑寅辰巳未申'],
  ['红艳', '午申寅未辰辰戌酉子申'],
  ['流霞', '酉戌未申巳午辰卯亥寅'],
  ['学堂', '亥午寅酉寅酉巳子申卯'],
  ['福贵', '寅丑子酉申未午巳辰卯'],
  ['官贵', '酉申子亥卯寅午巳午巳'],
];

const YEAR_BRANCH_MARKS = [
  ['岁驾', '子丑寅卯辰巳午未申酉戌亥'],
  ['红鸾', '卯寅丑子亥戌酉申未午巳辰'],
  ['天喜', '酉申未午巳辰卯寅丑子亥戌'],
  ['卷舌', '酉戌亥子丑寅卯辰巳午未申'],
  ['死符', '巳午未申酉戌亥子丑寅卯辰'],
  ['大耗', '午未申酉戌亥子丑寅卯辰巳'],
  ['三刑', '卯戌巳午辰申午丑寅酉未亥'],
  ['六害', '未午巳辰卯寅丑子亥戌酉申'],
  ['孤辰', '寅寅巳巳巳申申申亥亥亥寅'],
  ['寡宿', '戌戌丑丑丑辰辰辰未未未戌'],
  ['劫杀', '巳寅亥申巳寅亥申巳寅亥申'],
  ['亡神', '亥申巳寅亥申巳寅亥申巳寅'],
  ['的杀', '巳丑酉巳丑酉巳丑酉巳丑酉'],
  ['大杀', '申酉戌巳午未寅卯辰亥子丑'],
  ['咸池', '酉午卯子酉午卯子酉午卯子'],
  ['天雄', '申酉戌亥子丑寅卯辰巳午未'],
  ['地雌', '寅卯辰巳午未申酉戌亥子丑'],
  ['五鬼', '辰巳午未申酉戌亥子丑寅卯'],
  ['贯索', '卯辰巳午未申酉戌亥子丑寅'],
  ['天空', '丑寅卯辰巳午未申酉戌亥子'],
  ['天狗', '戌亥子丑寅卯辰巳午未申酉'],
  ['蓦越', '亥子丑寅卯辰巳午未申酉戌'],
  ['天厄', '未申酉戌亥子丑寅卯辰巳午'],
  ['天哭', '午巳辰卯寅丑子亥戌酉申未'],
  ['披头', '辰卯寅丑子亥戌酉申未午巳'],
  ['血刃', '戌酉申未午巳辰卯寅丑子亥'],
  ['黄幡', '辰丑未戌辰丑未戌辰丑未戌'],
  ['豹尾', '戌未辰丑戌未辰丑戌未辰丑'],
  ['驿马', '寅亥申巳寅亥申巳寅亥申巳'],
  ['华盖', '辰丑戌未辰丑戌未辰丑戌未'],
  ['地解', '未未申申酉酉戌戌亥亥午午'],
  ['将星', '子酉午卯子酉午卯子酉午卯'],
  ['岁合', '丑子亥戌酉申未午巳辰卯寅'],
  ['灾杀', '午卯子酉午卯子酉午卯子酉'],
  ['天杀', '未辰丑戌未辰丑戌未辰丑戌'],
  ['地杀', '申巳寅亥申巳寅亥申巳寅亥'],
  ['板鞍', '丑戌未辰丑戌未辰丑戌未辰'],
  ['吞陷', '戌寅丑戌辰卯寅寅戌戌寅寅'],
];

const MONTH_BRANCH_MARKS = [
  ['月廉', '午未申酉戌亥子丑寅卯辰巳'],
  ['月杀', '申酉戌巳午未寅卯辰亥子丑'],
  ['月符', '辰巳午未申酉戌亥子丑寅卯'],
  ['天耗', '申戌子寅辰午申戌子寅辰午'],
  ['地耗', '巳未酉亥丑卯巳未酉亥丑卯'],
  ['注受', '寅丑子亥戌酉戌亥子丑寅卯'],
];

const YEAR_CYCLE_MARKS = [
  ['岁殿', '子寅辰午申戌子寅辰午戌子寅辰午申戌子寅辰申戌子寅辰午申戌子寅午申戌子寅辰午申戌子辰午申戌子寅辰午申戌寅辰午申戌子寅辰午申'],
  ['游奕', '午辰寅丑亥酉午辰寅亥酉午辰寅子亥酉午辰丑亥酉午辰寅子戌酉午卯丑亥酉午辰酉子戌酉巳卯丑亥酉午辰寅子戌午辰卯丑亥酉午辰寅子酉'],
  ['擎天', '子戌申未巳卯子戌申巳卯子戌申午巳卯子戌未巳卯子戌申午辰卯子酉未巳卯子戌申午辰卯亥酉未巳卯子戌申午辰子戌酉未巳卯子戌申午卯'],
  ['孤虚', '辰巳辰巳辰巳辰巳辰巳寅卯寅卯寅卯寅卯寅卯子丑子丑子丑子丑子丑戌亥戌亥戌亥戌亥戌亥申酉申酉申酉申酉申酉午未午未午未午未午未'],
  ['空亡', '戌亥戌亥戌亥戌亥戌亥申酉申酉申酉申酉申酉午未午未午未午未午未辰巳辰巳辰巳辰巳辰巳寅卯寅卯寅卯寅卯寅卯子丑子丑子丑子丑子丑'],
];

const ALIASES = {
  飞刃: ['唐符'],
  地雌: ['丧门'],
  贯索: ['勾神'],
  五鬼: ['年符'],
  死符: ['小耗'],
  大耗: ['阑干'],
  天厄: ['紫微'],
  天雄: ['白虎'],
  卷舌: ['绞杀', '天德'],
  天狗: ['吊客'],
  蓦越: ['病符'],
  的杀: ['破碎'],
  咸池: ['桃花'],
  大杀: ['飞廉'],
  岁驾: ['剑锋', '伏尸'],
  天空: ['太阳'],
  血刃: ['浮沉', '解神'],
};

const NATAL_SHOW = new Set([
  '劫杀,文昌,禄勋,大耗,月杀,咸池,唐符,天厨,伏尸,三刑,勾神,蓦越',
  '黄幡,的杀,孤辰,天喜,注受,剑锋,飞廉,病符,紫微,华盖,天贵,六害',
  '孤虚,游奕,年符,死符,地雌,卷舌,绞杀,天德,贯索,亡神,国印,岁殿',
  '卦气,空亡,豹尾,擎天,天空,大杀,天厄,月廉,天雄,天哭,天狗,地耗',
  '月符,披头,红鸾,岁驾,小耗,寡宿,飞刃,天耗,斗杓,驿马,阳刃,阴刃',
  '阑干,玉贵,血刃,浮沉,解神,长生,养,胎,绝,墓,死,病',
  '衰,帝旺,临官,冠带,沐浴',
].join(',').split(','));

const TRANSIT_SHOW = new Set([
  '岁驾,天空,地雌,贯索,五鬼,死符,大耗,天厄,天雄,大杀,卷舌,天德',
  '天狗,蓦越,亡神,天喜,披头,血刃,解神,天哭,地解,劫杀,的杀,红鸾',
  '驿马,游奕,擎天,黄幡,豹尾,天厨,三刑,六害,咸池,阳刃,禄勋,天贵',
].join(',').split(','));

const DIVINATION_START = '亥申寅酉子午卯巳亥申';

const DIVINATION_PALACE = '寅卯巳午巳午申酉亥子';

const GROWTH_PALACES = '酉申未午巳辰卯寅丑子亥戌';

const GROWTH_NAMES = ['长生', '养', '胎', '绝', '墓', '死', '病', '衰', '帝旺', '临官', '冠带', '沐浴'];

const GROWTH_START = { 金: 4, 木: 10, 水: 1, 土: 1, 火: 7 };

const NAYIN_ELEMENTS = '金火木土金火水土金木水土火木水金火木土金火水土金木水土火木水';

function computeShensha({ calendar, sunSign, moonSign, houses, scope = 'natal', dayBirth, includeAll = false }) {
  if (scope !== 'natal' && scope !== 'transit') throw new RangeError('神煞盘别须为本命或流年。');
  const { yearGanzhi, monthBranch, hourBranch, traditionalDayBirth } = calendar;
  const yearIndex = YEARS.indexOf(yearGanzhi);
  const monthIndex = BRANCHES.indexOf(monthBranch);
  const hourIndex = BRANCHES.indexOf(hourBranch);
  if (yearIndex < 0 || monthIndex < 0 || hourIndex < 0) throw new RangeError('神煞需要有效的年干支、月支和时支。');

  const show = scope === 'transit' ? TRANSIT_SHOW : NATAL_SHOW;
  const bySign = Object.fromEntries([...BRANCHES].map(sign => [sign, new Set()]));

  function add(name, sign) {
    if (includeAll || show.has(name)) bySign[sign].add(name);
    for (const alias of ALIASES[name] || []) {
      if (includeAll || show.has(alias)) bySign[sign].add(alias);
    }
  }

  const stemIndex = yearIndex % 10;
  for (const [name, placements] of YEAR_STEM_MARKS) {
    const label = name === '刃' ? (stemIndex % 2 === 0 ? '阳刃' : '阴刃') : name;
    add(label, placements[stemIndex]);
  }
  for (const [table, index] of [
    [YEAR_BRANCH_MARKS, yearIndex % 12],
    [MONTH_BRANCH_MARKS, monthIndex],
    [YEAR_CYCLE_MARKS, yearIndex],
  ]) {
    for (const [name, placements] of table) add(name, placements[index]);
  }

  add('斗杓', BRANCHES[(monthIndex + hourIndex + 2) % 12]);

  const lightSign = (dayBirth ?? traditionalDayBirth) ? sunSign : moonSign;
  const lightIndex = LONGITUDE_PALACES.indexOf(lightSign);
  if (lightIndex >= 0) {
    const startIndex = LONGITUDE_PALACES.indexOf(DIVINATION_START[stemIndex]);
    const gap = (lightIndex - startIndex + 12) % 12;
    add('卦气', DIVINATION_PALACE[(stemIndex + gap) % 10]);
  }

  const growthIndex = GROWTH_START[NAYIN_ELEMENTS[Math.floor(yearIndex / 2)]];
  for (const [offset, name] of GROWTH_NAMES.entries()) {
    add(name, GROWTH_PALACES[(growthIndex + offset) % 12]);
  }

  const layout = houses ?? [...BRANCHES].map(sign => ({ sign, name: null }));
  return layout.map(({ sign, name }) => ({ sign, house: name, names: [...bySign[sign]] }));
}

module.exports = { computeShensha };
