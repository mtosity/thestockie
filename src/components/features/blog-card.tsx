import Link from "next/link";
import Image from "next/image";
import { Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { type BlogMeta, formatBlogDate } from "~/lib/blog.shared";
import { cn } from "~/lib/utils";

interface BlogCardProps {
  blog: BlogMeta;
  className?: string;
}

export function BlogCard({ blog, className }: BlogCardProps) {
  const { frontmatter, readingTime } = blog;

  return (
    <Link href={`/blogs/${frontmatter.slug}`} className="group block">
      <Card
        className={cn(
          "h-full overflow-hidden border-white/10 bg-white/5 transition-all duration-300",
          "hover:border-white/20 hover:bg-white/10 hover:shadow-xl hover:shadow-purple-500/10",
          "hover:-translate-y-1",
          className
        )}
      >
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={frontmatter.coverImage}
            alt={frontmatter.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-2 right-2 text-[10px] text-white/40">
            Unsplash
          </span>
        </div>

        <CardHeader className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {frontmatter.tags?.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <h3 className="line-clamp-2 text-lg font-semibold text-white transition-colors group-hover:text-purple-300">
            {frontmatter.title}
          </h3>
        </CardHeader>

        <CardContent>
          <p className="line-clamp-3 text-sm text-gray-400">
            {frontmatter.excerpt}
          </p>
        </CardContent>

        <CardFooter className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatBlogDate(frontmatter.publishedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{readingTime}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
