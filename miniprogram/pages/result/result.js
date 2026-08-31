const session = require('../../utils/session.js');

Page({
  data: {
    score: 0,
    sub: '',
    reviews: [],
    empty: false
  },

  onLoad() {
    const game = session.getGame() || { results: [], scoreCorrect: 0, scoreSkip: 0 };
    const reviews = game.results.map(r => ({
      word: r.word,
      correct: r.correct,
      mark: r.correct ? '对' : '过'
    }));
    this.setData({
      score: game.scoreCorrect,
      sub: `答对 ${game.scoreCorrect} · 跳过 ${game.scoreSkip}`,
      reviews,
      empty: reviews.length === 0
    });
  },

  onAgain() {
    wx.redirectTo({ url: '/pages/prepare/prepare' });
  },

  onHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
});
