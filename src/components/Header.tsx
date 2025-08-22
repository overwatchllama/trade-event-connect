import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Users, Store } from "lucide-react";

const Header = () => {
  const location = useLocation();

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">CardEvents</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/events" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/events' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Browse Events
            </Link>
            <Link 
              to="/vendors" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/vendors' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Find Vendors
            </Link>
            <Link 
              to="/create-event" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/create-event' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Host Event
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
            <Button variant="hero" size="sm">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;