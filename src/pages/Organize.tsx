import Header from "@/components/Header";
import HostingDashboard from "@/components/HostingDashboard";

const Organize = () => {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <h1 className="sr-only">Manage Events</h1>
      <HostingDashboard />
    </main>
  );
};

export default Organize;

