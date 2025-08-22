import { useState } from "react";
import Header from "@/components/Header";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MapPin, Calendar } from "lucide-react";

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCardType, setSelectedCardType] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");

  // Mock data for events
  const events = [
    {
      id: "1",
      title: "Pokemon Regional Tournament",
      date: "March 15, 2024",
      time: "10:00 AM",
      location: "Convention Center",
      city: "Los Angeles",
      state: "CA",
      organizer: "West Coast Cards",
      rating: 4.8,
      attendees: 156,
      maxAttendees: 200,
      tablesAvailable: 12,
      totalTables: 40,
      cardTypes: ["Pokemon", "TCG"],
      price: 25
    },
    {
      id: "2", 
      title: "Magic: The Gathering Draft Night",
      date: "March 18, 2024",
      time: "7:00 PM",
      location: "Gaming Lounge",
      city: "San Francisco",
      state: "CA",
      organizer: "Bay Area MTG",
      rating: 4.6,
      attendees: 32,
      maxAttendees: 48,
      tablesAvailable: 4,
      totalTables: 12,
      cardTypes: ["MTG", "Draft"],
      price: 15
    },
    {
      id: "3",
      title: "Sports Card Show & Trade",
      date: "March 20, 2024", 
      time: "11:00 AM",
      location: "Sports Arena",
      city: "San Diego",
      state: "CA",
      organizer: "SoCal Sports Cards",
      rating: 4.9,
      attendees: 89,
      maxAttendees: 150,
      tablesAvailable: 8,
      totalTables: 25,
      cardTypes: ["Sports", "Baseball", "Football"],
      price: 20
    },
    {
      id: "4",
      title: "One Piece Card Game Championship",
      date: "March 22, 2024",
      time: "2:00 PM", 
      location: "Anime Convention Hall",
      city: "Anaheim",
      state: "CA",
      organizer: "Orange County Gaming",
      rating: 4.7,
      attendees: 67,
      maxAttendees: 100,
      tablesAvailable: 6,
      totalTables: 20,
      cardTypes: ["One Piece", "Anime"],
      price: 30
    }
  ];

  const cardTypes = ["all", "Pokemon", "MTG", "Sports", "One Piece", "Yu-Gi-Oh"];
  const locations = ["all", "Los Angeles, CA", "San Francisco, CA", "San Diego, CA", "Anaheim, CA"];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Discover Trading Card Events
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Find Pokemon, MTG, sports cards, and other trading card events near you.
          </p>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events by name, location, or organizer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCardType} onValueChange={setSelectedCardType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Card Type" />
              </SelectTrigger>
              <SelectContent>
                {cardTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "all" ? "All Card Types" : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location === "all" ? "All Locations" : location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Active Filters */}
          <div className="flex gap-2 mb-6">
            {selectedCardType !== "all" && (
              <Badge variant="secondary" className="gap-2">
                <Calendar className="w-3 h-3" />
                {selectedCardType}
              </Badge>
            )}
            {selectedLocation !== "all" && (
              <Badge variant="secondary" className="gap-2">
                <MapPin className="w-3 h-3" />
                {selectedLocation}
              </Badge>
            )}
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Load More Events
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Events;