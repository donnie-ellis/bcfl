// ./components/DraftHeader.tsx
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Profile from '@/components/Profile';
import { League, Draft } from '@/lib/types';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DraftHeaderProps {
  league: League | null;
  draft: Draft | null;
  additionalContent?: React.ReactNode;
}

const DraftHeader: React.FC<DraftHeaderProps> = ({ league, draft, additionalContent }) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isCommissioner, setIsCommissioner] = React.useState(false);

  React.useEffect(() => {
    const checkCommissionerStatus = async () => {
      if (session && league) {
        const response = await fetch(`/api/yahoo/user/league/${league.league_key}/isCommissioner`);
        const data = await response.json();
        setIsCommissioner(data.isCommissioner);
      }
    };

    checkCommissionerStatus();
  }, [session, league]);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: `/draft/${draft?.id}`, label: 'Draft' },
    { href: `/draft/${draft?.id}/board`, label: 'Board' },
    ...(isCommissioner ? [{ href: `/draft/${draft?.id}/kiosk`, label: 'Kiosk' }] : []),
  ];

  const renderNavItems = (mobile: boolean = false) => (
    <>
      {navItems.map((item) => (
        <NavigationMenuItem key={item.href}>
          <Link href={item.href} legacyBehavior passHref>
            <NavigationMenuLink
              className={cn(
                "px-4 py-2 rounded-md transition-colors duration-200",
                "text-sm font-medium",
                "border border-transparent",
                "hover:bg-accent hover:text-accent-foreground",
                mobile ? "block w-full text-left mb-2" : "inline-block",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground",
                "dark:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground",
                "dark:data-[active]:bg-primary dark:data-[active]:text-primary-foreground"
              )}
              active={pathname === item.href}
            >
              {item.label}
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      ))}
    </>
  );

  return (
    <div className="flex justify-between items-center p-4 bg-background">
      <div className="flex items-center gap-4">
        <Avatar className='h-12 w-12'>
          <AvatarFallback>{league?.name}</AvatarFallback>
          <AvatarImage src={league?.logo_url} alt={league?.name} />
        </Avatar>
        <h1 className="text-2xl font-bold hidden sm:block">
          {`${league?.name} ${draft?.name} Draft`}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Desktop Navigation */}
        <NavigationMenu className="hidden sm:flex">
          <NavigationMenuList className="space-x-2">
            {renderNavItems()}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="sm:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <NavigationMenu orientation="vertical" className="mt-10">
              <NavigationMenuList className="flex-col items-start space-y-4">
                {renderNavItems(true)}
                <NavigationMenuItem>
                  <Profile />
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </SheetContent>
        </Sheet>

        {additionalContent}
        <div className="hidden sm:block">
          <Profile />
        </div>
      </div>
    </div>
  );
};

export default DraftHeader;