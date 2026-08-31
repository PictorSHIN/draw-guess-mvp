function getAppSafe() {
  return getApp();
}

function getSettings() {
  return getAppSafe().globalData.settings;
}

function setSettings(partial) {
  Object.assign(getAppSafe().globalData.settings, partial);
  getAppSafe().saveSettings();
}

function setGame(game) {
  getAppSafe().globalData.game = game;
}

function getGame() {
  return getAppSafe().globalData.game;
}

function setNoGyro(v) {
  getAppSafe().globalData.noGyro = v;
}

function getNoGyro() {
  return getAppSafe().globalData.noGyro;
}

module.exports = {
  getSettings,
  setSettings,
  setGame,
  getGame,
  setNoGyro,
  getNoGyro
};
