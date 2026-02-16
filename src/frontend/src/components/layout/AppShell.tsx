import { type ReactNode, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useEffectiveAppRole } from '../../hooks/useEffectiveAppRole';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { LoginButton } from '../auth/LoginButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ConnectivityStatusBar } from '../status/ConnectivityStatusBar';
import { BackendStatusIndicator } from '../status/BackendStatusIndicator';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  AlertCircle, 
  Users, 
  Menu,
  Gem,
  Image,
  type LucideIcon
} from 'lucide-react';
import { AppRole } from '../../backend';

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const { userProfile } = useCurrentUser();
  const { effectiveRole, isResolved } = useEffectiveAppRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [];

  // Only show navigation when role is resolved to avoid flashing wrong nav items
  if (isResolved && effectiveRole) {
    if (effectiveRole === AppRole.Admin) {
      navItems.push(
        { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { label: 'Master Designs', icon: FileText, path: '/admin/master-designs' },
        { label: 'Design Images', icon: Image, path: '/admin/design-images' },
        { label: 'Users', icon: Users, path: '/admin/users' },
        { label: 'Ingest Orders', icon: Upload, path: '/staff/ingest' },
        { label: 'Unmapped Codes', icon: AlertCircle, path: '/staff/unmapped' }
      );
    } else if (effectiveRole === AppRole.Staff) {
      navItems.push(
        { label: 'Dashboard', icon: LayoutDashboard, path: '/staff' },
        { label: 'Ingest Orders', icon: Upload, path: '/staff/ingest' },
        { label: 'Unmapped Codes', icon: AlertCircle, path: '/staff/unmapped' }
      );
    } else if (effectiveRole === AppRole.Karigar) {
      navItems.push(
        { label: 'My Orders', icon: LayoutDashboard, path: '/karigar' }
      );
    }
  }

  const MobileNavContent = () => (
    <nav className="space-y-1">
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            navigate({ to: item.path });
            setMobileMenuOpen(false);
          }}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </nav>
  );

  const DesktopNavContent = () => (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: item.path })}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-4">
            {navItems.length > 0 && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Gem className="h-6 w-6 text-primary" />
                      <span className="text-lg font-bold">KarigarFlow</span>
                    </div>
                    {userProfile && (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{userProfile.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {effectiveRole || userProfile.appRole}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <MobileNavContent />
                </SheetContent>
              </Sheet>
            )}

            <div className="flex items-center gap-2">
              <Gem className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold hidden sm:inline">KarigarFlow</span>
            </div>
          </div>

          {navItems.length > 0 && (
            <div className="hidden lg:flex items-center gap-2 flex-1 justify-center">
              <DesktopNavContent />
            </div>
          )}

          <div className="flex items-center gap-4">
            <BackendStatusIndicator />
            
            {userProfile && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-right text-sm">
                  <p className="font-medium">{userProfile.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {effectiveRole || userProfile.appRole}
                  </Badge>
                </div>
              </div>
            )}
            <LoginButton />
          </div>
        </div>
      </header>

      <ConnectivityStatusBar />

      <main className="container py-6 px-4">
        {children}
      </main>

      <footer className="border-t mt-12">
        <div className="container py-6 px-4 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} KarigarFlow. Built with ❤️ using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
