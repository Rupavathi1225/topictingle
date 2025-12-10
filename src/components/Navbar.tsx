import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useTracking } from "@/hooks/useTracking";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Lifestyle", path: "/category/lifestyle" },
  { name: "Education", path: "/category/education" },
  { name: "Wellness", path: "/category/wellness" },
  { name: "Deals", path: "/category/deals" },
  { name: "Job Seeking", path: "/category/job-seeking" },
  { name: "Alternative Learning", path: "/category/alternative-learning" }
];

const Navbar = () => {
  const { trackClick } = useTracking();

  const handleNavClick = (linkName: string) => {
    trackClick(`nav-${linkName.toLowerCase().replace(/\s+/g, '-')}`, linkName);
  };

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link 
            to="/" 
            className="flex items-center space-x-2"
            onClick={() => handleNavClick('logo')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">TT</span>
            </div>
            <span className="text-xl font-bold text-primary">Topic Tingle</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => handleNavClick(link.name)}
                className="text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => trackClick('search-button', 'Search')}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
