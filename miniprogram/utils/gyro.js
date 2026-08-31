const GY = {
  armed: true,
  gotData: false,
  TRIG: 5.5,
  REARM: 3.0,
  lastFire: 0,
  COOLDOWN: 1100
};

let sensorOn = false;
let gameBound = false;
let onAnswer = null;
let isLocked = () => false;

function resetGyroState() {
  GY.armed = true;
  GY.gotData = false;
  GY.lastFire = 0;
}

function onAccelChange(res) {
  if (res.z == null) return;
  GY.gotData = true;
  if (!gameBound || !onAnswer) return;

  const z = res.z;
  if (!GY.armed) {
    if (!isLocked() && Math.abs(z) < GY.REARM) GY.armed = true;
    return;
  }
  if (isLocked()) return;
  if (Date.now() - GY.lastFire < GY.COOLDOWN) return;

  if (z > GY.TRIG) {
    GY.armed = false;
    GY.lastFire = Date.now();
    onAnswer(true);
  } else if (z < -GY.TRIG) {
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
  startSensor,
  bindGame,
  unbindGame,
  stopSensor,
  hasData,
  vibrate
};
