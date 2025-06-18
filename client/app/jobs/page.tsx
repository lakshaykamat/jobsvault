import React, { Suspense } from "react";
import JobsPage from "./JobsPage";

export default function JobsPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading jobs...</div>}>
      <JobsPage />
    </Suspense>
  );
}
