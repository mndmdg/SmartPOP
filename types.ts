
export enum UserRole {
  ADMIN = 'ADMIN',
  WORKER = 'WORKER'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  unit: string;
}

export interface DefectType {
  id: string;
  name: string;
}

export enum WorkOrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface WorkOrder {
  id: string;
  date: string;
  itemId: string;
  workerId: string;
  targetQuantity: number;
  status: WorkOrderStatus;
}

export interface ProductionLog {
  id: string;
  workOrderId: string;
  workerId: string;
  goodQuantity: number;
  defects: {
    defectTypeId: string;
    quantity: number;
  }[];
  comment: string;
  timestamp: string;
}

export interface AppState {
  users: User[];
  items: Item[];
  defectTypes: DefectType[];
  workOrders: WorkOrder[];
  productionLogs: ProductionLog[];
  currentUser: User | null;
}
