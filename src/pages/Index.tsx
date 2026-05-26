import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { TryTheDemoSection } from "@/components/demo/TryTheDemoSection";

import SimplifiedEventCard from "@/components/SimplifiedEventCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const navigate = useNavigate();
  const [popularEvents, setPopularEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>("all");

  useEffect(() => {
    const fetchPopularEvents = async () => {
      try {
        // Single query with embedded event_days to eliminate sequential round-trip
        const { data: eventsData } = await supabase
          .from('events')
          .select('*, event_days(event_id, day_date, day_number)')
          .order('created_at', { ascending: false })
          .limit(6);

        if (eventsData) {
          const eventDaysMap = new Map<string, any[]>();
          eventsData.forEach((event: any) => {
            const days = (event.event_days || [])
              .slice()
              .sort((a: any, b: any) => a.day_number - b.day_number);
            eventDaysMap.set(event.id, days);
          });

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const transformedEvents = eventsData.map(event => {
            const days = eventDaysMap.get(event.id) || [];
            let dateStr = event.date;
            let lastEventDate: Date | null = null;
            
            if (event.is_multi_day && days.length > 0) {
              const firstDay = days[0];
              const lastDay = days[days.length - 1];
              dateStr = `${new Date(firstDay.day_date).toLocaleDateString()} - ${new Date(lastDay.day_date).toLocaleDateString()}`;
              lastEventDate = new Date(lastDay.day_date);
            } else if (days.length > 0) {
              dateStr = new Date(days[0].day_date).toLocaleDateString();
              lastEventDate = new Date(days[0].day_date);
            }

            return {
              id: event.id,
              title: event.title,
              date: dateStr,
              city: event.city,
              state: event.state,
              cardTypes: event.card_types || [],
              flyerUrl: event.flyer_url,
              lastEventDate
            };
          }).filter(event => {
            if (event.lastEventDate) {
              return event.lastEventDate >= today;
            }
            return true;
          }).sort((a, b) => {
            if (!a.lastEventDate) return 1;
            if (!b.lastEventDate) return -1;
            return a.lastEventDate.getTime() - b.lastEventDate.getTime();
          });

          setPopularEvents(transformedEvents);
          setFilteredEvents(transformedEvents);
        }
      } catch (error) {
        console.error('Error fetching popular events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularEvents();
  }, []);

  useEffect(() => {
    if (selectedState === "all") {
      setFilteredEvents(popularEvents);
    } else {
      setFilteredEvents(popularEvents.filter(event => event.state === selectedState));
    }
  }, [selectedState, popularEvents]);

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero />
      <TryTheDemoSection />

      {/* Featured Events Section */}
      <section className="py-10 md:py-20 bg-background">
        <div className="container mx-auto px-3 md:px-4">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Popular Events
            </h2>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover trending trading card events happening near you.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[300px] md:h-[340px] bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : popularEvents.length === 0 ? (
            <div className="text-center py-8">
              <Button variant="hero" size="lg" onClick={() => navigate('/events')}>
                Browse All Events
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8">
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-[200px]" aria-label="Filter events by state">
                    <SelectValue placeholder="Filter by State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {Array.from(new Set(popularEvents.map(e => e.state))).sort().map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="hero" size="lg" onClick={() => navigate('/events')}>
                  Browse All Events
                </Button>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No events found in {selectedState}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredEvents.map((event) => (
                    <SimplifiedEventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      

      {/* CTA Section */}
      <section className="py-10 md:py-20 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-base md:text-xl opacity-90 max-w-2xl mx-auto mb-6 md:mb-8">
            Join thousands of collectors, vendors, and organizers in the ultimate 
            trading card marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <Button variant="secondary" size="lg" className="text-base md:text-lg px-6 md:px-8" onClick={() => navigate('/auth')}>
              Sign Up Free
            </Button>
            <Button variant="secondary" size="lg" className="text-base md:text-lg px-6 md:px-8" onClick={() => navigate('/events')}>
              Browse Events
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Index;
