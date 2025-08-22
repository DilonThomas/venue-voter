import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from '@/components/AdminDashboard';
import UserDashboard from '@/components/UserDashboard';
import StoreOwnerDashboard from '@/components/StoreOwnerDashboard';
import Navbar from '@/components/Navbar';

const Dashboard = () => {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'store_owner':
        return <StoreOwnerDashboard />;
      default:
        return <UserDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;