import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import Image from "next/image";

const ArticleCard = ({
  title,
  date,
  url,
  images,
  source,
  text,
}: {
  title: string;
  date: string;
  url: string;
  images: { url: string; width: string; height: string; tag: string }[];
  source: string;
  text: string;
}) => (
  <div className="rounded-lg border border-gray-200 p-4 hover:bg-gray-800/50">
    <div className="flex gap-4 rounded-lg">
      {images?.[0] && (
        <div className="relative h-24 w-24 flex-shrink-0">
          <Image
            src={images[0].url}
            alt={title}
            fill
            className="rounded-md object-cover"
            sizes="96px"
            priority={false}
            quality={75}
          />
        </div>
      )}
      <div className="flex flex-col">
        <h3 className="font-bold text-orange-50">{title}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <time>{format(new Date(date), "MMM d, yyyy 'at' h:mm a")}</time>
          <span>•</span>
          <span>{source}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="z-100 relative inline-block text-blue-400 hover:underline"
          style={{ zIndex: 100 }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Read more
        </a>
      </div>
    </div>
    <p className="mt-2 text-sm">{text}</p>
  </div>
);

const LoadingSkeleton = () => (
  <div className="flex animate-pulse gap-4 rounded-lg border border-gray-700 p-4">
    <div className="h-24 w-24 rounded-md bg-gray-700"></div>
    <div className="flex flex-1 flex-col gap-2">
      <div className="h-6 w-3/4 rounded bg-gray-700"></div>
      <div className="h-4 w-1/2 rounded bg-gray-700"></div>
    </div>
  </div>
);

export const News = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.newsCompany.useQuery(symbol ?? "", {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data?.results?.length) {
    return <div className="p-4 text-gray-400">No news available</div>;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex flex-col gap-4 p-4">
        {data.results.map((article, index) => (
          <ArticleCard key={index} {...article} />
        ))}
      </div>
    </div>
  );
};
