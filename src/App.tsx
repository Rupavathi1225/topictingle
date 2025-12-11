import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CategoryPage from "./pages/CategoryPage";
import BlogPost from "./pages/BlogPost";
import Admin from "./pages/Admin";
import AdminNew from "./pages/AdminNew";
import RelatedSearchPage from "./pages/RelatedSearchPage";
import NotFound from "./pages/NotFound";
import PreLandingPage from "./pages/PreLandingPage";
import { WebResults } from "./pages/WebResults";
import { DataOrbitZoneWebResults } from "./pages/DataOrbitZoneWebResults";
import { SearchProjectWebResults } from "./pages/SearchProjectWebResults";
import DataOrbitZonePreLanding from "./pages/DataOrbitZonePreLanding";
import SearchProjectPreLanding from "./pages/SearchProjectPreLanding";
import DataOrbitZoneHome from "./pages/DataOrbitZoneHome";
import DataOrbitZoneCategoryPage from "./pages/DataOrbitZoneCategoryPage";
import DataOrbitZoneBlogPost from "./pages/DataOrbitZoneBlogPost";
import OfferGrabZoneBlogPost from "./pages/OfferGrabZoneBlogPost";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:categorySlug" element={<CategoryPage />} />
          <Route path="/blog/:categorySlug/:blogSlug" element={<BlogPost />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin2" element={<AdminNew />} />
          <Route path="/related-search" element={<RelatedSearchPage />} />
          <Route path="/prelanding" element={<PreLandingPage />} />
          
          {/* TopicMingle Web Results */}
          <Route path="/wr" element={<WebResults />} />
          
          {/* DataOrbitZone Site */}
          <Route path="/dataorbit" element={<DataOrbitZoneHome />} />
          <Route path="/dataorbit/category/:categorySlug" element={<DataOrbitZoneCategoryPage />} />
          <Route path="/dataorbit/blog/:categorySlug/:blogSlug" element={<DataOrbitZoneBlogPost />} />
          <Route path="/dataorbit/wr" element={<DataOrbitZoneWebResults />} />
          <Route path="/dataorbit/prelanding" element={<DataOrbitZonePreLanding />} />
          
          {/* OfferGrabZone Site */}
          <Route path="/offergrabzone/blog/:blogSlug" element={<OfferGrabZoneBlogPost />} />
          
          {/* SearchProject Routes */}
          <Route path="/searchproject/wr" element={<SearchProjectWebResults />} />
          <Route path="/searchproject/prelanding" element={<SearchProjectPreLanding />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
