import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header';
import JoinVendorDialog from '@/components/vendor/JoinVendorDialog';
import EmployeeHoursTracker from '@/components/vendor/EmployeeHoursTracker';
import EmployeeEventAssignments from '@/components/vendor/EmployeeEventAssignments';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmployeeRole } from '@/hooks/useVendorEmployees';
import { Store, Clock, Calendar, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmploymentRecord {
  id: string;
  vendor_id: string;
  role: EmployeeRole;
  status: string;
  hired_at: string | null;
  vendor: {
    id: string;
    business_name: string;
    avatar_url: string | null;
  };
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  event_manager: 'Event Manager',
  warehouse_manager: 'Warehouse Manager',
  retail_manager: 'Retail Manager',
  orders_manager: 'Orders Manager',
  warehouse_staff: 'Warehouse Staff',
  retail_staff: 'Retail Staff',
  event_staff: 'Event Staff'
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [employments, setEmployments] = useState<EmploymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployment, setSelectedEmployment] = useState<EmploymentRecord | null>(null);

  useEffect(() => {
    if (user) {
      fetchEmployments();
    }
  }, [user]);

  const fetchEmployments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vendor_employees')
        .select('id, vendor_id, role, status, hired_at, vendors(id, business_name, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const formatted = (data || []).map(e => ({
        ...e,
        vendor: e.vendors as any
      })) as EmploymentRecord[];

      setEmployments(formatted);
      if (formatted.length > 0 && !selectedEmployment) {
        setSelectedEmployment(formatted[0]);
      }
    } catch (error) {
      console.error('Error fetching employments:', error);
    } finally {
      setLoading(false);
    }
  };

  const isManager = (role: EmployeeRole) => {
    return ['event_manager', 'warehouse_manager', 'retail_manager', 'orders_manager'].includes(role);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-4">
              Please sign in to access your employee dashboard.
            </p>
            <Link to="/auth">
              <button className="text-primary hover:underline">Sign In</button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Employee Dashboard</h1>
            <p className="text-muted-foreground">Manage your work assignments and hours</p>
          </div>
          <JoinVendorDialog onSuccess={fetchEmployments} />
        </div>

        {employments.length === 0 ? (
          <Card className="text-center p-12">
            <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Team Memberships</h2>
            <p className="text-muted-foreground mb-6">
              You're not currently a member of any vendor teams.
              <br />
              Ask a vendor for an invite code to join their team.
            </p>
            <JoinVendorDialog />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Employer List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Your Employers
              </h3>
              {employments.map((emp) => (
                <Card
                  key={emp.id}
                  className={`cursor-pointer transition-all ${selectedEmployment?.id === emp.id ? 'ring-2 ring-primary' : 'hover:bg-accent/50'}`}
                  onClick={() => setSelectedEmployment(emp)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={emp.vendor.avatar_url || ''} />
                        <AvatarFallback>
                          {emp.vendor.business_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{emp.vendor.business_name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[emp.role]}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {selectedEmployment && (
                <Tabs defaultValue="hours">
                  <TabsList className="mb-4">
                    <TabsTrigger value="hours" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Hours
                    </TabsTrigger>
                    <TabsTrigger value="events" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Events
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="hours">
                    <EmployeeHoursTracker employeeId={selectedEmployment.id} />
                  </TabsContent>

                  <TabsContent value="events">
                    <EmployeeEventAssignments
                      employeeId={selectedEmployment.id}
                      vendorId={selectedEmployment.vendor_id}
                      isManager={isManager(selectedEmployment.role)}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmployeeDashboard;
