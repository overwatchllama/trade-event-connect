import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Search } from "lucide-react";

interface AdvancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
  events: any[];
}

const AdvancedSearch = ({ isOpen, onClose, events }: AdvancedSearchProps) => {
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");

  const handleSearch = () => {
    // Search logic would go here
    console.log("Searching with:", { state, zipCode, city });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Advanced Location Search
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="search" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Filters</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="e.g., CA, NY, TX"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="zipcode">Zip Code</Label>
                <Input
                  id="zipcode"
                  placeholder="e.g., 90210"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="e.g., Los Angeles"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSearch}>
                Search Events
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="map" className="mt-4">
            <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Interactive map with event pins will be displayed here
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {events.length} events found in your area
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedSearch;