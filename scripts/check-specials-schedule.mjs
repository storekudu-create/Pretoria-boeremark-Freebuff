import assert from 'node:assert/strict';
import { isWeeklySpecialsTime } from '../src/data/specialsSchedule.ts';

// Exercise multiple closing times; the UI's confirmed closing time is configured separately.
for (const closing of [420, 570, 600]) {
  for (let day = 11; day <= 16; day++) {
    assert.equal(isWeeklySpecialsTime(new Date(`2026-10-${day}T00:00:00+02:00`), closing), true);
    assert.equal(isWeeklySpecialsTime(new Date(`2026-10-${day}T23:59:59+02:00`), closing), true);
  }
  const saturdayMidnight = Date.parse('2026-10-17T00:00:00+02:00');
  assert.equal(isWeeklySpecialsTime(new Date(saturdayMidnight + closing * 60000 - 1000), closing), true);
  assert.equal(isWeeklySpecialsTime(new Date(saturdayMidnight + closing * 60000), closing), false);
  assert.equal(isWeeklySpecialsTime(new Date('2026-10-17T23:59:59+02:00'), closing), false);
  assert.equal(isWeeklySpecialsTime(new Date('2026-10-18T00:00:00+02:00'), closing), true);
}
console.log('PASS: Sunday–Friday, Saturday cutoff, and next-week rollover in South African time.');
