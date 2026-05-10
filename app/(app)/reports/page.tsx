import { Suspense } from 'react';
import { getReportData } from '@/lib/reports';
import { ReportDashboard } from '@/components/reports/ReportDashboard';

export const revalidate = 60;

export default async function ReportPage() {
  const reportData = await getReportData(7);

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-12 pt-8 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div>Loading Analytics...</div>}>
        <ReportDashboard initialData={reportData} />
      </Suspense>
    </div>
  );
}
