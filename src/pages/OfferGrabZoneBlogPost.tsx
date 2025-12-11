import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { offerGrabZoneClient } from "@/integrations/offergrabzone/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { format } from "date-fns";
import { ChevronRight, Search } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  featured_image_url: string | null;
  created_at: string;
  content: string | null;
  category: string | null;
}

interface RelatedSearch {
  id: string;
  title: string;
  serial_number: number;
  target_wr: number;
  is_active: boolean;
  blog_id: string | null;
}

const OfferGrabZoneBlogPost = () => {
  const { blogSlug } = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [recentPosts, setRecentPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch blog by slug
      const { data: blogData, error } = await offerGrabZoneClient
        .from("blogs")
        .select("*")
        .eq("slug", blogSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !blogData) {
        setLoading(false);
        return;
      }

      setBlog(blogData as Blog);

      // Fetch related searches for this blog
      const { data: searchesData } = await offerGrabZoneClient
        .from("related_searches")
        .select("*")
        .eq("blog_id", blogData.id)
        .eq("is_active", true)
        .order("serial_number", { ascending: true })
        .limit(4);

      if (searchesData) {
        setRelatedSearches(searchesData as RelatedSearch[]);
      }

      // Fetch recent posts
      const { data: recent } = await offerGrabZoneClient
        .from("blogs")
        .select("*")
        .eq("is_active", true)
        .neq("id", blogData.id)
        .order("created_at", { ascending: false })
        .limit(4);

      if (recent) setRecentPosts(recent as Blog[]);

      setLoading(false);
    };

    load();
  }, [blogSlug]);

  const handleSearchClick = (search: RelatedSearch) => {
    // Navigate to web results page with the search
    window.location.href = `/offergrabzone/wr?page=${search.target_wr}`;
  };

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
        {/* Category + Date Header */}
        <div className="bg-background border-b border-blog-border py-4">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              {blog.category && (
                <span className="text-sm font-semibold text-accent">{blog.category}</span>
              )}
              <span className="mx-2 text-blog-meta">•</span>
              <time className="text-sm text-blog-meta">
                {blog.created_at ? format(new Date(blog.created_at), "MMM dd, yyyy") : ""}
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
              {/* Author Sidebar */}
              <aside className="lg:sticky lg:top-20 self-start">
                <div className="border border-blog-border rounded-lg p-6 bg-card">
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-bold text-3xl mb-3">
                      {blog.author ? blog.author.charAt(0) : "A"}
                    </div>
                    <h3 className="font-bold text-lg text-blog-heading">{blog.author || "Author"}</h3>
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
                          onClick={() => window.location.href = `/offergrabzone/blog/${post.slug}`}
                        >
                          <div className="flex gap-3">
                            {post.featured_image_url && (
                              <img
                                src={post.featured_image_url}
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
                {blog.featured_image_url && (
                  <div className="aspect-video overflow-hidden rounded-lg">
                    <img
                      src={blog.featured_image_url}
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

                {/* Related Searches Section */}
                {relatedSearches.length > 0 && (
                  <div className="my-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Related searches</h3>
                    </div>
                    <div className="grid gap-3">
                      {relatedSearches.map((search) => (
                        <button
                          key={search.id}
                          onClick={() => handleSearchClick(search)}
                          className="flex items-center justify-between p-4 bg-card hover:bg-accent/50 text-foreground rounded-xl transition-all duration-200 group border border-border hover:border-primary/30 hover:shadow-sm"
                        >
                          <span className="text-left font-medium">{search.title}</span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
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
                    onClick={() => window.location.href = `/offergrabzone/blog/${post.slug}`}
                  >
                    {post.featured_image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors text-blog-heading">
                        {post.title}
                      </h3>
                      <p className="text-sm text-blog-meta">By {post.author || "Author"}</p>
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

export default OfferGrabZoneBlogPost;
