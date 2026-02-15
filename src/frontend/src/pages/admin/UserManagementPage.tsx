import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateUserProfile } from '../../hooks/useQueries';
import { AppRole, type UserProfile } from '../../backend';
import { Principal } from '@dfinity/principal';
import { toast } from 'sonner';
import { UserPlus, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { getStoppedCanisterMessage, presentError } from '@/utils/errorPresentation';

export function UserManagementPage() {
  const createUserMutation = useCreateUserProfile();
  const { copyStatus, copyToClipboard, getButtonLabel } = useCopyToClipboard();
  const [principalId, setPrincipalId] = useState('');
  const [name, setName] = useState('');
  const [appRole, setAppRole] = useState<AppRole>(AppRole.Staff);
  const [karigarName, setKarigarName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate principal ID
    let principal: Principal;
    try {
      principal = Principal.fromText(principalId.trim());
    } catch (error) {
      setValidationError('Invalid Principal ID format. Please check and try again.');
      return;
    }

    // Validate required fields
    if (!name.trim()) {
      setValidationError('Name is required');
      return;
    }

    if (appRole === AppRole.Karigar && !karigarName.trim()) {
      setValidationError('Karigar Name is required for Karigar role');
      return;
    }

    const profile: UserProfile = {
      name: name.trim(),
      appRole,
      karigarName: appRole === AppRole.Karigar ? karigarName.trim() : undefined,
    };

    try {
      await createUserMutation.mutateAsync({ user: principal, profile });
      toast.success(`User profile created successfully for ${name}`);
      
      // Reset form
      setPrincipalId('');
      setName('');
      setAppRole(AppRole.Staff);
      setKarigarName('');
    } catch (error: any) {
      console.error('Failed to create user profile:', error);
      
      // Check if this is a stopped-canister error
      const stoppedMessage = getStoppedCanisterMessage(error);
      if (stoppedMessage) {
        const presentation = presentError(error);
        toast.error(stoppedMessage, {
          description: 'Copy error details for diagnostics',
          action: {
            label: getButtonLabel(),
            onClick: () => copyToClipboard(presentation.rawErrorString),
          },
        });
      } else {
        toast.error(error.message || 'Failed to create user profile. Please try again.');
      }
    }
  };

  const handleReset = () => {
    setPrincipalId('');
    setName('');
    setAppRole(AppRole.Staff);
    setKarigarName('');
    setValidationError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Create and manage user profiles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create User Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertDescription>
              When a new user logs in for the first time, they will see a blocked screen with their Principal ID. 
              They should share that ID with you. Use this form to create their profile and assign their role.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="principalId">User Principal ID *</Label>
              <Input
                id="principalId"
                value={principalId}
                onChange={(e) => setPrincipalId(e.target.value)}
                placeholder="e.g., 2vxsx-fae..."
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                The user will provide this ID from their blocked screen
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">User Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter user's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={appRole} onValueChange={(value) => setAppRole(value as AppRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AppRole.Staff}>Staff</SelectItem>
                  <SelectItem value={AppRole.Karigar}>Karigar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Staff can manage orders and designs. Karigar can only view their assigned orders.
              </p>
            </div>

            {appRole === AppRole.Karigar && (
              <div className="space-y-2">
                <Label htmlFor="karigarName">Karigar Name *</Label>
                <Input
                  id="karigarName"
                  value={karigarName}
                  onChange={(e) => setKarigarName(e.target.value)}
                  placeholder="Enter karigar name (must match master designs)"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This name must match the karigar names in your master designs
                </p>
              </div>
            )}

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {createUserMutation.isSuccess && (
              <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  User profile created successfully! The user can now refresh their page and access the system.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                className="flex-1"
              >
                {createUserMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User Profile
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={createUserMutation.isPending}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h3 className="font-medium">For New Users:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>User logs in with Internet Identity for the first time</li>
              <li>They see a blocked screen with their Principal ID</li>
              <li>They copy and share their Principal ID with you (the Admin)</li>
              <li>You create their profile using this form</li>
              <li>User refreshes their page and gains access</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Role Descriptions:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li><strong>Staff:</strong> Can upload orders, manage master designs, and view all orders</li>
              <li><strong>Karigar:</strong> Can only view orders assigned to their karigar name</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
