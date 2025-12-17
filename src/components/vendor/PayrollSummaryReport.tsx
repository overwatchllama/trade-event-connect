import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from 'date-fns';
import { Calendar, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PayrollSummaryReportProps {
  vendorId: string;
}

interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  role: string;
  totalHours: number;
  approvedHours: number;
  pendingHours: number;
  entriesCount: number;
}

const PayrollSummaryReport = ({ vendorId }: PayrollSummaryReportProps) => {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      // Get all employees for this vendor
      const { data: employees, error: empError } = await supabase
        .from('vendor_employees')
        .select('id, role, user_id')
        .eq('vendor_id', vendorId)
        .eq('status', 'active');

      if (empError) throw empError;

      const employeeSummaries: EmployeeSummary[] = [];

      for (const emp of employees || []) {
        // Get profile data
        let profile: { full_name: string | null; email: string } | null = null;
        if (emp.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', emp.user_id)
            .single();
          profile = profileData;
        }

        // Get hours for this employee within date range
        const { data: hours, error: hoursError } = await supabase
          .from('vendor_employee_hours')
          .select('*')
          .eq('employee_id', emp.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (hoursError) throw hoursError;

        let totalHours = 0;
        let approvedHours = 0;

        (hours || []).forEach(entry => {
          let entryHours = 0;
          if (entry.entry_type === 'manual' && entry.manual_hours) {
            entryHours = Number(entry.manual_hours);
          } else if (entry.clock_in && entry.clock_out) {
            const minutes = differenceInMinutes(
              parseISO(entry.clock_out),
              parseISO(entry.clock_in)
            );
            entryHours = minutes / 60;
          }

          totalHours += entryHours;
          if (entry.approved_at) {
            approvedHours += entryHours;
          }
        });

        employeeSummaries.push({
          employeeId: emp.id,
          employeeName: profile?.full_name || 'Unknown',
          employeeEmail: profile?.email || '',
          role: emp.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          totalHours: Math.round(totalHours * 100) / 100,
          approvedHours: Math.round(approvedHours * 100) / 100,
          pendingHours: Math.round((totalHours - approvedHours) * 100) / 100,
          entriesCount: hours?.length || 0
        });
      }

      setSummaries(employeeSummaries.filter(s => s.entriesCount > 0));
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [vendorId, startDate, endDate]);

  const exportToCSV = () => {
    if (summaries.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Employee Name', 'Email', 'Role', 'Total Hours', 'Approved Hours', 'Pending Hours', 'Entries'];
    const rows = summaries.map(s => [
      s.employeeName,
      s.employeeEmail,
      s.role,
      s.totalHours.toFixed(2),
      s.approvedHours.toFixed(2),
      s.pendingHours.toFixed(2),
      s.entriesCount
    ]);

    const csvContent = [
      `Payroll Summary Report`,
      `Date Range: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-summary-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const totalApprovedHours = summaries.reduce((sum, s) => sum + s.approvedHours, 0);
  const totalPendingHours = summaries.reduce((sum, s) => sum + s.pendingHours, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Payroll Summary
        </CardTitle>
        <Button onClick={exportToCSV} variant="outline" size="sm" disabled={summaries.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">From:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(startDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">To:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(endDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Approved</p>
            <p className="text-2xl font-bold text-green-600">{totalApprovedHours.toFixed(2)} hrs</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-600">{totalPendingHours.toFixed(2)} hrs</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Employees</p>
            <p className="text-2xl font-bold">{summaries.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No hours recorded for this period</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary) => (
                <TableRow key={summary.employeeId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{summary.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{summary.employeeEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>{summary.role}</TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {summary.approvedHours.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-yellow-600">
                    {summary.pendingHours.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {summary.totalHours.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PayrollSummaryReport;
