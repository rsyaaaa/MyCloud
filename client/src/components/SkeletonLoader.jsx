import React from 'react';

export function MediaCardSkeleton({ isPortrait = false }) {
  return (
    <div className="card-artisan overflow-hidden flex flex-col bg-white dark:bg-[#23201D] border border-[#E7E5E4] dark:border-[#3E3834] rounded-[8px] animate-pulse">
      {/* Thumbnail placeholder */}
      <div
        className={`w-full bg-[#E7E5E4] dark:bg-[#2E2A26] relative ${
          isPortrait ? 'aspect-[3/4]' : 'aspect-[4/3]'
        }`}
      >
        <div className="absolute inset-0 skeleton-shimmer opacity-40" />
      </div>

      {/* Info placeholder */}
      <div className="p-3 border-t border-[#E7E5E4] dark:border-[#3E3834] space-y-2 bg-white dark:bg-[#23201D]">
        <div className="h-4 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-3/4" />
        <div className="flex items-center gap-2">
          <div className="h-3 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-1/4" />
          <div className="h-3 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

export function MediaGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} isPortrait={i % 3 === 0} />
      ))}
    </div>
  );
}

export function MediaListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2.5 bg-white dark:bg-[#23201D] border border-[#E7E5E4] dark:border-[#3E3834] rounded-[8px] animate-pulse">
      <div className="w-14 h-14 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded-[6px] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-3/5" />
        <div className="h-3 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-2/5" />
      </div>
      <div className="w-6 h-6 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded shrink-0" />
    </div>
  );
}

export function MediaListSkeleton({ count = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <MediaListItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function MemoriesSkeleton() {
  return (
    <div className="mb-6 p-4 bg-[#FAF1E6] dark:bg-[#23201D] border-2 border-[#D4A373] dark:border-[#3E3834] rounded-[8px] animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-44" />
        <div className="h-3 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-20" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-36 h-48 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded-[6px] shrink-0" />
        ))}
      </div>
    </div>
  );
}

export function AlbumsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-artisan p-4 bg-white dark:bg-[#23201D] border border-[#E7E5E4] dark:border-[#3E3834] rounded-[8px] animate-pulse space-y-3">
          <div className="w-12 h-12 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded-[6px]" />
          <div className="h-4 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-2/3" />
          <div className="h-3 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function TrashListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-[#23201D] border border-[#E7E5E4] dark:border-[#3E3834] rounded-[8px] animate-pulse">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded-[6px] shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-1/2" />
              <div className="h-3 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded w-1/4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-8 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded" />
            <div className="w-8 h-8 bg-[#E7E5E4] dark:bg-[#2E2A26] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
