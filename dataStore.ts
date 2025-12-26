
import { AppState, UserRole, User, Item, DefectType, WorkOrder, ProductionLog, WorkOrderStatus } from './types';

const STORAGE_KEY = 'smart_pop_db';

const initialData: AppState = {
  users: [
    { id: 'u1', username: 'admin', role: UserRole.ADMIN, name: '관리자' },
    { id: 'u2', username: 'worker1', role: UserRole.WORKER, name: '홍길동' },
    { id: 'u3', username: 'worker2', role: UserRole.WORKER, name: '김철수' },
  ],
  items: [
    { id: 'i1', code: 'P-001', name: '전자회로기판 A', unit: 'EA' },
    { id: 'i2', code: 'P-002', name: '알루미늄 프레임 B', unit: 'PCS' },
  ],
  defectTypes: [
    { id: 'd1', name: '스크래치' },
    { id: 'd2', name: '치수 불량' },
    { id: 'd3', name: '기능 오작동' },
  ],
  workOrders: [
    { id: 'wo1', date: '2024-05-20', itemId: 'i1', workerId: 'u2', targetQuantity: 100, status: WorkOrderStatus.PENDING },
  ],
  productionLogs: [],
  currentUser: null
};

export const loadState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : initialData;
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
