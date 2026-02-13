import Header from "@/components/Header";
import HostingDashboard from "@/components/HostingDashboard";
import PersonalCalendar from "@/components/PersonalCalendar";

const Organize = () => {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <PersonalCalendar />
      <HostingDashboard />
    </main>
  );
};

export default Organize;
