import Header from "@/components/Header";
import VendingDashboard from "@/components/VendingDashboard";

const Vending = () => {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <h1 className="sr-only">Manage Vending</h1>
      <VendingDashboard />
    </main>
  );
};

export default Vending;

