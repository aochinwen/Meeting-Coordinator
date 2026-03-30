import assert from 'node:assert';
import { calculateEndTime } from '../../lib/recurrence.ts';

function testCalculateEndTime() {
  console.log('Testing calculateEndTime...');

  // Happy Path: Simple addition
  assert.strictEqual(calculateEndTime('10:00', 30), '10:30', 'Should add 30 minutes');
  assert.strictEqual(calculateEndTime('09:15', 45), '10:00', 'Should wrap to next hour');

  // Edge Case: Duration is 0
  assert.strictEqual(calculateEndTime('14:00', 0), '14:00', 'Should return same time if duration is 0');

  // Edge Case: Long duration
  assert.strictEqual(calculateEndTime('08:00', 120), '10:00', 'Should add multiple hours');
  assert.strictEqual(calculateEndTime('08:00', 150), '10:30', 'Should add hours and minutes');

  // Edge Case: Wrap around midnight
  assert.strictEqual(calculateEndTime('23:00', 120), '01:00', 'Should wrap around midnight');
  assert.strictEqual(calculateEndTime('23:30', 60), '00:30', 'Should wrap around midnight and show 00 hours');

  // Edge Case: Very long duration (more than 24h)
  assert.strictEqual(calculateEndTime('10:00', 1440), '10:00', 'Should wrap around multiple days (1 day)');
  assert.strictEqual(calculateEndTime('10:00', 1500), '11:00', 'Should wrap around multiple days (1 day + 1 hour)');

  console.log('All tests passed!');
}

try {
  testCalculateEndTime();
} catch (error) {
  console.error('Tests failed!');
  console.error(error);
  process.exit(1);
}
