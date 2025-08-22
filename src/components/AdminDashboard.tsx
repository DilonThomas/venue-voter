import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Store, Star, Plus, Search, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

interface DashboardStats {
  totalUsers: number;
  totalStores: number;
  totalRatings: number;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  address?: string;
  role: 'admin' | 'normal_user' | 'store_owner';
}

interface Store {
  id: string;
  name: string;
  email: string;
  address: string;
  average_rating: number;
  total_ratings: number;
}

const userSchema = z.object({
  name: z.string().min(20, 'Name must be at least 20 characters').max(60, 'Name must be at most 60 characters'),
  email: z.string().email('Invalid email address'),
  address: z.string().max(400, 'Address must be at most 400 characters').optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(16, 'Password must be at most 16 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  role: z.enum(['admin', 'normal_user', 'store_owner'])
});

const storeSchema = z.object({
  name: z.string().min(20, 'Name must be at least 20 characters').max(60, 'Name must be at most 60 characters'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required').max(400, 'Address must be at most 400 characters'),
  ownerEmail: z.string().email('Invalid owner email address')
});

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalStores: 0, totalRatings: 0 });
  const [users, setUsers] = useState<Profile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms state
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    address: '',
    password: '',
    role: 'normal_user' as 'admin' | 'normal_user' | 'store_owner'
  });
  const [storeForm, setStoreForm] = useState({
    name: '',
    email: '',
    address: '',
    ownerEmail: ''
  });
  
  // Filters and search
  const [userFilter, setUserFilter] = useState({ name: '', email: '', address: '', role: '' });
  const [storeFilter, setStoreFilter] = useState({ name: '', email: '', address: '' });
  
  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchStores()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const [usersResult, storesResult, ratingsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('stores').select('id', { count: 'exact' }),
      supabase.from('ratings').select('id', { count: 'exact' })
    ]);

    setStats({
      totalUsers: usersResult.count || 0,
      totalStores: storesResult.count || 0,
      totalRatings: ratingsResult.count || 0
    });
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } else {
      setUsers(data || []);
    }
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

  const validateUserForm = () => {
    try {
      userSchema.parse(userForm);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const validateStoreForm = () => {
    try {
      storeSchema.parse(storeForm);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleCreateUser = async () => {
    if (!validateUserForm()) return;

    const { error } = await supabase.auth.admin.createUser({
      email: userForm.email,
      password: userForm.password,
      user_metadata: {
        name: userForm.name,
        address: userForm.address,
        role: userForm.role
      }
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'User created successfully' });
      setUserForm({ name: '', email: '', address: '', password: '', role: 'normal_user' });
      setUserDialogOpen(false);
      fetchData();
    }
  };

  const handleCreateStore = async () => {
    if (!validateStoreForm()) return;

    // First find the owner profile
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', storeForm.ownerEmail)
      .single();

    if (ownerError || !ownerProfile) {
      toast({ title: 'Error', description: 'Store owner not found', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('stores')
      .insert({
        name: storeForm.name,
        email: storeForm.email,
        address: storeForm.address,
        owner_id: ownerProfile.id
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Store created successfully' });
      setStoreForm({ name: '', email: '', address: '', ownerEmail: '' });
      setStoreDialogOpen(false);
      fetchData();
    }
  };

  const filteredUsers = users.filter(user => {
    return (
      (!userFilter.name || user.name.toLowerCase().includes(userFilter.name.toLowerCase())) &&
      (!userFilter.email || user.email.toLowerCase().includes(userFilter.email.toLowerCase())) &&
      (!userFilter.address || user.address?.toLowerCase().includes(userFilter.address.toLowerCase())) &&
      (!userFilter.role || user.role === userFilter.role)
    );
  });

  const filteredStores = stores.filter(store => {
    return (
      (!storeFilter.name || store.name.toLowerCase().includes(storeFilter.name.toLowerCase())) &&
      (!storeFilter.email || store.email.toLowerCase().includes(storeFilter.email.toLowerCase())) &&
      (!storeFilter.address || store.address.toLowerCase().includes(storeFilter.address.toLowerCase()))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStores}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ratings</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRatings}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage users and their roles</CardDescription>
            </div>
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new user account</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Textarea
                      value={userForm.address}
                      onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                      className={errors.address ? 'border-destructive' : ''}
                    />
                    {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal_user">Normal User</SelectItem>
                        <SelectItem value="store_owner">Store Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateUser} className="w-full">
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* User Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="Filter by name"
              value={userFilter.name}
              onChange={(e) => setUserFilter({ ...userFilter, name: e.target.value })}
            />
            <Input
              placeholder="Filter by email"
              value={userFilter.email}
              onChange={(e) => setUserFilter({ ...userFilter, email: e.target.value })}
            />
            <Input
              placeholder="Filter by address"
              value={userFilter.address}
              onChange={(e) => setUserFilter({ ...userFilter, address: e.target.value })}
            />
            <Select value={userFilter.role} onValueChange={(value) => setUserFilter({ ...userFilter, role: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="normal_user">Normal User</SelectItem>
                <SelectItem value="store_owner">Store Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.address || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stores Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Stores</CardTitle>
              <CardDescription>Manage stores and their information</CardDescription>
            </div>
            <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Store
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Store</DialogTitle>
                  <DialogDescription>Create a new store</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Store Name</Label>
                    <Input
                      value={storeForm.name}
                      onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  <div>
                    <Label>Store Email</Label>
                    <Input
                      type="email"
                      value={storeForm.email}
                      onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div>
                    <Label>Store Address</Label>
                    <Textarea
                      value={storeForm.address}
                      onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                      className={errors.address ? 'border-destructive' : ''}
                    />
                    {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                  </div>
                  <div>
                    <Label>Owner Email</Label>
                    <Input
                      type="email"
                      value={storeForm.ownerEmail}
                      onChange={(e) => setStoreForm({ ...storeForm, ownerEmail: e.target.value })}
                      className={errors.ownerEmail ? 'border-destructive' : ''}
                    />
                    {errors.ownerEmail && <p className="text-sm text-destructive">{errors.ownerEmail}</p>}
                  </div>
                  <Button onClick={handleCreateStore} className="w-full">
                    Create Store
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Store Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="Filter by name"
              value={storeFilter.name}
              onChange={(e) => setStoreFilter({ ...storeFilter, name: e.target.value })}
            />
            <Input
              placeholder="Filter by email"
              value={storeFilter.email}
              onChange={(e) => setStoreFilter({ ...storeFilter, email: e.target.value })}
            />
            <Input
              placeholder="Filter by address"
              value={storeFilter.address}
              onChange={(e) => setStoreFilter({ ...storeFilter, address: e.target.value })}
            />
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>{store.name}</TableCell>
                  <TableCell>{store.email}</TableCell>
                  <TableCell>{store.address}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-current text-yellow-400" />
                      <span>{store.average_rating.toFixed(1)} ({store.total_ratings})</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;