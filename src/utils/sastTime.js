export function getSASTDateObj() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 2 * 3600000);
}

export function getSASTToday() {
  return getSASTDateObj().toISOString().split('T')[0];
}

export function getSASTYesterday() {
  const d = getSASTDateObj();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function getSASTMidnightTimestamp() {
  const sast = getSASTDateObj();
  const midnight = new Date(sast.getFullYear(), sast.getMonth(), sast.getDate(), 0, 0, 0, 0);
  return midnight.getTime() - 2 * 3600000;
}
