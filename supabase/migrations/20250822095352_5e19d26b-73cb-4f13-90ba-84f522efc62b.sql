-- Fix security issues from previous migration

-- Drop the problematic view and recreate it without security definer
DROP VIEW IF EXISTS public.store_ratings;

-- Create a regular view instead of security definer
CREATE VIEW public.store_ratings AS
SELECT 
  s.*,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(r.id) as total_ratings
FROM public.stores s
LEFT JOIN public.ratings r ON s.id = r.store_id
GROUP BY s.id, s.owner_id, s.name, s.email, s.address, s.created_at, s.updated_at;

-- Update the handle_new_user function to fix search path issue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Default Name (Please Update)'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'normal_user'::public.user_role)
  );
  RETURN NEW;
END;
$$;

-- Update the timestamp function to fix search path issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;