export interface RegisteredDevice {
  registeredAt: string;
  lastActive: string;
}

export interface LicenseKey {
  key: string;
  label: string;
  status: 'active' | 'blocked' | 'expired';
  expiryType: 'lifetime' | 'duration';
  durationDays?: number;
  activatedAt?: string;
  expiresAt?: string;
  deviceLimit: number;
  deviceCount: number;
  devices?: { [hwid: string]: RegisteredDevice };
  sdkType: string;
  allowedPackage?: string;
  creatorEmail: string;
  createdAt: string;
  updatedAt: string;
  appId?: string; // App Isolation Binding
  createdBy?: string; // Key issuer email or username 
  creatorRole?: 'owner' | 'admin' | 'reseller'; // Power classification
}

export interface GamingApp {
  id: string;
  name: string;
  packageName: string;
  description: string;
  createdAt: string;
  creatorEmail: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  key: string; // Secret login Key (isolator)
  appId: string;
  appName: string;
  createdAt: string;
  creatorEmail: string;
}

export interface ResellerProfile {
  id: string;
  name: string;
  key: string; // Reseller login token
  appId: string;
  appName: string;
  parentAdminEmail: string;
  keysCount: number;
  maxKeys?: number; // Credit limits
  createdAt: string;
}

export interface ValidationLog {
  id: string;
  key: string;
  hwid: string;
  packageName: string;
  status: 'success' | 'failed_blocked' | 'failed_expired' | 'failed_hwid_limit' | 'failed_invalid_key' | 'failed_package_mismatch';
  ip: string;
  sdkType: string;
  errorMessage?: string;
  timestamp: any; // Firestore timestamp or date string
}
