import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SubscriptionTiers from "@/components/SubscriptionTiers";
import SimplifiedEventCard from "@/components/SimplifiedEventCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [popularEvents, setPopularEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularEvents = async () => {
      try {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);

        if (eventsData) {
          // Get event days for each event
          const eventIds = eventsData.map(e => e.id);
          const { data: eventDaysData } = await supabase
            .from('event_days')
            .select('event_id, day_date')
            .in('event_id', eventIds)
            .order('day_number', { ascending: true });

          const eventDaysMap = new Map<string, any[]>();
          eventDaysData?.forEach(day => {
            const days = eventDaysMap.get(day.event_id) || [];
            days.push(day);
            eventDaysMap.set(day.event_id, days);
          });

          const transformedEvents = eventsData.map(event => {
            const days = eventDaysMap.get(event.id) || [];
            let dateStr = event.date;
            
            if (event.is_multi_day && days.length > 0) {
              const firstDay = days[0];
              const lastDay = days[days.length - 1];
              dateStr = `${new Date(firstDay.day_date).toLocaleDateString()} - ${new Date(lastDay.day_date).toLocaleDateString()}`;
            } else if (days.length > 0) {
              dateStr = new Date(days[0].day_date).toLocaleDateString();
            }

            return {
              id: event.id,
              title: event.title,
              date: dateStr,
              city: event.city,
              state: event.state,
              cardTypes: event.card_types || [],
              flyerUrl: event.flyer_url
            };
          });

          setPopularEvents(transformedEvents);
        }
      } catch (error) {
        console.error('Error fetching popular events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularEvents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      
      {/* Featured Events Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Popular Events
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover trending trading card events happening near you.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading events...</div>
          ) : popularEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No events available yet. Check back soon!
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {popularEvents.map((event) => (
                <SimplifiedEventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          <div className="text-center">
            <Button variant="hero" size="lg" onClick={() => navigate('/events')}>
              Browse All Events
            </Button>
          </div>
        </div>
      </section>

      <SubscriptionTiers />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of collectors, vendors, and organizers in the ultimate 
            trading card marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="text-lg px-8" onClick={() => navigate('/auth')}>
              Sign Up Free
            </Button>
            <Button variant="secondary" size="lg" className="text-lg px-8" onClick={() => navigate('/events')}>
              Browse Events
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
