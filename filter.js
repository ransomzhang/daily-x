const fs = require('fs');
const tweets = JSON.parse(fs.readFileSync('tweets_raw.json', 'utf8')).tweets;

// Filter and translate keywords - more precise
const keywords = ['Trump', 'China', 'Iran', 'Israel', 'Ukraine', 'AI', 'Tariff', 'Tech', 'Stock', 'Market', 'Economy', 'Trade War', 'Taiwan'];
const filteredTweets = tweets.filter(t => {
  const content = t.content.toLowerCase();
  return keywords.some(k => content.includes(k.toLowerCase()));
});

// Translation map - more precise replacements
const translations = {
  'Trump': '特朗普',
  'Donald Trump': '特朗普',
  'China': '中国',
  'Chinese': '中国人',
  'Iran': '伊朗',
  'Iranian': '伊朗',
  'Israel': '以色列',
  'Israeli': '以色列',
  'Ukraine': '乌克兰',
  'Ukrainian': '乌克兰',
  'Zelenskiy': '泽连斯基',
  'Putin': '普京',
  'Biden': '拜登',
  'Taiwan': '台湾',
  'NWSL': '美国女子职业足球联赛',
  'Cubs': '小熊队',
  'Nationals': '国民队',
  'Cardinals': '红雀队',
  'Rays': '光芒队',
  'Oilers': '油人队',
  'Ducks': '鸭队',
  'Spurs': '马刺',
  'Bucks': '雄鹿',
  'Rockets': '火箭',
  'Pelicans': '鹈鹕',
  'Knicks': '尼克斯',
  'Thunder': '雷霆',
  'Trail Blazers': '开拓者',
  'Wizards': '奇才',
  'Denver Summit': '丹佛 Summit',
  'Washington Spirit': '华盛顿 Spirit',
  'Empower Field': 'Empower Field',
  'Reuters': '路透社',
  'The Economist': '经济学人',
  'The Wall Street Journal': '华尔街日报',
  'Forbes': '福布斯',
  'The New York Times': '纽约时报',
  'Yahoo News': '雅虎新闻',
  'Bloomberg': '彭博社',
  'The Athletic': 'The Athletic',
  'WSJ': '华尔街日报'
};

function translateText(text) {
  let translated = text;
  // Sort by length descending to avoid partial matches
  const sorted = Object.keys(translations).sort((a, b) => b.length - a.length);
  for (const eng of sorted) {
    const zh = translations[eng];
    // Use word boundary for single words, exact match for phrases
    if (eng.length > 3) {
      translated = translated.replace(new RegExp(eng, 'gi'), zh);
    } else {
      translated = translated.replace(new RegExp('\\b' + eng + '\\b', 'gi'), zh);
    }
  }
  return translated;
}

const translatedTweets = filteredTweets.map(t => ({
  ...t,
  content: translateText(t.content)
}));

fs.writeFileSync('tweets_filtered.json', JSON.stringify(translatedTweets, null, 2));
console.log(`Filtered from ${tweets.length} to ${translatedTweets.length} tweets`);