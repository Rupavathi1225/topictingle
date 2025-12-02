import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogCard from "@/components/BlogCard";

interface DzBlog {
  id: string;
  title: string;
  slug: string;
  author: string;
  featured_image: string | null;
  created_at: string | null;
  content: string;
}

interface DzCategory {
  id: number;
  name: string;
  slug: string;
}

const DataOrbitZoneCategoryPage = () => {
  const { categorySlug } = useParams();
  const [blogs, setBlogs] = useState<DzBlog[]>([]);
  const [category, setCategory] = useState<DzCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!categorySlug) return;

      const { data: categoryData, error: catError } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("slug", categorySlug)
        .eq("site_name", "dataorbitzone")
        .maybeSingle();

      if (catError || !categoryData) {
        setLoading(false);
        return;
      }

      setCategory(categoryData as DzCategory);

      const { data: blogsData } = await supabase
        .from("blogs")
        .select("id, title, slug, author, featured_image, created_at, content")
        .eq("status", "published")
        .eq("site_name", "dataorbitzone")
        .eq("category_id", categoryData.id)
        .order("created_at", { ascending: false });

      if (blogsData) setBlogs(blogsData as DzBlog[]);
      setLoading(false);
    };

    load();
  }, [categorySlug]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-4">{category?.name || "Category"}</h1>
            {category && (
              <p className="text-xl text-blog-meta">
                Explore the latest DramaOrbitZone posts in {category.name.toLowerCase()}.
              </p>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-blog-meta">No blogs in this DataOrbitZone category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  id={blog.id}
                  title={blog.title}
                  slug={blog.slug}
                  category={category?.name || ""}
                  categorySlug={category?.slug || ""}
                  author={blog.author}
                  featuredImage={blog.featured_image || undefined}
                  publishedAt={blog.created_at || ""}
                  excerpt={blog.content.substring(0, 150)}
                />
              ))}
            </div>
          )}
        </div>
        <Footer />
      </main>
    </>
  );
};

export default DataOrbitZoneCategoryPage;
