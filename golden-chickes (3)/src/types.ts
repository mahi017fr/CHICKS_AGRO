export type UserRole = 'admin' | 'customer';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  role: UserRole;
}

export type OrderStatus = 'pending' | 'hatching' | 'completed' | 'cancelled';

export interface Order {
  id?: string;
  customerName: string;
  customerNumber: string;
  totalEggs: number;
  address: string;
  totalPrice: number;
  dueAmount: number;
  orderDate: any; // Firestore Timestamp
  hatchDate: any; // Firestore Timestamp
  hatchDuration: number; // Duration in days
  status: OrderStatus;
  uid: string;
  notified?: boolean;
}
