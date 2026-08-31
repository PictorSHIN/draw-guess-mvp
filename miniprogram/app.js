App({
  globalData: {
    settings: {
      topic: null,
      diff: 'easy',
      time: 90
    },
    game: null,
    noGyro: false
  },

  onLaunch() {
    try {
      const saved = wx.getStorageSync('settings_v1');
      if (saved) {
        this.globalData.settings = { ...this.globalData.settings, ...saved };
      }
    } catch (e) {}
  },

  saveSettings() {
    try {
      wx.setStorageSync('settings_v1', this.globalData.settings);
    } catch (e) {}
  }
});
