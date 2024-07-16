'use client'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { signOut } from "next-auth/react"

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export default function UserProfile({ user }: { user: User }) {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full">
          <Avatar>
            <AvatarImage src={user.image || ''} alt={user.name || 'User'} />
            <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{user.name}</h4>
            <p className="text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="pt-2">
            <Button onClick={handleSignOut} className="w-full">
              Log out
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}