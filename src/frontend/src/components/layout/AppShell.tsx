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
import { BUILD_ID } from '../../version';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  AlertCircle, 
  Users, 
  Menu,
  Gem,
  Image,
  FileSpreadsheet,
  Scan,
  ClipboardCheck,
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
        { label: 'Excel Reconciliation', icon: FileSpreadsheet, path: '/admin/excel-reconciliation' },
        { label: 'Barcode Tagging', icon: Scan, path: '/admin/barcode-tagging' },
        { label: 'Hallmark Management', icon: ClipboardCheck, path: '/admin/hallmark-management' },
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
    <nav className="space-y-2">
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          className="w-full justify-start hover:bg-primary/10 hover:text-primary text-foreground"
          onClick={() => {
            navigate({ to: item.path });
            setMobileMenuOpen(false);
          }}
        >
          <item.icon className="mr-3 h-5 w-5" />
          {item.label}
        </Button>
      ))}
    </nav>
  );

  const DesktopNavContent = () => (
    <nav className="flex items-center gap-2">
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: item.path })}
          className="hover:bg-primary/10 hover:text-primary font-medium text-foreground"
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </nav>
  );

  return (
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {/* Sticky header with light theme */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 gap-4 max-w-full">
          <div className="flex items-center gap-4 min-w-0">
            {navItems.length > 0 && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden flex-shrink-0">
                  <Button variant="ghost" size="icon" className="hover:bg-primary/10 text-foreground">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="left" 
                  className="w-72 bg-card max-h-screen overflow-y-auto flex flex-col backdrop-blur-md border-border"
                >
                  <div className="mb-8 flex-shrink-0">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
                        <Gem className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        KarigarFlow
                      </span>
                    </div>
                    {userProfile && (
                      <div className="space-y-2 text-sm p-4 rounded-lg bg-muted/50">
                        <p className="font-semibold text-base text-foreground">{userProfile.name}</p>
                        <Badge variant="outline" className="text-xs text-foreground">
                          {effectiveRole || userProfile.appRole}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <MobileNavContent />
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-secondary">
                <Gem className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold hidden sm:inline bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                KarigarFlow
              </span>
            </div>
          </div>

          {navItems.length > 0 && (
            <div className="hidden lg:flex items-center gap-2 flex-1 justify-center min-w-0">
              <DesktopNavContent />
            </div>
          )}

          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <BackendStatusIndicator />
            
            {userProfile && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right text-sm">
                  <p className="font-semibold truncate max-w-[140px] text-foreground">{userProfile.name}</p>
                  <Badge variant="outline" className="text-xs text-foreground">
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

      {/* Main content area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <div className="container py-8 px-4 max-w-full">
          {children}
        </div>
      </main>

      <footer className="border-t border-border mt-auto w-full bg-card/50">
        <div className="container py-8 px-4 text-center text-sm text-muted-foreground">
          <p className="mb-2">
            © {new Date().getFullYear()} KarigarFlow. Built with ❤️ using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary transition-colors"
            >
              caffeine.ai
            </a>
          </p>
          <p className="text-xs opacity-60">
            Version: {BUILD_ID}
          </p>
        </div>
      </footer>
    </div>
  );
}
