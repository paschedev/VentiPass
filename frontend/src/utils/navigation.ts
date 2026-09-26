import {
  CalendarRange,
  Globe,
  Menu,
  ScanLine,
  Settings,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

// La home y las pantallas de acceso van sin sidebar ni barra inferior.
const ROUTES_WITHOUT_APP_NAV = [
  '/',
  '/login',
  '/registro',
  '/password-recovery',
  '/reset-password',
];

export function showsAppNav(pathname: string): boolean {
  return !ROUTES_WITHOUT_APP_NAV.includes(pathname);
}

export interface NavUser {
  role: string;
  isCurrentlyScanner?: boolean;
  hasBeenRpp?: boolean;
}

export interface NavLink {
  id: string;
  href: string;
  icon: LucideIcon;
  label: string;
}

export type NavItem =
  | (NavLink & { kind: 'link' | 'scanner' })
  | {
      kind: 'menu';
      id: string;
      icon: LucideIcon;
      label: string;
      items: NavLink[];
    };

const EVENTS: NavLink = {
  id: 'eventos',
  href: '/eventos',
  icon: Globe,
  label: 'Eventos',
};
const LOGIN: NavLink = {
  id: 'login',
  href: '/login',
  icon: User,
  label: 'Ingresar',
};
const ORGANIZATION: NavLink = {
  id: 'metricas',
  href: '/panel',
  icon: CalendarRange,
  label: 'Organización',
};
const RPP: NavLink = {
  id: 'rpp',
  href: '/panel/rpp',
  icon: Users,
  label: 'Panel RPP',
};
const TICKETS: NavLink = {
  id: 'tickets',
  href: '/panel/tickets',
  icon: Ticket,
  label: 'Tickets',
};
const SETTINGS: NavLink = {
  id: 'ajustes',
  href: '/panel/configuracion',
  icon: Settings,
  label: 'Ajustes',
};
const SCANNER: NavItem = {
  kind: 'scanner',
  id: 'scanner',
  href: '/panel/escanear',
  icon: ScanLine,
  label: 'QR',
};

const asLink = (link: NavLink): NavItem => ({ ...link, kind: 'link' });

// Items de la barra inferior mobile según los roles del usuario.
export function getNavItems(user: NavUser | null): NavItem[] {
  if (!user) return [EVENTS, LOGIN].map(asLink);

  const isOrganizer = user.role === 'ORGANIZER' || user.role === 'ADMIN';
  const links = [EVENTS];
  if (isOrganizer) links.push(ORGANIZATION);
  if (isOrganizer || user.hasBeenRpp) links.push(RPP);
  links.push(TICKETS, SETTINGS);

  const items = links.map(asLink);
  if (!isOrganizer && !user.isCurrentlyScanner) return items;

  // Hasta 5 lugares: el QR va al medio y lo que sobra pasa a "Más".
  if (links.length <= 4) {
    items.splice(Math.floor(links.length / 2), 0, SCANNER);
    return items;
  }
  return [
    items[0],
    items[1],
    SCANNER,
    items[2],
    {
      kind: 'menu',
      id: 'mas',
      icon: Menu,
      label: 'Más',
      items: links.slice(3),
    },
  ];
}
