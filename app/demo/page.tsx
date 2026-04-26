import { Suspense } from 'react';
import { DemoListServer } from '@/components/DemoListServer';
import { DemoListClientWrapper } from '@/components/DemoListClientWrapper';

function DemoListSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-border rounded-3xl p-6 animate-pulse">
          <div className="h-6 bg-surface rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-surface rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-surface rounded w-full"></div>
            <div className="h-3 bg-surface rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function DemoList() {
  const initiatives = await DemoListServer();
  return <DemoListClientWrapper initialInitiatives={initiatives} />;
}

export default function DemoPage() {
  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-12">
      <Suspense fallback={<DemoListSkeleton />}>
        <DemoList />
      </Suspense>
    </div>
  );
}
