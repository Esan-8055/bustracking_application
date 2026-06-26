export type UserRole = 'admin' | 'parent' | 'student' | 'driver';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface School {
  id: string;
  name: string;
  subdomain: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolId: string;
  active: boolean;
  createdAt: any;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  admissionNumber: string;
  schoolId: string;
  parentId: string;
  busId: string;
  routeId: string;
  pickupStopId: string;
  status: 'idle' | 'boarding' | 'reached_school' | 'reached_home';
  lastUpdated: any;
}

export interface Parent {
  id: string; // Matches users.uid
  name: string;
  email: string;
  phone: string;
  schoolId: string;
  studentIds: string[];
  emergencyContact: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  schoolId: string;
  licenseNumber: string;
  photoUrl: string;
  busId: string;
  status: 'active' | 'inactive';
}

export interface Bus {
  id: string;
  busNumber: string;
  plateNumber: string;
  schoolId: string;
  driverId: string;
  routeId: string;
  capacity: number;
  status: 'active' | 'inactive';
  apiKey: string;
  currentSpeed: number; // in km/h
  lastLocation?: LatLng;
  lastUpdated?: any;
}

export interface RouteStop {
  id: string;
  name: string;
  order: number;
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  name: string;
  schoolId: string;
  description: string;
  stops: RouteStop[];
  coordinates: LatLng[]; // path lines
}

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  type: 'notice' | 'emergency' | 'holiday' | 'maintenance';
  targetRoles: UserRole[];
  createdAt: any;
  createdBy: string;
}

export interface NotificationMsg {
  id: string;
  userId: string;
  schoolId: string;
  title: string;
  body: string;
  read: boolean;
  type: 'bus_started' | 'bus_near' | 'boarded' | 'arrived' | 'delayed' | 'emergency';
  timestamp: any;
}

export interface EmergencyLog {
  id: string;
  schoolId: string;
  busId: string;
  driverId: string;
  location: LatLng;
  status: 'active' | 'resolved';
  message: string;
  timestamp: any;
  resolvedAt?: any;
  resolvedBy?: string;
}
