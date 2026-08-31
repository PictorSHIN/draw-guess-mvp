const { TOPICS } = require('../../utils/words.js');
const session = require('../../utils/session.js');
const sfx = require('../../utils/sfx.js');

Page({
  data: {
    topicName: ''
  },

  onLoad() {
    const { topic } = session.getSettings();
    this.setData({ topicName: TOPICS[topic]?.name || '' });
  },

  onBack() {
    wx.navigateBack();
  },

  onReady() {
    sfx.unlock();
    wx.navigateTo({ url: '/pages/game/game' });
  }
});
