import Header from "@/components/Header";
import VendingDashboard from "@/components/VendingDashboard";
import PersonalCalendar from "@/components/PersonalCalendar";

const Vending = () => {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <PersonalCalendar />
      <VendingDashboard />
    </main>
  );
};

export default Vending;
