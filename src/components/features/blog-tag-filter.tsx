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
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            : "bg-foreground/5 text-muted-foreground hover:bg-accent hover:text-foreground"
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
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "bg-foreground/5 text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
