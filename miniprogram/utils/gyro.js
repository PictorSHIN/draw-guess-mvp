const GY = {
  armed: true,
  gotData: false,
  BETA_TRIG: 22,
  ACCEL_TRIG: 2.8,
  REARM_BETA: 10,
  REARM_ACCEL: 2.0,
  lastFire: 0,
  COOLDOWN: 1100,
  CAL_MS: 1200
};

let sensorOn = false;
let gameBound = false;
let onAnswer = null;
let isLocked = () => false;

let neutral = { x: 0, y: 0, z: 0, beta: 0, gamma: 0 };
let flipAxis = 'z';
let calibrating = false;
let calTimer = null;
let calSamples = [];

let lastMotion = { beta: 0, gamma: 0 };
let lastAccel = { x: 0, y: 0, z: 0 };

function resetGyroState() {
  GY.armed = true;
  GY.lastFire = 0;
}

function angleDiff(a, b) {
  let d = a - b;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function beginCalibration() {
  calibrating = true;
  calSamples = [];
  if (calTimer) clearTimeout(calTimer);
  calTimer = setTimeout(finishCalibration, GY.CAL_MS);
}

function finishCalibration() {
  calibrating = false;
  calTimer = null;
  if (!calSamples.length) return;

  const n = calSamples.length;
  neutral = {
    x: calSamples.reduce((s, v) => s + v.x, 0) / n,
    y: calSamples.reduce((s, v) => s + v.y, 0) / n,
    z: calSamples.reduce((s, v) => s + v.z, 0) / n,
    beta: calSamples.reduce((s, v) => s + v.beta, 0) / n,
    gamma: calSamples.reduce((s, v) => s + v.gamma, 0) / n
  };
  const abs = {
    x: Math.abs(neutral.x),
    y: Math.abs(neutral.y),
    z: Math.abs(neutral.z)
  };
  flipAxis = Object.keys(abs).sort((a, b) => abs[a] - abs[b])[0];
}

function pushCalSample() {
  calSamples.push({
    x: lastAccel.x,
    y: lastAccel.y,
    z: lastAccel.z,
    beta: lastMotion.beta,
    gamma: lastMotion.gamma
  });
}

function readFlipOffset() {
  const betaOff = Math.abs(angleDiff(lastMotion.beta, neutral.beta));
  const gammaOff = Math.abs(angleDiff(lastMotion.gamma, neutral.gamma));
  const accelOff = Math.abs(lastAccel[flipAxis] - neutral[flipAxis]);
  return Math.min(betaOff, gammaOff, accelOff);
}

function pickFlipCandidate() {
  const candidates = [
    { delta: angleDiff(lastMotion.beta, neutral.beta), trig: GY.BETA_TRIG },
    { delta: angleDiff(lastMotion.gamma, neutral.gamma), trig: GY.BETA_TRIG },
    { delta: lastAccel[flipAxis] - neutral[flipAxis], trig: GY.ACCEL_TRIG },
    { delta: lastAccel.x - neutral.x, trig: GY.ACCEL_TRIG },
    { delta: lastAccel.y - neutral.y, trig: GY.ACCEL_TRIG },
    { delta: lastAccel.z - neutral.z, trig: GY.ACCEL_TRIG }
  ];

  let best = null;
  for (const c of candidates) {
    if (Math.abs(c.delta) >= c.trig && (!best || Math.abs(c.delta) > Math.abs(best.delta))) {
      best = c;
    }
  }
  return best;
}

function tryFlip() {
  if (calibrating) return;
  if (!gameBound || !onAnswer) return;

  const betaOff = Math.abs(angleDiff(lastMotion.beta, neutral.beta));
  const gammaOff = Math.abs(angleDiff(lastMotion.gamma, neutral.gamma));
  const accelOff = Math.abs(lastAccel[flipAxis] - neutral[flipAxis]);
  const nearNeutral = betaOff < GY.REARM_BETA && gammaOff < GY.REARM_BETA && accelOff < GY.REARM_ACCEL;

  if (!GY.armed) {
    if (!isLocked() && nearNeutral) GY.armed = true;
    return;
  }
  if (isLocked()) return;
  if (Date.now() - GY.lastFire < GY.COOLDOWN) return;

  const hit = pickFlipCandidate();
  if (!hit) return;

  GY.armed = false;
  GY.lastFire = Date.now();
  // 下翻（屏幕朝地）→ 答对；上翻（屏幕朝天）→ 跳过
  onAnswer(hit.delta > 0);
}

function onDeviceMotion(res) {
  GY.gotData = true;
  if (res.beta != null) lastMotion.beta = res.beta;
  if (res.gamma != null) lastMotion.gamma = res.gamma;
  if (calibrating) {
    pushCalSample();
    return;
  }
  tryFlip();
}

function onAccelChange(res) {
  if (res.x == null && res.y == null && res.z == null) return;
  GY.gotData = true;
  lastAccel = { x: res.x, y: res.y, z: res.z };
  if (calibrating) {
    pushCalSample();
    return;
  }
  tryFlip();
}

function detachListeners() {
  wx.offAccelerometerChange(onAccelChange);
  wx.offDeviceMotionChange(onDeviceMotion);
}

function attachListeners() {
  detachListeners();
  wx.onAccelerometerChange(onAccelChange);
  wx.onDeviceMotionChange(onDeviceMotion);
}

function startSensor() {
  resetGyroState();
  return new Promise((resolve) => {
    let accelOk = null;
    let motionOk = null;

    const finish = () => {
      if (accelOk === null || motionOk === null) return;
      sensorOn = accelOk || motionOk;
      if (sensorOn) attachListeners();
      resolve(sensorOn);
    };

    detachListeners();

    wx.startAccelerometer({
      interval: 'game',
      success: () => {
        accelOk = true;
        finish();
      },
      fail: () => {
        accelOk = false;
        finish();
      }
    });

    wx.startDeviceMotionListening({
      interval: 'game',
      success: () => {
        motionOk = true;
        finish();
      },
      fail: () => {
        motionOk = false;
        finish();
      }
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
  if (calTimer) clearTimeout(calTimer);
  calTimer = null;
  detachListeners();
  try {
    wx.stopAccelerometer({});
  } catch (e) {}
  try {
    wx.stopDeviceMotionListening({});
  } catch (e) {}
}

function hasData() {
  return GY.gotData;
}

function waitCalibration() {
  return new Promise((resolve) => {
    if (!calibrating) {
      resolve();
      return;
    }
    const tick = () => {
      if (!calibrating) resolve();
      else setTimeout(tick, 50);
    };
    setTimeout(tick, 50);
  });
}

function vibrate(type) {
  const map = { correct: 'heavy', skip: 'medium', tick: 'light' };
  wx.vibrateShort({ type: map[type] || 'light' });
}

module.exports = {
  GY,
  resetGyroState,
  beginCalibration,
  waitCalibration,
  startSensor,
  bindGame,
  unbindGame,
  stopSensor,
  hasData,
  vibrate
};
