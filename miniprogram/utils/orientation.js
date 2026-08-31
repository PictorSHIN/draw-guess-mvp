let onLandscapeChange = null;
let listening = false;

function isLandscapeValue(value) {
  return value === 'landscape' || value === 'landscapeReverse';
}

function readWindowPortrait() {
  try {
    const info = wx.getSystemInfoSync();
    return info.windowHeight > info.windowWidth;
  } catch (e) {
    return false;
  }
}

function readDeviceLandscape() {
  try {
    const info = wx.getSystemInfoSync();
    if (info.deviceOrientation) {
      return isLandscapeValue(info.deviceOrientation);
    }
  } catch (e) {}
  return null;
}

function emit() {
  if (!onLandscapeChange) return;
  const fromDevice = readDeviceLandscape();
  const landscape = fromDevice != null ? fromDevice : !readWindowPortrait();
  onLandscapeChange(landscape);
}

function onOrientationChange(res) {
  if (!onLandscapeChange) return;
  onLandscapeChange(isLandscapeValue(res.value));
}

function start(callback) {
  onLandscapeChange = callback;
  if (listening) {
    emit();
    return;
  }
  listening = true;

  wx.onDeviceOrientationChange(onOrientationChange);
  wx.onWindowResize(emit);

  wx.startDeviceMotionListening({
    interval: 'normal',
    success: () => emit(),
    fail: () => emit()
  });
}

function stop() {
  if (!listening) return;
  listening = false;
  wx.offDeviceOrientationChange(onOrientationChange);
  wx.offWindowResize(emit);
  onLandscapeChange = null;
  try {
    wx.stopDeviceMotionListening({});
  } catch (e) {}
}

module.exports = { start, stop, emit };
