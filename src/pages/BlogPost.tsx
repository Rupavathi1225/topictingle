import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RelatedSearches from "@/components/RelatedSearches";
import { format } from "date-fns";
import { useTracking } from "@/hooks/useTracking";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string;
  featured_image: string | null;
  published_at: string;
  content: string;
  category_id: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const BlogPost = () => {
  const { categorySlug, blogSlug } = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [recentPosts, setRecentPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const { trackPageView, trackClick } = useTracking();

  useEffect(() => {
    const fetchBlog = async () => {
      // Fetch blog by slug
      const { data: blogData } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", blogSlug)
        .eq("status", "published")
        .single();

      if (!blogData) {
        setLoading(false);
        return;
      }

      setBlog(blogData as Blog);

      trackPageView(`/blog/${categorySlug}/${blogSlug}`, blogData.id);

      // Fetch matching category
      const { data: categoryData } = await supabase
        .from("categories")
        .select("*")
        .eq("id", blogData.category_id)
        .single();

      if (categoryData) setCategory(categoryData as Category);

      // Find recent posts in same category
      let { data: recentCategoryPosts } = await supabase
        .from("blogs")
        .select("*")
        .eq("status", "published")
        .eq("category_id", blogData.category_id)
        .neq("id", blogData.id)
        .order("published_at", { ascending: false })
        .limit(4);

      // Fallback - fetch from all categories
      if (!recentCategoryPosts || recentCategoryPosts.length < 4) {
        const { data: allRecent } = await supabase
          .from("blogs")
          .select("*")
          .eq("status", "published")
          .neq("id", blogData.id)
          .order("published_at", { ascending: false })
          .limit(4);

        if (allRecent) recentCategoryPosts = allRecent;
      }

      if (recentCategoryPosts) {
        setRecentPosts(recentCategoryPosts as Blog[]);
      }

      setLoading(false);
    };

    fetchBlog();
  }, [blogSlug, categorySlug, trackPageView]);

  // Loading State
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">Loading...</div>
      </>
    );
  }

  // Blog Not Found
  if (!blog) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">Blog not found</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Category + Date */}
        <div className="bg-background border-b border-blog-border py-4">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              {category && (
                <span
                  className="text-sm font-semibold text-accent cursor-pointer hover:underline"
                  onClick={() =>
                    trackClick(`category-tag-${category.slug}`, category.name)
                  }
                >
                  {category.name}
                </span>
              )}

              <span className="mx-2 text-blog-meta">•</span>

              <time className="text-sm text-blog-meta">
                {format(new Date(blog.published_at), "MMM dd, yyyy")}
              </time>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold mb-8 leading-tight text-blog-heading">
              {blog.title}
            </h1>

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
              {/* Author Section */}
              <aside className="lg:sticky lg:top-20 self-start">
                <div className="border border-blog-border rounded-lg p-6 bg-card">
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-bold text-3xl mb-3">
                      {blog.author.charAt(0)}
                    </div>
                    <h3 className="font-bold text-lg text-blog-heading">{blog.author}</h3>
                  </div>
                </div>

                {/* Sidebar Recent Posts */}
                {recentPosts.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-bold text-xl mb-4 text-blog-heading">Recent posts</h3>

                    <div className="space-y-4">
                      {recentPosts.map((post) => (
                        <div
                          key={post.id}
                          className="group cursor-pointer"
                          onClick={() =>
                            (window.location.href = `/blog/${category?.slug}/${post.slug}`)
                          }
                        >
                          <div className="flex gap-3">
                            {post.featured_image && (
                              <img
                                src={post.featured_image}
                                alt={post.title}
                                className="w-20 h-20 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm group-hover:text-accent transition-colors line-clamp-2 text-blog-heading">
                                {post.title}
                              </h4>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </aside>

              {/* Blog Content */}
              <div className="space-y-8">
                {blog.featured_image && (
                  <div className="aspect-video overflow-hidden rounded-lg">
                    <img
                      src={blog.featured_image}
                      alt={blog.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <article 
                  className="prose prose-lg max-w-none text-blog-text leading-relaxed prose-headings:text-blog-heading prose-p:text-blog-text prose-strong:text-blog-heading prose-li:text-blog-text"
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />

                {category && (
                  <RelatedSearches blogId={blog.id} categoryId={category.id} />
                )}
              </div>
            </div>
          </div>

          {/* Footer Recent Posts */}
          {recentPosts.length > 0 && (
            <div className="max-w-5xl mx-auto mt-16">
              <h2 className="text-3xl font-bold mb-8 text-blog-heading">Recent posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="group cursor-pointer border border-blog-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    onClick={() => (window.location.href = `/blog/${category?.slug}/${post.slug}`)}
                  >
                    {post.featured_image && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors text-blog-heading">
                        {post.title}
                      </h3>
                      <p className="text-sm text-blog-meta">By {post.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </>
  );
};

export default BlogPost;
