import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, Search, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Store {
  id: string;
  name: string;
  address: string;
  email: string;
  average_rating: number;
  total_ratings: number;
}

interface UserRating {
  id: string;
  rating: number;
  store_id: string;
}

const StarRating = ({ rating, onRatingChange, readonly = false }: { 
  rating: number; 
  onRatingChange?: (rating: number) => void; 
  readonly?: boolean;
}) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 cursor-pointer ${
            star <= rating ? 'fill-current text-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => !readonly && onRatingChange?.(star)}
        />
      ))}
    </div>
  );
};

const UserDashboard = () => {
  const { profile } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [userRatings, setUserRatings] = useState<UserRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [newRating, setNewRating] = useState(0);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    
    setLoading(true);
    await Promise.all([fetchStores(), fetchUserRatings()]);
    setLoading(false);
  };

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from('store_ratings')
      .select('*')
      .order('name');
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch stores', variant: 'destructive' });
    } else {
      setStores(data || []);
    }
  };

  const fetchUserRatings = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', profile.id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch ratings', variant: 'destructive' });
    } else {
      setUserRatings(data || []);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedStore || !profile || newRating === 0) return;

    const existingRating = userRatings.find(r => r.store_id === selectedStore.id);

    if (existingRating) {
      // Update existing rating
      const { error } = await supabase
        .from('ratings')
        .update({ rating: newRating })
        .eq('id', existingRating.id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to update rating', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Rating updated successfully' });
        setRatingDialogOpen(false);
        fetchData();
      }
    } else {
      // Create new rating
      const { error } = await supabase
        .from('ratings')
        .insert({
          user_id: profile.id,
          store_id: selectedStore.id,
          rating: newRating
        });

      if (error) {
        toast({ title: 'Error', description: 'Failed to submit rating', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Rating submitted successfully' });
        setRatingDialogOpen(false);
        fetchData();
      }
    }
  };

  const openRatingDialog = (store: Store) => {
    setSelectedStore(store);
    const existingRating = userRatings.find(r => r.store_id === store.id);
    setNewRating(existingRating?.rating || 0);
    setRatingDialogOpen(true);
  };

  const getUserRatingForStore = (storeId: string) => {
    return userRatings.find(r => r.store_id === storeId)?.rating || 0;
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Store Directory</h1>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Stores</CardTitle>
          <CardDescription>Find stores by name or address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStores.map((store) => {
          const userRating = getUserRatingForStore(store.id);
          return (
            <Card key={store.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{store.name}</CardTitle>
                <CardDescription>{store.address}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Rating</p>
                    <div className="flex items-center space-x-2">
                      <StarRating rating={store.average_rating} readonly />
                      <span className="text-sm text-muted-foreground">
                        ({store.total_ratings} reviews)
                      </span>
                    </div>
                  </div>
                </div>

                {userRating > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Your Rating</p>
                    <StarRating rating={userRating} readonly />
                  </div>
                )}

                <Button
                  onClick={() => openRatingDialog(store)}
                  className="w-full"
                  variant={userRating > 0 ? "outline" : "default"}
                >
                  {userRating > 0 ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Rating
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      Rate Store
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredStores.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">
              No stores found matching your search.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate {selectedStore?.name}</DialogTitle>
            <DialogDescription>
              How would you rate your experience with this store?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <StarRating
                rating={newRating}
                onRatingChange={setNewRating}
              />
              <p className="text-sm text-muted-foreground">
                Click on a star to rate (1-5 stars)
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleSubmitRating}
                disabled={newRating === 0}
                className="flex-1"
              >
                {userRatings.find(r => r.store_id === selectedStore?.id) ? 'Update Rating' : 'Submit Rating'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setRatingDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;