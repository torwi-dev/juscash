import { motion } from 'framer-motion';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLogout } from '@/hooks';
import { useAuthStore } from '@/stores';

export const Navbar = () => {
   const user = useAuthStore((state) => state.user);
  const { logout } = useLogout();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      operador: 'bg-blue-100 text-blue-800',
      readonly: 'bg-gray-100 text-gray-800',
      scraper_service: 'bg-green-100 text-green-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      operador: 'Operador',
      readonly: 'Visualização',
      scraper_service: 'Sistema',
    };
    return labels[role as keyof typeof labels] || role;
  };

  return (
    <motion.nav 
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full relative">
                <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-xl font-bold text-secondary-500">
              Jus<span className="text-primary-500">Cash</span>
            </span>
          </div>
        </motion.div>

        {/* User Menu */}
<div className="flex items-center space-x-4">
  {/* Desktop - com dropdown */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="hidden md:flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="text-right">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className={`text-xs px-2 py-1 rounded-full w-fit ml-auto ${getRoleColor(user?.role || '')}`}>
            {getRoleLabel(user?.role || '')}
          </p>
        </div>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary-500 text-white text-sm font-semibold">
            {user?.name ? getInitials(user.name) : 'U'}
          </AvatarFallback>
        </Avatar>
      </button>
    </DropdownMenuTrigger>
    
    <DropdownMenuContent className="w-56" align="end" forceMount>
      <DropdownMenuItem disabled>
        <User className="mr-2 h-4 w-4" />
        <span>Perfil</span>
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      <DropdownMenuItem 
        onClick={logout}
        className="text-red-600 focus:text-red-600 focus:bg-red-50"
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Sair</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  {/* Mobile - Avatar + Botão Logout */}
  <div className="md:hidden flex items-center space-x-2">
    <Avatar className="h-9 w-9">
      <AvatarFallback className="bg-primary-500 text-white text-sm font-semibold">
        {user?.name ? getInitials(user.name) : 'U'}
      </AvatarFallback>
    </Avatar>
    
    <Button
      onClick={logout}
      variant="ghost"
      size="sm"
      className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  </div>
</div>
      </div>
    </motion.nav>
  );
};