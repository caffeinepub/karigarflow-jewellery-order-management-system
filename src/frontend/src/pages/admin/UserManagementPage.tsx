import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateUserProfile, useListUserProfiles } from '../../hooks/useQueries';
import { AppRole, type UserProfile } from '../../backend';
import { Principal } from '@dfinity/principal';
import { toast } from 'sonner';
import { UserPlus, CheckCircle, AlertCircle, Copy, Check, Users } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { getStoppedCanisterMessage, presentError } from '@/utils/errorPresentation';

export function UserManagementPage() {
  const createUserMutation = useCreateUserProfile();
  const { data: userProfiles = [], isLoading: profilesLoading } = useListUserProfiles();
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
      
      const stoppedMessage = getStoppedCanisterMessage(error);
      if (stoppedMessage) {
        const errorDetails = presentError(error);
        toast.error(stoppedMessage, {
          description: errorDetails.friendlyMessage,
          action: errorDetails.rawErrorString ? {
            label: <Copy className="h-4 w-4" />,
            onClick: () => {
              navigator.clipboard.writeText(errorDetails.rawErrorString || '');
              toast.success('Error details copied to clipboard');
            },
          } : undefined,
        });
      } else {
        toast.error('Failed to create user profile', {
          description: error.message || 'An unknown error occurred',
        });
      }
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case AppRole.Admin:
        return 'destructive';
      case AppRole.Staff:
        return 'default';
      case AppRole.Karigar:
        return 'secondary';
      default:
        return 'outline';
    }
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
            Create New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="principalId">Principal ID</Label>
              <Input
                id="principalId"
                placeholder="Enter user's Principal ID"
                value={principalId}
                onChange={(e) => setPrincipalId(e.target.value)}
                disabled={createUserMutation.isPending}
              />
              <p className="text-sm text-muted-foreground">
                The unique identifier for the user on the Internet Computer
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter user's name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={createUserMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={appRole}
                onValueChange={(value) => setAppRole(value as AppRole)}
                disabled={createUserMutation.isPending}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AppRole.Admin}>Admin</SelectItem>
                  <SelectItem value={AppRole.Staff}>Staff</SelectItem>
                  <SelectItem value={AppRole.Karigar}>Karigar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {appRole === AppRole.Karigar && (
              <div className="space-y-2">
                <Label htmlFor="karigarName">Karigar Name</Label>
                <Input
                  id="karigarName"
                  placeholder="Enter karigar name"
                  value={karigarName}
                  onChange={(e) => setKarigarName(e.target.value)}
                  disabled={createUserMutation.isPending}
                />
                <p className="text-sm text-muted-foreground">
                  This name will be used to assign orders to this karigar
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={createUserMutation.isPending}
              className="w-full"
            >
              {createUserMutation.isPending ? (
                <>Creating User...</>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User Profile
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Created Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profilesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : userProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users created yet</p>
              <p className="text-xs mt-2">Backend support for user listing may not be available yet</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Karigar Name</TableHead>
                    <TableHead>Principal ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userProfiles.map((userInfo) => (
                    <TableRow key={userInfo.principal.toString()}>
                      <TableCell className="font-medium">{userInfo.profile.name}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(userInfo.profile.appRole)}>
                          {userInfo.profile.appRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {userInfo.profile.karigarName || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">
                            {userInfo.principal.toString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(userInfo.principal.toString())}
                          >
                            {copyStatus === 'success' ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
