import ServiceCard from "./ServiceCard";

interface Link {
  id: number;
  title: string;
  url: string;
  icon_url: string | null;
  category: string;
  sort_order: number;
}

interface Category {
  name: string;
  links: Link[];
}

interface ServiceLinksProps {
  categories: Category[];
}

export default function ServiceLinks({ categories }: ServiceLinksProps) {
  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.name}>
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-[0.8px] mb-2.5 flex items-center gap-2">
            {category.name}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {category.links.map((link) => (
              <ServiceCard key={link.id} title={link.title} url={link.url} icon_url={link.icon_url} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
