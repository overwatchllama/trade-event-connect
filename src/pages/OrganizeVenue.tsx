import Header from '@/components/Header';
import { ManageVenue } from '@/components/ManageVenue';

const OrganizeVenue = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Organize Venue</h1>
        <ManageVenue />
      </div>
    </div>
  );
};

export default OrganizeVenue;
