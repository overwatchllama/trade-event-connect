import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVendorEmployees, EmployeeRole, VendorEmployee } from '@/hooks/useVendorEmployees';
import { Users, UserPlus, Copy, Trash2, Clock, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import EmployeeHoursTracker from './EmployeeHoursTracker';
import PayrollSummaryReport from './PayrollSummaryReport';
const ROLE_LABELS: Record<EmployeeRole, string> = {
  event_manager: 'Event Manager',
  warehouse_manager: 'Warehouse Manager',
  retail_manager: 'Retail Manager',
  orders_manager: 'Orders Manager',
  warehouse_staff: 'Warehouse Staff',
  retail_staff: 'Retail Staff',
  event_staff: 'Event Staff'
};

const ROLE_COLORS: Record<EmployeeRole, string> = {
  event_manager: 'bg-purple-500',
  warehouse_manager: 'bg-blue-500',
  retail_manager: 'bg-green-500',
  orders_manager: 'bg-orange-500',
  warehouse_staff: 'bg-blue-300',
  retail_staff: 'bg-green-300',
  event_staff: 'bg-purple-300'
};

interface EmployeeManagementProps {
  vendorId: string;
}

const EmployeeManagement = ({ vendorId }: EmployeeManagementProps) => {
  const { employees, loading, createInvite, updateEmployeeRole, updateEmployeeStatus, removeEmployee, deleteInvite } = useVendorEmployees(vendorId);
  const [newInviteRole, setNewInviteRole] = useState<EmployeeRole>('event_staff');
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmployeeForHours, setSelectedEmployeeForHours] = useState<VendorEmployee | null>(null);

  const activeEmployees = employees.filter(e => e.status === 'active' && e.user_id);
  const pendingInvites = employees.filter(e => e.status === 'pending' && !e.user_id && e.invite_code);
  const inactiveEmployees = employees.filter(e => e.status === 'inactive');

  const handleCreateInvite = async () => {
    const code = await createInvite(newInviteRole);
    if (code) {
      setNewInviteCode(code);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied to clipboard');
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewInviteCode(null);
    setNewInviteRole('event_staff');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>
              Manage your employees and their roles
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Employee Invite</DialogTitle>
              </DialogHeader>
              {newInviteCode ? (
                <div className="space-y-4 py-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Share this code with your employee:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-2xl font-mono font-bold bg-muted px-4 py-2 rounded">
                        {newInviteCode}
                      </code>
                      <Button variant="ghost" size="icon" onClick={() => copyInviteCode(newInviteCode)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      This code expires in 7 days
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Employee Role</Label>
                    <Select value={newInviteRole} onValueChange={(v) => setNewInviteRole(v as EmployeeRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                {newInviteCode ? (
                  <Button onClick={handleCloseCreateDialog}>Done</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCloseCreateDialog}>Cancel</Button>
                    <Button onClick={handleCreateInvite}>Generate Code</Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              Active ({activeEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="hours">
              <Clock className="h-4 w-4 mr-1" />
              Team Hours
            </TabsTrigger>
            <TabsTrigger value="payroll">
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Payroll
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingInvites.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({inactiveEmployees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active employees yet</p>
                <p className="text-sm">Create an invite code to add team members</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeEmployees.map((employee) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    onUpdateRole={updateEmployeeRole}
                    onUpdateStatus={updateEmployeeStatus}
                    onRemove={removeEmployee}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="hours">
            {activeEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active employees</p>
                <p className="text-sm">Add employees to track their hours</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1 space-y-2">
                    <Label className="text-sm font-medium">Select Employee</Label>
                    {activeEmployees.map((employee) => (
                      <button
                        key={employee.id}
                        onClick={() => setSelectedEmployeeForHours(employee)}
                        className={`w-full flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                          selectedEmployeeForHours?.id === employee.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={employee.profile?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {employee.profile?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {employee.profile?.full_name || employee.profile?.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">{ROLE_LABELS[employee.role]}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="md:col-span-3">
                    {selectedEmployeeForHours ? (
                      <EmployeeHoursTracker
                        employeeId={selectedEmployeeForHours.id}
                        isManager={true}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64 border rounded-lg text-muted-foreground">
                        Select an employee to view and approve their hours
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payroll">
            <PayrollSummaryReport vendorId={vendorId} />
          </TabsContent>

          <TabsContent value="pending">
            {pendingInvites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending invites</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                        <UserPlus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold">{invite.invite_code}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyInviteCode(invite.invite_code!)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">{ROLE_LABELS[invite.role]}</Badge>
                          {invite.invite_expires_at && (
                            <span>Expires {format(new Date(invite.invite_expires_at), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteInvite(invite.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inactive">
            {inactiveEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No inactive employees</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inactiveEmployees.map((employee) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    onUpdateRole={updateEmployeeRole}
                    onUpdateStatus={updateEmployeeStatus}
                    onRemove={removeEmployee}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

interface EmployeeCardProps {
  employee: VendorEmployee;
  onUpdateRole: (id: string, role: EmployeeRole) => void;
  onUpdateStatus: (id: string, status: 'active' | 'inactive') => void;
  onRemove: (id: string) => void;
}

const EmployeeCard = ({ employee, onUpdateRole, onUpdateStatus, onRemove }: EmployeeCardProps) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={employee.profile?.avatar_url || ''} />
          <AvatarFallback>
            {employee.profile?.full_name?.charAt(0) || employee.profile?.email?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{employee.profile?.full_name || employee.profile?.email || 'Unknown'}</p>
          <div className="flex items-center gap-2">
            <Badge className={`${ROLE_COLORS[employee.role]} text-white text-xs`}>
              {ROLE_LABELS[employee.role]}
            </Badge>
            {employee.hired_at && (
              <span className="text-xs text-muted-foreground">
                Since {format(new Date(employee.hired_at), 'MMM yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={employee.role} onValueChange={(v) => onUpdateRole(employee.id, v as EmployeeRole)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {employee.status === 'active' ? (
          <Button variant="outline" size="sm" onClick={() => onUpdateStatus(employee.id, 'inactive')}>
            Deactivate
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onUpdateStatus(employee.id, 'active')}>
            Activate
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => onRemove(employee.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default EmployeeManagement;
