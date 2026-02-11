"use client";

import { cn } from "~/lib/utils";

interface BlogTagFilterProps {
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

export function BlogTagFilter({
  tags,
  selectedTag,
  onTagSelect,
}: BlogTagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onTagSelect(null)}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
          selectedTag === null
            ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
        )}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onTagSelect(tag)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium capitalize transition-all duration-200",
            selectedTag === tag
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
              : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
