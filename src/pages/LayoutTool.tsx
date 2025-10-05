import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { LayoutDrawingTool } from "@/components/LayoutDrawingTool";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LayoutTool = () => {
  const navigate = useNavigate();
  const { subscription_tier, loading } = useSubscription();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [subscription_tier, loading]);

  const checkAccess = async () => {
    if (loading) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to access this feature");
        navigate("/auth");
        return;
      }

      if (subscription_tier === "vendor_pro") {
        setHasAccess(true);
      } else {
        toast.error("This feature requires Vendor Pro subscription");
        navigate("/subscription");
      }
    } catch (error) {
      console.error("Error checking access:", error);
      toast.error("Failed to verify subscription");
      navigate("/");
    }
  };

  if (loading || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Layout Drawing Tool</h1>
            <p className="text-muted-foreground">Design your vendor booth layout</p>
          </div>
        </div>

        <LayoutDrawingTool />

        <Card className="mt-6 p-4">
          <h3 className="font-semibold mb-2">Tips:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Use the drawing tools to sketch your booth layout</li>
            <li>Add rectangles for tables and display areas</li>
            <li>Use circles for special features or focal points</li>
            <li>Save your layout as JSON to reload it later</li>
            <li>Download as PNG to share with event organizers</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default LayoutTool;
