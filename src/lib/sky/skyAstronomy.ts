// skyAstronomy.ts

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const toDegrees = (rad: number) => (rad * 180) / Math.PI;

// ... (keep formatTimeFromMinutes and getJulianDay as they are) ...
const formatTimeFromMinutes = (minutes: number) => {
  const normalized = (minutes % (24 * 60) + 24 * 60) % (24 * 60);
  const hh = Math.floor(normalized / 60);
  const mm = Math.round(normalized % 60);
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};

const getJulianDay = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const dayFraction = (hour + minute / 60 + second / 3600) / 24;
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5 +
    dayFraction
  );
};

// Updated solarPosition to calculate Azimuth
const solarPosition = (date: Date, latitude: number, longitude: number) => {
  const jd = getJulianDay(date);
  const t = (jd - 2451545.0) / 36525;

  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const mRad = toRadians(m);
  const c =
    Math.sin(mRad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * mRad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * mRad) * 0.000289;
  const trueLong = l0 + c;

  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(toRadians(omega));

  const obliq0 =
    23 +
    (26 +
      (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) /
      60;
  const obliq = obliq0 + 0.00256 * Math.cos(toRadians(omega));

  const obliqRad = toRadians(obliq);
  const lambdaRad = toRadians(lambda);
  const sinDeclination = Math.sin(obliqRad) * Math.sin(lambdaRad);
  const declination = Math.asin(sinDeclination);

  const y = Math.tan(obliqRad / 2) ** 2;
  const l0Rad = toRadians(l0);
  const equationOfTime =
    4 *
    toDegrees(
      y * Math.sin(2 * l0Rad) -
        2 * e * Math.sin(mRad) +
        4 * e * y * Math.sin(mRad) * Math.cos(2 * l0Rad) -
        0.5 * y * y * Math.sin(4 * l0Rad) -
        1.25 * e * e * Math.sin(2 * mRad)
    );

  const localMinutes =
    date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const tzOffsetHours = -date.getTimezoneOffset() / 60;
  const timeOffset = equationOfTime + 4 * longitude - 60 * tzOffsetHours;
  const trueSolarTime = (localMinutes + timeOffset + 1440) % 1440;

  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latRad = toRadians(latitude);
  const haRad = toRadians(hourAngle);
  const cosZenith =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(haRad);
  const zenith = Math.acos(clamp(cosZenith, -1, 1));
  let elevation = 90 - toDegrees(zenith);

  // --- AZIMUTH CALCULATION ---
  const azNum = Math.sin(declination) - Math.sin(latRad) * Math.cos(zenith);
  const azDenom = Math.cos(latRad) * Math.sin(zenith);
  let azimuth = Math.acos(clamp(azNum / azDenom, -1, 1));
  if (Math.sin(haRad) > 0) azimuth = 2 * Math.PI - azimuth;
  // ---------------------------

  if (elevation > -0.575) {
    const te = Math.tan(toRadians(elevation));
    const refraction =
      1 /
      (te + 0.50572 * Math.pow(6.07995 + elevation, -1));
    elevation += refraction * (1 / 60);
  }

  return {
    declination,
    equationOfTime,
    elevation,
    azimuth: toDegrees(azimuth)
  };
};

export const getSeason = (date: Date, latitude: number) => {
  const month = date.getMonth();
  const northSeason =
    month <= 1 || month === 11
      ? 'winter'
      : month <= 4
        ? 'spring'
        : month <= 7
          ? 'summer'
          : 'autumn';
  if (latitude >= 0) return northSeason;
  if (northSeason === 'winter') return 'summer';
  if (northSeason === 'summer') return 'winter';
  return northSeason === 'spring' ? 'autumn' : 'spring';
};

export const getLocalTimeString = (date: Date) =>
  `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

// Export a full position getter
export const getSunPosition = (date: Date, latitude: number, longitude: number) => {
  const pos = solarPosition(date, latitude, longitude);
  return { elevation: pos.elevation, azimuth: pos.azimuth };
};

export const estimateSunElevation = (date: Date, latitude: number, longitude: number) =>
  solarPosition(date, latitude, longitude).elevation;

// ... (keep estimateSunriseSunset, estimateMoonPhase, estimateMoonElevation as they are) ...
export const estimateSunriseSunset = (date: Date, latitude: number, longitude: number) => {
  const { declination, equationOfTime } = solarPosition(date, latitude, longitude);
  const latRad = toRadians(latitude);
  const solarZenith = toRadians(90.833);
  const cosH =
    (Math.cos(solarZenith) - Math.sin(latRad) * Math.sin(declination)) /
    (Math.cos(latRad) * Math.cos(declination));

  if (cosH > 1) {
    return { sunrise: '00:00', sunset: '00:00' };
  }
  if (cosH < -1) {
    return { sunrise: '00:00', sunset: '23:59' };
  }

  const hourAngle = toDegrees(Math.acos(cosH));
  const tzOffsetHours = -date.getTimezoneOffset() / 60;
  const sunriseMinutes =
    720 - 4 * (longitude + hourAngle) - equationOfTime + tzOffsetHours * 60;
  const sunsetMinutes =
    720 - 4 * (longitude - hourAngle) - equationOfTime + tzOffsetHours * 60;

  return {
    sunrise: formatTimeFromMinutes(sunriseMinutes),
    sunset: formatTimeFromMinutes(sunsetMinutes)
  };
};

export const estimateMoonPhase = (date: Date) => {
  const synodicMonth = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const daysSince = (date.getTime() - knownNewMoon) / 86400000;
  const phase = (daysSince % synodicMonth) / synodicMonth;
  return phase < 0 ? phase + 1 : phase;
};

export const estimateMoonElevation = (date: Date, latitude: number, moonPhase: number) => {
  const time = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const phaseOffset = moonPhase * 24;
  const lunarTime = (time + phaseOffset) % 24;
  const angle = (lunarTime / 24) * 2 * Math.PI;
  const latitudeScale = 1 - Math.min(0.6, Math.abs(latitude) / 120);
  return Math.sin(angle) * 60 * latitudeScale;
};