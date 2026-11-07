import React from 'react';
import { Sparkles, Play, Calendar, ChevronRight } from 'lucide-react';
import { api } from '../api';

export default function MemoriesCarousel({ memories = [], onSelectMedia }) {
  if (!memories || memories.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-[#C2410C]" />
        <h3 className="font-serif font-semibold text-xl text-[#1C1917]">
          Ingatkah Momen Ini?
        </h3>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin">
        {memories.map((group) => {
          const firstMedia = group.items[0];
          if (!firstMedia) return null;

          return (
            <div
              key={group.id}
              onClick={() => onSelectMedia(group.items, 0)}
              className="min-w-[240px] max-w-[260px] flex-shrink-0 card-elevated p-3 cursor-pointer group hover:border-[#C2410C] transition-all"
            >
              {/* Cover Preview Image */}
              <div className="relative aspect-[4/3] rounded-[6px] overflow-hidden bg-[#FAF1E6] mb-2.5 border border-[#E7E5E4]">
                <img
                  src={api.getThumbnailUrl(firstMedia.id)}
                  alt={firstMedia.display_name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {firstMedia.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-8 h-8 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-modal">
                      <Play className="w-4 h-4 ml-0.5 fill-white" />
                    </div>
                  </div>
                )}

                <div className="absolute top-2 left-2">
                  <span className="bg-[#C2410C] text-white text-[11px] font-bold px-2 py-0.5 rounded-[3px] border border-[#9A3412] uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>

                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-1.5 py-0.5 rounded-[3px] font-mono">
                  {group.items.length} file
                </div>
              </div>

              {/* Subtitle / Description */}
              <h4 className="font-serif font-semibold text-[15px] text-[#1C1917] truncate group-hover:text-[#C2410C] transition-colors">
                {group.label}
              </h4>
              <p className="text-[12px] text-[#57534E] truncate mt-0.5">
                {group.subtitle}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

