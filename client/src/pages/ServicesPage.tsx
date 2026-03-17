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
        <h1 className="text-[22px] font-semibold tracking-tight">Services</h1>
        <p className="text-xs text-text-tertiary font-mono font-light mt-0.5">
          {totalLinks} services across {categories.length} categories
        </p>
      </div>
      {loading ? (
        <div className="text-text-secondary">Loading services...</div>
      ) : (
        <ServiceLinks categories={categories} />
      )}
    </div>
  );
}
