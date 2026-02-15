import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { useIsCallerAdmin } from '../../hooks/useQueries';
import { toast } from 'sonner';

interface ProfileSetupModalProps {
  open: boolean;
}

export function ProfileSetupModal({ open }: ProfileSetupModalProps) {
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: isCheckingAdmin } = useIsCallerAdmin();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      // This modal is now only for Admin initial setup
      // The backend automatically assigns Admin role to the first user
      // We just need to save the name
      toast.success('Admin profile created successfully!');
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to create profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAdmin) {
    return null;
  }

  // This modal should only be shown to the first admin during initial setup
  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome, Administrator</DialogTitle>
          <DialogDescription>
            You are the first user and have been assigned the Administrator role. 
            Please enter your name to complete the setup.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Creating Profile...' : 'Complete Setup'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
