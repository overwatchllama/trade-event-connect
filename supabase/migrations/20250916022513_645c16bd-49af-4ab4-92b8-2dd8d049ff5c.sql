-- Create subscriptions table for users to subscribe to vendors and events
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('vendor', 'event')),
  target_id UUID NOT NULL, -- vendor_id or event_id
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a user can only subscribe once to each target
  UNIQUE(user_id, subscription_type, target_id)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" 
ON public.user_subscriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_type_target ON public.user_subscriptions(subscription_type, target_id);

-- Add comments
COMMENT ON TABLE public.user_subscriptions IS 'User subscriptions to vendors and events';
COMMENT ON COLUMN public.user_subscriptions.subscription_type IS 'Type of subscription: vendor or event';
COMMENT ON COLUMN public.user_subscriptions.target_id IS 'ID of the vendor or event being subscribed to';