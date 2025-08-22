import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, Users, TrendingUp } from 'lucide-react';
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

interface RatingWithUser {
  id: string;
  rating: number;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  };
}

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'fill-current text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

const StoreOwnerDashboard = () => {
  const { profile } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [ratings, setRatings] = useState<RatingWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    
    setLoading(true);
    await Promise.all([fetchStore(), fetchRatings()]);
    setLoading(false);
  };

  const fetchStore = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('store_ratings')
      .select('*')
      .eq('owner_id', profile.id)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // Not found error
        toast({ title: 'Error', description: 'Failed to fetch store', variant: 'destructive' });
      }
    } else {
      setStore(data);
    }
  };

  const fetchRatings = async () => {
    if (!profile) return;

    // First get the store ID
    const { data: storeData } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', profile.id)
      .single();

    if (!storeData) return;

    const { data, error } = await supabase
      .from('ratings')
      .select(`
        id,
        rating,
        created_at,
        profiles:user_id (
          name,
          email
        )
      `)
      .eq('store_id', storeData.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch ratings', variant: 'destructive' });
    } else {
      setRatings(data || []);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">No Store Found</h2>
              <p className="text-muted-foreground">
                You don't have a store associated with your account. Please contact the administrator to set up your store.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Store Dashboard</h1>
      </div>

      {/* Store Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{store.name}</CardTitle>
          <CardDescription>{store.address}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{store.average_rating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Average Rating</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{store.total_ratings}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <StarRating rating={Math.round(store.average_rating)} />
                </div>
                <p className="text-sm text-muted-foreground">Rating Display</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ratings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
          <CardDescription>See what customers are saying about your store</CardDescription>
        </CardHeader>
        <CardContent>
          {ratings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratings.map((rating) => (
                  <TableRow key={rating.id}>
                    <TableCell className="font-medium">
                      {rating.profiles?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{rating.profiles?.email || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <StarRating rating={rating.rating} />
                        <span className="text-sm">({rating.rating}/5)</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(rating.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No reviews yet. Encourage customers to rate your store!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreOwnerDashboard;