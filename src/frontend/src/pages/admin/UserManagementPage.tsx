import { useState } from 'react';
import { useListUserProfiles, useCreateUserProfile, useListApprovals, useSetApproval, useBlockUser, useUnblockUser } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { toast } from 'sonner';
import { AppRole, ApprovalStatus } from '../../backend';
import type { UserProfile } from '../../backend';
import { Principal } from '@icp-sdk/core/principal';
import { Shield, ShieldOff } from 'lucide-react';

export function UserManagementPage() {
  const { data: userProfiles, isLoading: profilesLoading, error: profilesError, refetch: refetchProfiles } = useListUserProfiles();
  const { data: approvals, isLoading: approvalsLoading } = useListApprovals();
  const createUserMutation = useCreateUserProfile();
  const setApprovalMutation = useSetApproval();
  const blockUserMutation = useBlockUser();
  const unblockUserMutation = useUnblockUser();

  const [newUserPrincipal, setNewUserPrincipal] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>(AppRole.Staff);
  const [newUserKarigarName, setNewUserKarigarName] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserPrincipal || !newUserName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const principal = Principal.fromText(newUserPrincipal);
      const profile: UserProfile = {
        name: newUserName,
        appRole: newUserRole,
        karigarName: newUserRole === AppRole.Karigar ? newUserKarigarName : undefined,
        isCreated: true,
      };

      await createUserMutation.mutateAsync({ user: principal, profile });
      toast.success('User created successfully');
      setNewUserPrincipal('');
      setNewUserName('');
      setNewUserRole(AppRole.Staff);
      setNewUserKarigarName('');
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  const handleApprovalChange = async (userPrincipal: Principal, status: ApprovalStatus) => {
    try {
      await setApprovalMutation.mutateAsync({ user: userPrincipal, status });
      toast.success(`User ${status === ApprovalStatus.approved ? 'approved' : 'rejected'}`);
    } catch (error) {
      console.error('Failed to update approval:', error);
      toast.error('Failed to update approval status');
    }
  };

  const handleBlockUser = async (userPrincipal: string) => {
    try {
      const principal = Principal.fromText(userPrincipal);
      await blockUserMutation.mutateAsync({
        user: principal,
        reason: 'Blocked by administrator',
      });
      toast.success('User blocked successfully');
      refetchProfiles();
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error('Failed to block user');
    }
  };

  const handleUnblockUser = async (userPrincipal: string) => {
    try {
      const principal = Principal.fromText(userPrincipal);
      await unblockUserMutation.mutateAsync(principal);
      toast.success('User unblocked successfully');
      refetchProfiles();
    } catch (error) {
      console.error('Failed to unblock user:', error);
      toast.error('Failed to unblock user');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Create and manage user accounts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="principal">Principal ID *</Label>
                <Input
                  id="principal"
                  value={newUserPrincipal}
                  onChange={(e) => setNewUserPrincipal(e.target.value)}
                  placeholder="Enter principal ID"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter user name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
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

              {newUserRole === AppRole.Karigar && (
                <div className="space-y-2">
                  <Label htmlFor="karigarName">Karigar Name</Label>
                  <Input
                    id="karigarName"
                    value={newUserKarigarName}
                    onChange={(e) => setNewUserKarigarName(e.target.value)}
                    placeholder="Enter karigar name"
                  />
                </div>
              )}
            </div>

            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Created Users</CardTitle>
        </CardHeader>
        <CardContent>
          {profilesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : profilesError ? (
            <InlineErrorState 
              error={profilesError} 
              message="Failed to load user profiles"
              onRetry={refetchProfiles}
            />
          ) : userProfiles && userProfiles.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Karigar Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userProfiles.map((profile, idx) => {
                    const approval = approvals?.find(a => a.principal.toString() === profile.name);
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{profile.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{profile.appRole}</Badge>
                        </TableCell>
                        <TableCell>{profile.karigarName || '-'}</TableCell>
                        <TableCell>
                          {approval && (
                            <Badge 
                              variant={
                                approval.status === ApprovalStatus.approved ? 'default' :
                                approval.status === ApprovalStatus.pending ? 'secondary' :
                                'destructive'
                              }
                            >
                              {approval.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBlockUser(profile.name)}
                              disabled={blockUserMutation.isPending}
                            >
                              <ShieldOff className="h-4 w-4 mr-1" />
                              Block
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnblockUser(profile.name)}
                              disabled={unblockUserMutation.isPending}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Unblock
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users created yet
            </div>
          )}
        </CardContent>
      </Card>

      {approvals && approvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {approvalsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Principal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.filter(a => a.status === ApprovalStatus.pending).map((approval) => (
                      <TableRow key={approval.principal.toString()}>
                        <TableCell className="font-mono text-xs">
                          {approval.principal.toString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{approval.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprovalChange(approval.principal, ApprovalStatus.approved)}
                              disabled={setApprovalMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApprovalChange(approval.principal, ApprovalStatus.rejected)}
                              disabled={setApprovalMutation.isPending}
                            >
                              Reject
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
      )}
    </div>
  );
}
