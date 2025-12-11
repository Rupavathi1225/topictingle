import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { dataOrbitZoneClient } from "@/integrations/dataorbitzone/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { format } from "date-fns";

interface DzBlog {
  id: string;
  title: string;
  slug: string;
  author: string;
  featured_image: string | null;
  created_at: string | null;
  content: string;
  category_id: number | null;
}

interface DzCategory {
  id: number;
  name: string;
  slug: string;
}

interface RelatedSearch {
  id: string;
  search_text: string;
  display_order: number;
  blog_id: string;
}

const DataOrbitZoneBlogPost = () => {
  const { categorySlug, blogSlug } = useParams();
  const [blog, setBlog] = useState<DzBlog | null>(null);
  const [category, setCategory] = useState<DzCategory | null>(null);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [recentPosts, setRecentPosts] = useState<DzBlog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: blogData, error } = await dataOrbitZoneClient
        .from("dz_blogs")
        .select("*")
        .eq("slug", blogSlug)
        .eq("status", "published")
        .maybeSingle();

      if (error || !blogData) {
        setLoading(false);
        return;
      }

      setBlog(blogData as DzBlog);

      // Load related searches for this blog
      const { data: searches } = await dataOrbitZoneClient
        .from("dz_related_searches")
        .select("*")
        .eq("blog_id", blogData.id)
        .eq("is_active", true)
        .order("display_order");

      if (searches) {
        setRelatedSearches(searches as RelatedSearch[]);
      }

      if (blogData.category_id) {
        const { data: categoryData } = await dataOrbitZoneClient
          .from("dz_categories")
          .select("id, name, slug")
          .eq("id", blogData.category_id)
          .maybeSingle();

        if (categoryData) setCategory(categoryData as DzCategory);

        const { data: recent } = await dataOrbitZoneClient
          .from("dz_blogs")
          .select("*")
          .eq("status", "published")
          .eq("category_id", blogData.category_id)
          .neq("id", blogData.id)
          .order("created_at", { ascending: false })
          .limit(4);

        if (recent) setRecentPosts(recent as DzBlog[]);
      }

      setLoading(false);
    };

    load();
  }, [blogSlug, categorySlug]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">Loading...</div>
      </>
    );
  }

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
        <div className="bg-background border-b border-blog-border py-4">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              {category && <span className="text-sm font-semibold text-accent">{category.name}</span>}
              <span className="mx-2 text-blog-meta">•</span>
              <time className="text-sm text-blog-meta">
                {blog.created_at ? format(new Date(blog.created_at), "MMM dd, yyyy") : ""}
              </time>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 leading-tight text-blog-heading">
              {blog.title}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
              <aside className="lg:sticky lg:top-20 self-start">
                <div className="border border-blog-border rounded-lg p-6 bg-card">
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-bold text-3xl mb-3">
                      {blog.author.charAt(0)}
                    </div>
                    <h3 className="font-bold text-lg text-blog-heading">{blog.author}</h3>
                  </div>
                </div>

                {recentPosts.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-bold text-xl mb-4 text-blog-heading">Recent posts</h3>
                    <div className="space-y-4">
                      {recentPosts.map((post) => (
                        <div
                          key={post.id}
                          className="group cursor-pointer"
                          onClick={() =>
                            (window.location.href = `/dataorbit/blog/${category?.slug}/${post.slug}`)
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

                <article className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-blog-text leading-relaxed text-base">
                    {blog.content}
                  </div>
                </article>

                {/* Related Searches Section - Under Content */}
                {relatedSearches.length > 0 && (
                  <div className="mt-8 border border-blog-border rounded-lg p-6 bg-card">
                    <h3 className="font-bold text-xl mb-4 text-blog-heading">Related Searches</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {relatedSearches.slice(0, 4).map((search) => (
                        <a
                          key={search.id}
                          href={`/dataorbit/wr?id=${search.id}&wr=${search.display_order}`}
                          className="block p-4 border border-border rounded-lg hover:bg-accent/10 transition-colors text-foreground"
                        >
                          {search.search_text}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {recentPosts.length > 0 && (
            <div className="max-w-5xl mx-auto mt-16">
              <h2 className="text-3xl font-bold mb-8 text-blog-heading">Recent posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="group cursor-pointer border border-blog-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    onClick={() =>
                      (window.location.href = `/dataorbit/blog/${category?.slug}/${post.slug}`)
                    }
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

export default DataOrbitZoneBlogPost;
