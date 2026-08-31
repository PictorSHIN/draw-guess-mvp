const WORD_BANK = require('../data/words.js');

const DIFFS = [
  { id: 'easy', label: '简单' },
  { id: 'mid', label: '中等' },
  { id: 'hard', label: '困难' }
];

const TIME_PRESETS = [60, 90, 120];

const TOPICS = (() => {
  const out = {};
  for (const [id, t] of Object.entries(WORD_BANK)) {
    const n = t.list.length;
    const a = Math.floor(n / 3);
    out[id] = {
      name: t.name,
      words: {
        easy: t.list.slice(0, a),
        mid: t.list.slice(a, a * 2),
        hard: t.list.slice(a * 2)
      }
    };
  }
  return out;
})();

function getWords(topicId, diffId) {
  const arr = [...TOPICS[topicId].words[diffId]];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getTopicList() {
  return Object.entries(TOPICS).map(([id, t]) => {
    const total = Object.values(t.words).reduce((s, a) => s + a.length, 0);
    return { id, name: t.name, total };
  });
}

module.exports = {
  DIFFS,
  TIME_PRESETS,
  TOPICS,
  getWords,
  getTopicList
};
