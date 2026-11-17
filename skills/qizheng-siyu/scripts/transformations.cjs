'use strict';

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const BODIES = [...'日月金木水火土计罗炁孛'];
const YEAR_STAR_SEQUENCE = '火孛木金土月水炁计罗';
const YIN_TEN_GOD_OFFSETS = [0, 9, 2, 1, 4, 3, 6, 5, 8, 7];
const MAJOR_TRANSFORMATIONS = [
  [0, '天禄', '比肩'], [1, '天暗', '劫财'], [2, '天福', '食神'], [3, '天耗', '伤官'],
  [4, '天荫', '偏财'], [5, '天贵', '正财'], [5, '天嗣', '正财'], [6, '天刑', '七杀'],
  [7, '天印', '正官'], [8, '天囚', '偏印'], [9, '天权', '正印'],
];
const SECONDARY_TRANSFORMATIONS = [
  '科名', '天马', '生官', '地驿', '文星', '禄元', '魁星', '马元', '官星', '印星',
  '寿元', '催官', '仁元', '禄神', '血支', '喜神', '血忌', '爵星', '产星', '伤官',
];

// 六十甲子化曜表。每行星曜依附化名目顺序排列。
const YEAR_TRANSFORMATION_STARS = {
  甲子:'木火月木罗木月木炁木金金木木木罗日土金金',
  乙丑:'木计土水计火日木水日金水木水土计土水水木',
  丙寅:'火水炁金金水罗水罗火火日火计土炁土木木月',
  丁卯:'火木水火火日计水计月火罗火罗木水月炁火土',
  戊辰:'土火罗木金水火木孛土木木土土火月木孛金炁',
  己巳:'土计计水炁日金木火罗木炁土火金土水木水水',
  庚午:'金水孛金木水木水金金土孛金金水金火水木罗',
  辛未:'金木火火土金孛水木计土土金炁日木金火火计',
  壬申:'水火金木日木炁木月水金月水日月孛金土金孛',
  癸酉:'水计木水月土水木土孛金计水月水火火金水火',
  甲戌:'木水月金罗木月水炁木火金木木金罗水金木金',
  乙亥:'木木土火计火日水水日火水木水火计木火火木',
  丙子:'火火炁木金水罗木罗火水日火计木炁日土金月',
  丁丑:'火计水水火日计木计月水罗火罗土水土水水土',
  戊寅:'土水罗金金水火水孛土土木土土土月土木木炁',
  己卯:'土木计火炁日金水火罗土炁土火木土月炁火水',
  庚辰:'金火孛木木水木木金金金孛金金火金木孛金罗',
  辛巳:'金计火水土金孛木木计金土金炁金木水木水计',
  壬午:'水水金金日木炁水月水木月水日水孛火水木孛',
  癸未:'水木木火月土水水土孛木计水月日火金火火火',
  甲申:'木火月木罗木月木炁木水金木木月罗金土金金',
  乙酉:'木计土水计火日木水日水水木水水计火金水木',
  丙戌:'火水炁金金水罗水罗火土日火计金炁水金木月',
  丁亥:'火木水火火日计水计月土罗火罗火水木火火土',
  戊子:'土火罗木金水火木孛土火木土土木月日土金炁',
  己丑:'土计计水炁日金木火罗火炁土火土土土水水水',
  庚寅:'金水孛金木水木水金金木孛金金土金土木木罗',
  辛卯:'金木火火土金孛水木计木土金炁木木月炁火计',
  壬辰:'水火金木日木炁木月水水月水日火孛木孛金孛',
  癸巳:'水计木水月土水木土孛水计水月金火水木水火',
  甲午:'木水月金罗木月水炁木金金木木水罗火水木金',
  乙未:'木木土火计火日水水日金水木水日计金火火木',
  丙申:'火火炁木金水罗木罗火火日火计月炁金土金月',
  丁酉:'火计水水火日计木计月火罗火罗水水火金水土',
  戊戌:'土水罗金金水火水孛土木木土土金月水金木炁',
  己亥:'土木计火炁日金水火罗木炁土火火土木火火水',
  庚子:'金火孛木木水木木金金土孛金金木金日土金罗',
  辛丑:'金计火水土金孛木木计土土金炁土木土水水计',
  壬寅:'水水金金日木炁水月水金月水日土孛土木木孛',
  癸卯:'水木木火月土水水土孛金计水月木火月炁火火',
  甲辰:'木火月木罗木月木炁木火金木木火罗木孛金金',
  乙巳:'木计土水计火日木水日火水木水金计水木水木',
  丙午:'火水炁金金水罗水罗火水日火计水炁火水木月',
  丁未:'火木水火火日计水计月水罗火罗日水金火火土',
  戊申:'土火罗木金水火木孛土土木土土月月金土金炁',
  己酉:'土计计水炁日金木火罗土炁土火水土火金水水',
  庚戌:'金水孛金木水木水金金金孛金金金金水金木罗',
  辛亥:'金木火火土金孛水木计金土金炁火木木火火计',
  壬子:'水火金木日木炁木月水木月水日木孛日土金孛',
  癸丑:'水计木水月土水木土孛木计水月土火土水水火',
  甲寅:'木水月金罗木月水炁木水金木木土罗土木木金',
  乙卯:'木木土火计火日水水日水水木水木计月炁火木',
  丙辰:'火火炁木金水罗木罗火土日火计火炁木孛金月',
  丁巳:'火计水水火日计木计月土罗火罗金水水木水土',
  戊午:'土水罗金金水火水孛土火木土土水月火水木炁',
  己未:'土木计火炁日金水火罗火炁土火日土金火火水',
  庚申:'金火孛木木水木木金金木孛金金月金金土金罗',
  辛酉:'金计火水土金孛木木计木土金炁水木火金水计',
  壬戌:'水水金金日木炁水月水水月水日金孛水金木孛',
  癸亥:'水木木火月土水水土孛水计水月火火木火火火'
};

// 年干与命宫支的化曜表。每行从子到亥。
const LIFE_TRANSFORMATION_STARS = {
  天元: {
    甲: '木金木金土月水炁计罗火孛',
    乙: '土月土月水炁计罗火孛木金',
    丙: '水炁水炁计罗火孛木金土月',
    丁: '计罗计罗火孛木金土月水炁',
    戊: '火孛火孛木金土月水炁计罗',
    己: '木金木金土月水炁计罗火孛',
    庚: '土月土月水炁计罗火孛木金',
    辛: '水炁水炁计罗火孛木金土月',
    壬: '计罗计罗火孛木金土月水炁',
    癸: '火孛火孛木金土月水炁计罗',
  },
  职元: {
    甲: '孛木金土月水炁计罗火孛火',
    乙: '月水炁计罗火孛木孛木金土',
    丙: '木金木金土月水炁计罗火孛',
    丁: '水炁计罗火孛木金土金土月',
    戊: '土月水炁计罗火孛木金土月',
    己: '孛木金土月水月水炁计罗火',
    庚: '月水炁水炁计罗火孛木金土',
    辛: '土月水炁计炁计罗火孛木金',
    壬: '罗火孛木金土月水炁计罗计',
    癸: '金土月水炁计罗火罗火孛木',
  },
  地元: {
    甲: '木木水水金金土土火火木木',
    乙: '水水金金土土火火木火木木',
    丙: '土火火火火木木水水金金土',
    丁: '火木木水水金金土土火土火',
    戊: '土土土火火木木水水金金土',
    己: '木木水水金金土金土土火火',
    庚: '水水金金金金土土火火木木',
    辛: '火木木水水金水金金土土火',
    壬: '水水金金土土火火木木水水',
    癸: '金金土土火火木木水木水水',
  },
  局主: {
    甲: '水炁计罗火孛木金土月水月',
    乙: '火孛木金土月水炁水炁计罗',
    丙: '炁计炁计罗火孛木金土月水',
    丁: '孛木金土月水炁计罗计罗火',
    戊: '罗火孛木金土月水炁计罗火',
    己: '水炁计罗火孛火孛木金土月',
    庚: '火孛木孛木金土月水炁计罗',
    辛: '罗火孛木金木金土月水炁计',
    壬: '土月水炁计罗火孛木金土金',
    癸: '计罗火孛木金土月土月水炁',
  },
  人元: {
    甲: '水木木火火土土金金水水水',
    乙: '木火火土土金金水水木木木',
    丙: '火土土金金水水木木火火火',
    丁: '土金金水水木木火火土土土',
    戊: '金水水木木火火土土金金金',
    己: '水木木火火土土金金水水水',
    庚: '木火火土土金金水水木木木',
    辛: '火土土金金水水木木火火火',
    壬: '土金金水水木木火火土土土',
    癸: '金水水木木火火土土金金金',
  },
  天经: {
    甲: '火火火火土土金金水水木木',
    乙: '土土土土金金水水木木火火',
    丙: '金金金金水水木木火火土土',
    丁: '水水水水木木火火土土金金',
    戊: '木木木木火火土土金金水水',
    己: '火火火火土土金金水水木木',
    庚: '土土土土金金水水木木火火',
    辛: '金金金金水水木木火火土土',
    壬: '水水水水木木火火土土金金',
    癸: '木木木木火火土土金金水水',
  },
};

const EXAM_STAR_BY_LIFE_SIGN = '日月水金火木土土木火金水';
const ADVERSITY_STAR_BY_MONTH = '金金日日月月火罗水孛木炁';
const TERRESTRIAL_STAR_BY_LIFE_SIGN = '水土木木土火火土金金土水';

function branchIndex(branch, label) {
  if (typeof branch !== 'string' || branch.length !== 1 || !BRANCHES.includes(branch)) {
    throw new RangeError(`${label}须为单个地支。`);
  }
  return BRANCHES.indexOf(branch);
}

function computeTransformations({ yearGanzhi, monthBranch, lifeSign }) {
  if (!Object.hasOwn(YEAR_TRANSFORMATION_STARS, yearGanzhi)) {
    throw new RangeError('化曜须提供有效的出生年干支。');
  }
  const lifeIndex = branchIndex(lifeSign, '命宫');
  const monthIndex = branchIndex(monthBranch, '月令');
  const yearStem = yearGanzhi[0];
  const yearIndex = STEMS.indexOf(yearStem);
  const isYinYear = yearIndex % 2 === 1;
  const byStar = Object.fromEntries(BODIES.map(body => [body, {
    traditional: [], tenGod: [], secondary: [], supplementary: [],
  }]));

  for (const [offset, traditionalName, tenGodName] of MAJOR_TRANSFORMATIONS) {
    const traditionalStar = YEAR_STAR_SEQUENCE[(yearIndex + offset) % 10];
    byStar[traditionalStar].traditional.unshift(traditionalName);
    const modernOffset = isYinYear ? YIN_TEN_GOD_OFFSETS[offset] : offset;
    const tenGodStar = YEAR_STAR_SEQUENCE[(yearIndex + modernOffset) % 10];
    const tenGod = byStar[tenGodStar].tenGod;
    if (!tenGod.includes(tenGodName)) tenGod.unshift(tenGodName);
  }

  for (const [index, label] of SECONDARY_TRANSFORMATIONS.entries()) {
    const star = YEAR_TRANSFORMATION_STARS[yearGanzhi][index];
    byStar[star].secondary.push(label);
  }

  const supplementary = [
    { label: '科甲', star: EXAM_STAR_BY_LIFE_SIGN[lifeIndex] },
    { label: '值难', star: ADVERSITY_STAR_BY_MONTH[monthIndex] },
    ...Object.entries(LIFE_TRANSFORMATION_STARS).map(([label, rows]) => ({ label, star: rows[yearStem][lifeIndex] })),
    { label: '地纬', star: TERRESTRIAL_STAR_BY_LIFE_SIGN[lifeIndex] },
  ];
  for (const { label, star } of supplementary) byStar[star].supplementary.push(label);

  return { yearGanzhi, byStar, supplementary };
}

module.exports = { computeTransformations };
