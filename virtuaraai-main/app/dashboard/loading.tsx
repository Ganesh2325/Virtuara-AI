export default function DashboardLoading() {
  return (
    <div className="w-full h-full flex flex-col p-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Panel Skeleton */}
        <div className="flex flex-col gap-4">
          <div className="h-10 w-32 skeleton mb-4" />
          <div className="flex-1 rounded-2xl skeleton opacity-60" />
        </div>
        
        {/* Center Panel Skeleton */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <div className="h-10 w-48 skeleton mx-auto mb-4" />
          <div className="flex-1 rounded-full aspect-square skeleton opacity-40 mx-auto max-w-[400px]" />
        </div>
        
        {/* Right Panel Skeleton */}
        <div className="flex flex-col gap-4">
          <div className="h-10 w-32 skeleton ml-auto mb-4" />
          <div className="flex-1 rounded-2xl skeleton opacity-60" />
        </div>
      </div>
    </div>
  );
}
