const { getWords } = require('../../utils/words.js');
const session = require('../../utils/session.js');
const gyro = require('../../utils/gyro.js');
const sfx = require('../../utils/sfx.js');

Page({
  data: {
    phase: 'tap',
    word: '准备中…',
    wordHint: '',
    wordPop: false,
    timeLeft: 90,
    totalTime: 90,
    timerPct: 100,
    urgent: false,
    scoreCorrect: 0,
    scoreSkip: 0,
    flashType: '',
    flashText: '',
    flashShow: false,
    noGyro: false
  },

  locked: false,
  deck: [],
  idx: 0,
  results: [],
  timerId: null,
  gyroCheckTimer: null,

  onLoad() {
    const settings = session.getSettings();
    this.setData({
      noGyro: session.getNoGyro(),
      totalTime: settings.time,
      timeLeft: settings.time,
      timerPct: 100,
      phase: 'tap'
    });
    sfx.unlock();
  },

  onShow() {
    gyro.bindGame({
      onAnswer: (correct) => this.answer(correct),
      isLocked: () => this.locked
    });
    if (this.data.phase === 'playing') {
      this.startTimerTick();
    }
  },

  onHide() {
    gyro.unbindGame();
    this.clearTimers();
  },

  onUnload() {
    gyro.unbindGame();
    gyro.stopSensor();
    this.clearTimers();
  },

  onTapStart() {
    if (this.data.phase !== 'tap') return;
    sfx.unlock();
    sfx.go();
    this.startGame();
  },

  startGame() {
    const settings = session.getSettings();
    this.deck = getWords(settings.topic, settings.diff);
    this.idx = 0;
    this.results = [];
    this.locked = false;
    gyro.resetGyroState();

    if (!this.data.noGyro) {
      this.gyroCheckTimer = setTimeout(() => {
        if (!gyro.hasData()) this.setData({ noGyro: true });
      }, 3000);
    }

    this.setData({
      phase: 'playing',
      totalTime: settings.time,
      timeLeft: settings.time,
      timerPct: 100,
      urgent: false
    });
    this.renderWord();
    this.updateScore();
    this.startTimerTick();
  },

  startTimerTick() {
    this.clearTimers();
    this.timerId = setInterval(() => {
      let timeLeft = this.data.timeLeft - 1;
      if (timeLeft <= 0) {
        this.endGame();
        return;
      }
      const urgent = timeLeft <= 10;
      if (urgent && timeLeft <= 10 && timeLeft > 0) {
        sfx.tick();
        gyro.vibrate('tick');
      }
      this.setData({
        timeLeft,
        timerPct: (timeLeft / this.data.totalTime) * 100,
        urgent
      });
    }, 1000);
  },

  renderWord() {
    if (this.idx >= this.deck.length) {
      this.endGame();
      return;
    }
    this.setData({
      word: this.deck[this.idx],
      wordHint: `第 ${this.idx + 1} / ${this.deck.length} 题`,
      wordPop: false
    });
    setTimeout(() => this.setData({ wordPop: true }), 30);
    sfx.wordFlip();
  },

  answer(correct) {
    if (this.locked || this.data.phase !== 'playing') return;
    this.locked = true;
    this.results.push({ word: this.deck[this.idx], correct });

    this.setData({
      flashType: correct ? 'correct' : 'skip',
      flashText: correct ? '答对' : '跳过',
      flashShow: true
    });
    correct ? sfx.correct() : sfx.skip();
    gyro.vibrate(correct ? 'correct' : 'skip');
    this.updateScore();

    setTimeout(() => {
      this.setData({ flashShow: false });
      this.idx += 1;
      this.renderWord();
      this.locked = false;
    }, 950);
  },

  onCorrect() { this.answer(true); },
  onSkip() { this.answer(false); },

  updateScore() {
    const scoreCorrect = this.results.filter(r => r.correct).length;
    const scoreSkip = this.results.filter(r => !r.correct).length;
    this.setData({ scoreCorrect, scoreSkip });
  },

  onQuit() {
    this.endGame();
  },

  endGame() {
    this.clearTimers();
    gyro.unbindGame();
    sfx.end();
    session.setGame({
      results: this.results,
      scoreCorrect: this.results.filter(r => r.correct).length,
      scoreSkip: this.results.filter(r => !r.correct).length
    });
    wx.redirectTo({ url: '/pages/result/result' });
  },

  clearTimers() {
    if (this.timerId) clearInterval(this.timerId);
    if (this.gyroCheckTimer) clearTimeout(this.gyroCheckTimer);
    this.timerId = null;
    this.gyroCheckTimer = null;
  }
});
