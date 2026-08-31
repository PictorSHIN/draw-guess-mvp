const GY = {
  armed: true,
  gotData: false,
  BETA_TRIG: 20,
  ACCEL_TRIG: 2.5,
  REARM_BETA: 12,
  REARM_ACCEL: 2.2,
  lastFire: 0,
  COOLDOWN: 1100,
  CAL_MS: 1200,
  // 微信小程序坐标系与 H5 相反，统一取反：处理后 delta>0 为下翻答对
  INVERT: -1
};

let sensorOn = false;
let gameBound = false;
let onAnswer = null;
let isLocked = () => false;

let neutral = { x: 0, y: 0, z: 0, beta: 0, gamma: 0 };
let flipAxis = 'z';
let primaryAngle = 'beta';
let lastHitKind = 'accel';
let calibrating = false;
let calTimer = null;
let calSamples = [];

let lastMotion = { beta: 0, gamma: 0 };
let lastAccel = { x: 0, y: 0, z: 0 };

function resetGyroState() {
  GY.armed = true;
  GY.lastFire = 0;
  lastHitKind = 'accel';
}

function angleDiff(a, b) {
  let d = a - b;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function normDelta(raw) {
  return raw * GY.INVERT;
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
  primaryAngle = Math.abs(neutral.beta) >= Math.abs(neutral.gamma) ? 'beta' : 'gamma';
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

function accelDelta() {
  return normDelta(lastAccel[flipAxis] - neutral[flipAxis]);
}

function angleDelta() {
  return normDelta(angleDiff(lastMotion[primaryAngle], neutral[primaryAngle]));
}

function accelOffset() {
  return Math.abs(lastAccel[flipAxis] - neutral[flipAxis]);
}

function angleOffset() {
  return Math.abs(angleDiff(lastMotion[primaryAngle], neutral[primaryAngle]));
}

function isNearNeutral() {
  if (lastHitKind === 'angle') {
    return angleOffset() < GY.REARM_BETA;
  }
  return accelOffset() < GY.REARM_ACCEL;
}

function pickFlipCandidate() {
  const accel = {
    kind: 'accel',
    delta: accelDelta(),
    trig: GY.ACCEL_TRIG
  };
  const angle = {
    kind: 'angle',
    delta: angleDelta(),
    trig: GY.BETA_TRIG
  };

  const hitAccel = Math.abs(accel.delta) >= accel.trig ? accel : null;
  const hitAngle = Math.abs(angle.delta) >= angle.trig ? angle : null;

  if (!hitAccel && !hitAngle) return null;
  if (!hitAccel) return hitAngle;
  if (!hitAngle) return hitAccel;
  return Math.abs(hitAccel.delta) >= Math.abs(hitAngle.delta) ? hitAccel : hitAngle;
}

function tryFlip() {
  if (calibrating) return;
  if (!gameBound || !onAnswer) return;

  if (!GY.armed) {
    if (!isLocked() && isNearNeutral()) GY.armed = true;
    return;
  }
  if (isLocked()) return;
  if (Date.now() - GY.lastFire < GY.COOLDOWN) return;

  const hit = pickFlipCandidate();
  if (!hit) return;

  GY.armed = false;
  GY.lastFire = Date.now();
  lastHitKind = hit.kind;
  // delta>0 → 下翻答对；delta<0 → 上翻跳过
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
