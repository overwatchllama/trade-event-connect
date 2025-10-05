import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Upload } from "lucide-react";

const SponsorProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sponsorProfile, setSponsorProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    company_description: "",
    logo_url: "",
    website_url: "",
    contact_email: "",
    contact_phone: "",
  });

  useEffect(() => {
    fetchSponsorProfile();
  }, [user]);

  const fetchSponsorProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSponsorProfile(data);
        setFormData({
          company_name: data.company_name || "",
          company_description: data.company_description || "",
          logo_url: data.logo_url || "",
          website_url: data.website_url || "",
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
        });
      }
    } catch (error) {
      console.error("Error fetching sponsor profile:", error);
      toast.error("Failed to load sponsor profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !user) return;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `sponsor-logos/${fileName}`;

      // Create bucket if it doesn't exist
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === "sponsor-logos");

      if (!bucketExists) {
        await supabase.storage.createBucket("sponsor-logos", { public: true });
      }

      const { error: uploadError } = await supabase.storage
        .from("sponsor-logos")
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("sponsor-logos").getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });
      setLogoFile(null);
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.company_name) {
      toast.error("Company name is required");
      return;
    }

    setSaving(true);
    try {
      if (sponsorProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("sponsors")
          .update(formData)
          .eq("id", sponsorProfile.id);

        if (error) throw error;
        toast.success("Sponsor profile updated successfully!");
      } else {
        // Create new profile
        const { error } = await supabase.from("sponsors").insert({
          ...formData,
          user_id: user.id,
        });

        if (error) throw error;
        toast.success("Sponsor profile created successfully!");
      }

      fetchSponsorProfile();
    } catch (error: any) {
      console.error("Error saving sponsor profile:", error);
      toast.error(error.message || "Failed to save sponsor profile");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Sponsor Profile</h1>
          <p className="text-muted-foreground">
            Manage your company's sponsorship profile
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Provide details about your company for event sponsorships
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange("company_name", e.target.value)}
                  placeholder="Enter your company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_description">Company Description</Label>
                <Textarea
                  id="company_description"
                  value={formData.company_description}
                  onChange={(e) =>
                    handleInputChange("company_description", e.target.value)
                  }
                  placeholder="Tell us about your company..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Company Logo</Label>
                {formData.logo_url && (
                  <div className="mb-2">
                    <img
                      src={formData.logo_url}
                      alt="Company logo"
                      className="h-24 w-24 object-contain rounded border"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    onClick={handleLogoUpload}
                    disabled={!logoFile || uploading}
                    variant="outline"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => handleInputChange("website_url", e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange("contact_email", e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Sponsor Profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SponsorProfile;
