const GY = {
  armed: true,
  gotData: false,
  TRIG: 4.5,
  REARM: 2.5,
  lastFire: 0,
  COOLDOWN: 1100
};

let sensorOn = false;
let gameBound = false;
let onAnswer = null;
let isLocked = () => false;

let neutral = { x: 0, y: 0, z: 0 };
let flipAxis = 'z';
let calibrating = false;
let calSamples = [];

function resetGyroState() {
  GY.armed = true;
  GY.gotData = false;
  GY.lastFire = 0;
}

function beginCalibration() {
  calibrating = true;
  calSamples = [];
}

function finishCalibration() {
  if (!calSamples.length) {
    calibrating = false;
    return;
  }
  const n = calSamples.length;
  neutral = {
    x: calSamples.reduce((s, v) => s + v.x, 0) / n,
    y: calSamples.reduce((s, v) => s + v.y, 0) / n,
    z: calSamples.reduce((s, v) => s + v.z, 0) / n
  };
  const abs = {
    x: Math.abs(neutral.x),
    y: Math.abs(neutral.y),
    z: Math.abs(neutral.z)
  };
  flipAxis = Object.keys(abs).sort((a, b) => abs[a] - abs[b])[0];
  calibrating = false;
}

function readFlipDelta(res) {
  return res[flipAxis] - neutral[flipAxis];
}

function readFlipOffset(res) {
  return Math.abs(res[flipAxis] - neutral[flipAxis]);
}

function onAccelChange(res) {
  if (res.x == null && res.y == null && res.z == null) return;
  GY.gotData = true;

  if (calibrating) {
    calSamples.push({ x: res.x, y: res.y, z: res.z });
    if (calSamples.length >= 10) finishCalibration();
    return;
  }

  if (!gameBound || !onAnswer) return;

  const delta = readFlipDelta(res);
  const offset = readFlipOffset(res);

  if (!GY.armed) {
    if (!isLocked() && offset < GY.REARM) GY.armed = true;
    return;
  }
  if (isLocked()) return;
  if (Date.now() - GY.lastFire < GY.COOLDOWN) return;

  // 下翻（屏幕朝地）→ 答对；上翻（屏幕朝天）→ 跳过
  if (delta > GY.TRIG) {
    GY.armed = false;
    GY.lastFire = Date.now();
    onAnswer(true);
  } else if (delta < -GY.TRIG) {
    GY.armed = false;
    GY.lastFire = Date.now();
    onAnswer(false);
  }
}

function ensureListener() {
  wx.onAccelerometerChange(onAccelChange);
}

function startSensor() {
  resetGyroState();
  return new Promise((resolve) => {
    if (sensorOn) {
      ensureListener();
      resolve(true);
      return;
    }
    wx.startAccelerometer({
      interval: 'game',
      success: () => {
        sensorOn = true;
        ensureListener();
        resolve(true);
      },
      fail: () => resolve(false)
    });
  });
}

function bindGame(callbacks) {
  gameBound = true;
  onAnswer = callbacks.onAnswer;
  isLocked = callbacks.isLocked || (() => false);
  resetGyroState();
}

function unbindGame() {
  gameBound = false;
  onAnswer = null;
}

function stopSensor() {
  sensorOn = false;
  gameBound = false;
  calibrating = false;
  calSamples = [];
  wx.offAccelerometerChange(onAccelChange);
  try {
    wx.stopAccelerometer({});
  } catch (e) {}
}

function hasData() {
  return GY.gotData;
}

function vibrate(type) {
  const map = { correct: 'heavy', skip: 'medium', tick: 'light' };
  wx.vibrateShort({ type: map[type] || 'light' });
}

module.exports = {
  GY,
  resetGyroState,
  beginCalibration,
  startSensor,
  bindGame,
  unbindGame,
  stopSensor,
  hasData,
  vibrate
};
