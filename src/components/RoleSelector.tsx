import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building, Calendar, MapPin, Users } from 'lucide-react';

type Role = 'vendor' | 'organizer' | 'venue';

interface RoleSelectorProps {
  onRoleSelect: (role: Role, reason: string) => Promise<void>;
  onSkip: () => void;
  loading?: boolean;
}

export const RoleSelector = ({ onRoleSelect, onSkip, loading }: RoleSelectorProps) => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roles = [
    {
      id: 'vendor' as Role,
      title: 'Vendor',
      description: 'Sell trading cards, collectibles, and related merchandise',
      icon: Building,
      color: 'vendor',
    },
    {
      id: 'organizer' as Role,
      title: 'Event Organizer',
      description: 'Create and manage trading card events and tournaments',
      icon: Calendar,
      color: 'accent',
    },
    {
      id: 'venue' as Role,
      title: 'Venue Owner',
      description: 'Host trading card events at your location',
      icon: MapPin,
      color: 'primary',
    },
  ];

  const handleSubmit = async () => {
    if (!selectedRole) return;
    
    setSubmitting(true);
    try {
      await onRoleSelect(selectedRole, reason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Choose Your Role
        </CardTitle>
        <CardDescription>
          Select a special role to unlock additional features. This requires admin approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <div
                key={role.id}
                className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? 'border-primary bg-secondary/50' : 'border-border hover:bg-secondary/30'
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={() => setSelectedRole(role.id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium cursor-pointer">{role.title}</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {selectedRole && (
          <div className="space-y-2">
            <Label htmlFor="reason">Why do you want this role? (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Tell us about your business, experience, or plans..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || submitting || loading}
            className="flex-1"
          >
            {submitting ? 'Submitting Request...' : 'Request Role'}
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={loading || submitting}
          >
            Skip for Now
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Your request will be reviewed by an administrator. You'll be notified once it's approved.
        </p>
      </CardContent>
    </Card>
  );
};