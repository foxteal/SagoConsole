import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import ServiceLinks from "../components/services/ServiceLinks";

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

export default function ServicesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLinks() {
      try {
        const res = await apiClient("/api/links");
        const data = await res.json();
        setCategories(data.categories);
      } catch (err) {
        console.error("Failed to fetch links:", err);
      }
      setLoading(false);
    }
    fetchLinks();
  }, []);

  const totalLinks = categories.reduce((sum, c) => sum + c.links.length, 0);

  return (
    <div className="p-6 pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-[13px] text-text-secondary font-mono font-light mt-0.5">
          {totalLinks} services across {categories.length} categories
        </p>
      </div>
      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="h-4 w-32 bg-bg-card rounded animate-pulse mb-2.5" />
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-14 bg-bg-surface border border-border-subtle rounded-md animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ServiceLinks categories={categories} />
      )}
    </div>
  );
}
