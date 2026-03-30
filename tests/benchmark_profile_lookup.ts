import { performance } from 'node:perf_hooks';

// Simulate the data from app/page.tsx
const profileMap = new Map<string, string>();
const participantIds: string[] = [];

// Populate with enough data to make the measurement noticeable
for (let i = 0; i < 10000; i++) {
  const id = `user_${i}`;
  profileMap.set(id, `User Name ${i}`);
  participantIds.push(id);
}

// Add some unknown IDs to simulate missing profiles
for (let i = 10000; i < 11000; i++) {
  participantIds.push(`unknown_user_${i}`);
}

function runBenchmark() {
  const iterations = 100;

  // Unoptimized version
  let unoptimizedTotalTime = 0;
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const _result = participantIds.slice(0, 3000).map(id => ({
      name: profileMap.get(id) || '?',
      initials: (profileMap.get(id) || '?').charAt(0).toUpperCase()
    }));
    const end = performance.now();
    unoptimizedTotalTime += (end - start);
  }

  // Optimized version
  let optimizedTotalTime = 0;
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const _result = participantIds.slice(0, 3000).map(id => {
      const name = profileMap.get(id) || '?';
      return {
        name,
        initials: name.charAt(0).toUpperCase()
      };
    });
    const end = performance.now();
    optimizedTotalTime += (end - start);
  }

  console.log(`--- Benchmark Results ---`);
  console.log(`Unoptimized Average: ${(unoptimizedTotalTime / iterations).toFixed(4)} ms`);
  console.log(`Optimized Average:   ${(optimizedTotalTime / iterations).toFixed(4)} ms`);
  console.log(`Improvement:         ${(((unoptimizedTotalTime - optimizedTotalTime) / unoptimizedTotalTime) * 100).toFixed(2)}%`);
}

runBenchmark();
