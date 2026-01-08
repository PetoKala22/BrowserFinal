// src/lib/sky/skyView.ts

export type SunScreenPos = { x: number; y: number };

// ----------------------------
// View / projection configuration
// ----------------------------
const SKY_VIEW = {
  viewAzimuth: 180,
  fovDeg: 100,
  horizonYFrac: 0.6,
  verticalDeg: 90
};

export const getSunScreenPosition = (
  width: number,
  height: number,
  azimuth: number,
  elevation: number
): SunScreenPos => {
  let azDelta = azimuth - SKY_VIEW.viewAzimuth;
  if (azDelta > 180) azDelta -= 360;
  if (azDelta < -180) azDelta += 360;

  const x = width / 2 + (azDelta / (SKY_VIEW.fovDeg / 2)) * (width / 2);
  const horizonY = height * SKY_VIEW.horizonYFrac;
  const pixelsPerDegree = height / SKY_VIEW.verticalDeg;
  const y = horizonY - elevation * pixelsPerDegree;

  return { x, y };
};
