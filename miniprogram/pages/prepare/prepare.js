const { TOPICS } = require('../../utils/words.js');
const session = require('../../utils/session.js');
const gyro = require('../../utils/gyro.js');
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

  async onReady() {
    sfx.unlock();
    const ok = await gyro.startSensor();
    session.setNoGyro(!ok);
    if (ok) {
      setTimeout(() => {
        if (!gyro.hasData()) session.setNoGyro(true);
      }, 3000);
    }
    wx.navigateTo({ url: '/pages/game/game' });
  }
});
