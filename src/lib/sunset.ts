// ─────────────────────────────────────────────────────────────
// Pure-JS sunrise / sunset / golden-hour calculator. No API.
//
// Uses the NOAA solar-position algorithm — accurate to ~1 minute
// for any latitude / date in the current century, which is more
// than enough for a "golden hour 6:42 PM" chip on the ceremony
// card. No external service, no rate limits, runs at render time.
//
// All inputs in UTC, outputs in the venue's local time via the
// IANA timezone passed in (falls back to viewer's zone).
// ─────────────────────────────────────────────────────────────

interface SolarTimes {
  sunrise: string;        // 'HH:MM' in venue timezone
  sunset: string;         // 'HH:MM'
  goldenHour: string;     // ~1h before sunset; "magic hour"
  /** Sunset Date object in UTC. */
  sunsetDate: Date;
}

export function sunriseSunsetFor(
  lat: number,
  lng: number,
  isoDate: string,
  timezone?: string,
): SolarTimes | null {
  // Parse the YYYY-MM-DD date at venue noon to anchor the day.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  // ── NOAA solar calc — ported, simplified.
  // Julian day for the given date (UT 12:00).
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const julianDay = date.getTime() / 86_400_000 + 2440587.5;
  const julianCentury = (julianDay - 2451545) / 36525;

  const geomMeanLongSun = (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032)) % 360;
  const geomMeanAnomSun = 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury);
  const eccentEarthOrbit = 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
  const sunEqOfCtr =
    Math.sin(rad(geomMeanAnomSun)) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
    Math.sin(rad(2 * geomMeanAnomSun)) * (0.019993 - 0.000101 * julianCentury) +
    Math.sin(rad(3 * geomMeanAnomSun)) * 0.000289;
  const sunTrueLong = geomMeanLongSun + sunEqOfCtr;
  const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * julianCentury));
  const meanObliqEcliptic =
    23 + (26 + (21.448 - julianCentury * (46.815 + julianCentury * (0.00059 - julianCentury * 0.001813))) / 60) / 60;
  const obliqCorr = meanObliqEcliptic + 0.00256 * Math.cos(rad(125.04 - 1934.136 * julianCentury));
  const sunDeclin = deg(Math.asin(Math.sin(rad(obliqCorr)) * Math.sin(rad(sunAppLong))));

  const varY = Math.tan(rad(obliqCorr / 2)) * Math.tan(rad(obliqCorr / 2));
  const eqOfTime =
    4 *
    deg(
      varY * Math.sin(2 * rad(geomMeanLongSun)) -
        2 * eccentEarthOrbit * Math.sin(rad(geomMeanAnomSun)) +
        4 * eccentEarthOrbit * varY * Math.sin(rad(geomMeanAnomSun)) * Math.cos(2 * rad(geomMeanLongSun)) -
        0.5 * varY * varY * Math.sin(4 * rad(geomMeanLongSun)) -
        1.25 * eccentEarthOrbit * eccentEarthOrbit * Math.sin(2 * rad(geomMeanAnomSun)),
    );

  // Hour angle for sunrise/sunset (zenith 90°50' = atmospheric refraction).
  const cosHourAngle =
    (Math.cos(rad(90.833)) - Math.sin(rad(lat)) * Math.sin(rad(sunDeclin))) /
    (Math.cos(rad(lat)) * Math.cos(rad(sunDeclin)));
  // |cosHourAngle| > 1 means sun never rises or never sets at this lat.
  if (cosHourAngle > 1 || cosHourAngle < -1) return null;
  const hourAngle = deg(Math.acos(cosHourAngle));

  const solarNoonMin = 720 - 4 * lng - eqOfTime; // minutes from UTC 00:00
  const sunriseMin = solarNoonMin - hourAngle * 4;
  const sunsetMin = solarNoonMin + hourAngle * 4;

  const sunriseUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) + sunriseMin * 60_000);
  const sunsetUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) + sunsetMin * 60_000);
  const goldenUtc = new Date(sunsetUtc.getTime() - 60 * 60_000);

  return {
    sunrise: formatLocal(sunriseUtc, timezone),
    sunset: formatLocal(sunsetUtc, timezone),
    goldenHour: formatLocal(goldenUtc, timezone),
    sunsetDate: sunsetUtc,
  };
}

function rad(d: number) { return (d * Math.PI) / 180; }
function deg(r: number) { return (r * 180) / Math.PI; }

function formatLocal(d: Date, tz?: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    }).format(d).toLowerCase();
  } catch {
    // Bad tz string — fall back to the viewer's local zone.
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  }
}
