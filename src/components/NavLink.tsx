import { Link, LinkProps, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavLinkProps extends LinkProps {
  activeClassName?: string;
  end?: boolean;
}

export const NavLink: React.FC<NavLinkProps> = ({ 
  to, 
  className, 
  activeClassName = 'bg-muted text-primary font-medium',
  end = false,
  children,
  ...props 
}) => {
  const location = useLocation();
  const isActive = end 
    ? location.pathname === to 
    : location.pathname.startsWith(to as string);

  return (
    <Link 
      to={to} 
      className={cn(className, isActive && activeClassName)}
      {...props}
    >
      {children}
    </Link>
  );
};
