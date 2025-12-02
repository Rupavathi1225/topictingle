import { useEffect, useState } from "react";
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
  dz_categories: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

const DataOrbitZoneHome = () => {
  const [blogs, setBlogs] = useState<DzBlog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      const { data, error } = await supabase
        .from("dz_blogs")
        .select(`
          id,
          title,
          slug,
          author,
          featured_image,
          created_at,
          content,
          dz_categories:category_id (
            id,
            name,
            slug
          )
        `)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBlogs(data as DzBlog[]);
      }
      setLoading(false);
    };

    fetchBlogs();
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12 text-center">
            <h1 className="text-5xl font-bold mb-4">DramaOrbitZone</h1>
            <p className="text-xl text-blog-meta max-w-2xl mx-auto">
              Your digital hub for vibrant stories and updates on DramaOrbitZone.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-blog-meta">No blogs published yet for DataOrbitZone.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  id={blog.id}
                  title={blog.title}
                  slug={blog.slug}
                  category={blog.dz_categories?.name || ""}
                  categorySlug={blog.dz_categories?.slug || ""}
                  author={blog.author}
                  featuredImage={blog.featured_image || undefined}
                  publishedAt={blog.created_at || ""}
                  excerpt={blog.content.substring(0, 150)}
                  serialNumber={0}
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

export default DataOrbitZoneHome;
