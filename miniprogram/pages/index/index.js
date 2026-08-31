const { DIFFS, TIME_PRESETS, getTopicList } = require('../../utils/words.js');
const session = require('../../utils/session.js');

Page({
  data: {
    topics: [],
    diffs: DIFFS,
    timePresets: TIME_PRESETS,
    topic: null,
    diff: 'easy',
    time: 90,
    showPrivacy: false
  },

  onLoad() {
    const settings = session.getSettings();
    this.setData({
      topics: getTopicList(),
      topic: settings.topic,
      diff: settings.diff,
      time: settings.time
    });
    try {
      const accepted = wx.getStorageSync('privacy_v1');
      if (!accepted) this.setData({ showPrivacy: true });
    } catch (e) {
      this.setData({ showPrivacy: true });
    }
  },

  onTopicTap(e) {
    const topic = e.currentTarget.dataset.id;
    this.setData({ topic });
    session.setSettings({ topic });
  },

  onDiffTap(e) {
    const diff = e.currentTarget.dataset.id;
    this.setData({ diff });
    session.setSettings({ diff });
  },

  onTimeTap(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({ time });
    session.setSettings({ time });
  },

  onSliderChange(e) {
    const time = e.detail.value;
    this.setData({ time });
    session.setSettings({ time });
  },

  onStart() {
    if (!this.data.topic) return;
    wx.navigateTo({ url: '/pages/prepare/prepare' });
  },

  acceptPrivacy() {
    wx.setStorageSync('privacy_v1', true);
    this.setData({ showPrivacy: false });
  },

  rejectPrivacy() {
    wx.showModal({
      title: '提示',
      content: '需同意隐私政策后才能使用本工具',
      showCancel: false
    });
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pages/legal/privacy/privacy' });
  },

  goTerms() {
    wx.navigateTo({ url: '/pages/legal/terms/terms' });
  }
});
