import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogCard from "@/components/BlogCard";
import { useTracking } from "@/hooks/useTracking";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string;
  featured_image: string | null;
  published_at: string;
  content: string;
  categories: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

const CategoryPage = () => {
  const { categorySlug } = useParams();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const { trackPageView } = useTracking();

  useEffect(() => {
    const fetchCategoryBlogs = async () => {
      trackPageView(`/category/${categorySlug}`);

      // 1️⃣ Load the category
      const { data: categoryData, error: categoryErr } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("slug", categorySlug)
        .single();

      if (categoryErr || !categoryData) {
        setLoading(false);
        return;
      }

      setCategoryName(categoryData.name);

      // 2️⃣ Get all blogs that belong to this category
      const { data: blogsData } = await supabase
        .from("blogs")
        .select(
          `
          id,
          title,
          slug,
          author,
          featured_image,
          published_at,
          content,
          categories:category_id (
            id,
            name,
            slug
          )
        `
        )
        .eq("status", "published")
        .eq("category_id", categoryData.id)
        .order("published_at", { ascending: false });

      if (blogsData) {
        setBlogs(blogsData as Blog[]);
      }

      setLoading(false);
    };

    fetchCategoryBlogs();
  }, [categorySlug, trackPageView]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-4">{categoryName}</h1>
            <p className="text-xl text-blog-meta">
              Explore our latest {categoryName.toLowerCase()} articles
            </p>
          </div>

          {blogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-blog-meta">No blogs in this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  id={blog.id}
                  title={blog.title}
                  slug={blog.slug}
                  category={blog.categories?.name || ""}
                  categorySlug={blog.categories?.slug || ""}
                  author={blog.author}
                  featuredImage={blog.featured_image || undefined}
                  publishedAt={blog.published_at}
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

export default CategoryPage;
