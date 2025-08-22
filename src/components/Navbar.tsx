import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, Store } from 'lucide-react';

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (!user || !profile) return null;

  const getRoleIcon = () => {
    switch (profile.role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'store_owner':
        return <Store className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleDisplay = () => {
    switch (profile.role) {
      case 'admin':
        return 'System Administrator';
      case 'store_owner':
        return 'Store Owner';
      default:
        return 'User';
    }
  };

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-foreground">
              Venue Voter
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {getRoleIcon()}
              <span>{getRoleDisplay()}</span>
            </div>
            
            <div className="text-sm text-foreground">
              {profile.name}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;