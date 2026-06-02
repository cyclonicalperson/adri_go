import { Permission, PermissionCode } from '@core/models/user.model';

const PERMISSION_TEXT: Record<PermissionCode, { label: string; description: string }> = {
  create_accommodation: {
    label: 'Kreiranje smještaja',
    description: 'Dodavanje hotela, apartmana, privatnog smještaja',
  },
  create_restaurant: {
    label: 'Kreiranje restorana',
    description: 'Dodavanje restorana i kafića',
  },
  create_club: {
    label: 'Kreiranje klubova',
    description: 'Dodavanje noćnih klubova i barova',
  },
  create_event: {
    label: 'Kreiranje dogadjaja',
    description: 'Dodavanje koncerata, takmičenja, tura',
  },
  create_route: {
    label: 'Kreiranje ruta',
    description: 'Dodavanje pješačkih i biciklističkih ruta',
  },
  create_cultural_site: {
    label: 'Kreiranje kulturnih mjesta',
    description: 'Dodavanje muzeja, galerija, kulturnih objekata',
  },
  create_monument: {
    label: 'Kreiranje spomenika',
    description: 'Dodavanje istorijskih i prirodnih spomenika',
  },
  create_sports: {
    label: 'Kreiranje sportskih obj.',
    description: 'Dodavanje sportskih terena i objekata',
  },
  create_shop: {
    label: 'Kreiranje prodavnica',
    description: 'Dodavanje prodavnica i tržnih centara',
  },
  manage_reviews: {
    label: 'Upravljanje recenzijama',
    description: 'Odobravanje i brisanje recenzija svojih objava',
  },
  view_analytics: {
    label: 'Pregled analitike',
    description: 'Pregled statistika o objavama i turistima',
  },
  manage_own_posts: {
    label: 'Upravljanje vlastitim obj.',
    description: 'Editovanje i brisanje vlastitih objava',
  },
  manage_tags: {
    label: 'Upravljanje tagovima',
    description: 'Dodavanje i uredjivanje tagova na objavama',
  },
  manage_translations: {
    label: 'Upravljanje prijevodima',
    description: 'Dodavanje prijevoda objava na druge jezike',
  },
  view_tourists: {
    label: 'Pregled turista',
    description: 'Pregled podataka o turistima',
  },
  manage_tickets: {
    label: 'Upravljanje kartama',
    description: 'Pregled i upravljanje digitalnim ulaznicama',
  },
};

export function adminPermissionLabel(permission: Pick<Permission, 'code' | 'label'>): string {
  return PERMISSION_TEXT[permission.code]?.label ?? permission.label;
}

export function adminPermissionDescription(permission: Pick<Permission, 'code' | 'description'>): string {
  return PERMISSION_TEXT[permission.code]?.description ?? permission.description ?? permission.code;
}
