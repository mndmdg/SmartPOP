
import React, { useState, useMemo } from 'react';
import { AppState, WorkOrderStatus, ProductionLog, WorkOrder } from '../types';

interface Props {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
  onLogout: () => void;
}

const WorkerDashboard: React.FC<Props> = ({ state, updateState, onLogout }) => {
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Production Entry Form
  const [goodQty, setGoodQty] = useState<number>(0);
  const [defects, setDefects] = useState<{[key: string]: number}>({});
  const [comment, setComment] = useState('');

  const filteredMyOrders = useMemo(() => {
    return state.workOrders
      .filter(wo => wo.workerId === state.currentUser?.id)
      .filter(wo => {
        const item = state.items.find(i => i.id === wo.itemId);
        return (item?.name || '').includes(searchQuery) || wo.date.includes(searchQuery);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.workOrders, state.currentUser, state.items, searchQuery]);

  const handleDefectChange = (typeId: string, value: number) => {
    setDefects(prev => ({ ...prev, [typeId]: Math.max(0, value) }));
  };

  const handleSubmitPerformance = () => {
    if (!selectedOrder) return;
    const log: ProductionLog = {
      id: `log-${Date.now()}`,
      workOrderId: selectedOrder.id,
      workerId: state.currentUser!.id,
      goodQuantity: goodQty,
      defects: Object.entries(defects).map(([typeId, qty]) => ({ defectTypeId: typeId, quantity: qty })).filter(d => d.quantity > 0),
      comment,
      timestamp: new Date().toISOString()
    };
    updateState(prev => ({
      ...prev,
      workOrders: prev.workOrders.map(wo => wo.id === selectedOrder.id ? { ...wo, status: WorkOrderStatus.COMPLETED } : wo),
      productionLogs: [log, ...prev.productionLogs]
    }));
    alert('생산 실적 보고가 성공적으로 완료되었습니다.');
    setSelectedOrder(null);
    setGoodQty(0);
    setDefects({});
    setComment('');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Shop Floor</h1>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{state.currentUser?.name} 님 작업 중</p>
        </div>
        <button onClick={onLogout} className="text-[10px] font-black text-red-500 bg-red-50 px-4 py-2 rounded-xl border border-red-100 shadow-sm active:scale-95 transition-all">로그아웃</button>
      </header>

      {!selectedOrder ? (
        <div className="space-y-6 animate-fadeIn">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-4 top-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="품목명 또는 날짜로 검색..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-gray-50 pl-12 pr-4 py-4 rounded-[1.5rem] text-sm font-bold shadow-xl shadow-gray-100 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">나의 작업 지시 목록</h3>
            <span className="text-[10px] font-bold text-gray-300">최근순 정렬</span>
          </div>

          <div className="space-y-4">
            {filteredMyOrders.map(order => {
              const item = state.items.find(i => i.id === order.itemId);
              const isCompleted = order.status === WorkOrderStatus.COMPLETED;
              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all group active:scale-[0.98] ${
                    isCompleted ? 'bg-gray-100/50 border-gray-100 opacity-60' : 'bg-white border-blue-50 hover:border-blue-500 shadow-2xl shadow-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${isCompleted ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}>{order.status}</span>
                    <span className="text-[10px] font-black text-gray-300">{order.date}</span>
                  </div>
                  <div className="text-xl font-black text-gray-800 mb-2 leading-tight">{item?.name}</div>
                  <div className="flex justify-between items-end border-t border-dashed border-gray-100 pt-4 mt-2">
                    <span className="text-[10px] text-gray-400 font-bold tracking-tight">지시코드: {order.id.slice(-6).toUpperCase()}</span>
                    <span className="text-sm font-black text-blue-600">목표: {order.targetQuantity} {item?.unit}</span>
                  </div>
                </button>
              );
            })}
            {filteredMyOrders.length === 0 && (
              <div className="text-center py-24 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                <svg className="w-12 h-12 mx-auto text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <p className="text-gray-400 text-sm font-bold">배정된 작업이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-blue-50 animate-fadeIn relative">
          <button onClick={() => setSelectedOrder(null)} className="mb-6 flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>목록으로</button>
          
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
            </div>
            <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2 tracking-tighter">{state.items.find(i => i.id === selectedOrder.itemId)?.name}</h2>
                <div className="flex justify-between items-center opacity-70 text-[10px] font-black uppercase tracking-widest pt-2 border-t border-white/20 mt-2">
                    <span>지시일: {selectedOrder.date}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">목표: {selectedOrder.targetQuantity} EA</span>
                </div>
            </div>
          </div>

          <div className="space-y-8">
            <section>
              <label className="block text-[11px] font-black text-gray-400 uppercase mb-4 px-1 tracking-widest flex justify-between items-center">
                <span>실 생산량 (GOOD QTY)</span>
                <span className="text-blue-500">단위: EA</span>
              </label>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setGoodQty(q => Math.max(0, q - 5))} 
                  className="w-16 h-16 bg-gray-50 border-2 border-gray-100 rounded-3xl text-lg font-black shadow-inner shrink-0 hover:bg-gray-100 active:scale-90 transition-all text-gray-400"
                >-5</button>
                <div className="flex-1">
                    <input 
                      type="number" 
                      value={goodQty} 
                      onChange={e => setGoodQty(Number(e.target.value))} 
                      className="w-full h-16 bg-white border-4 border-blue-50 rounded-3xl text-center text-3xl font-black focus:border-blue-500 outline-none shadow-xl shadow-blue-50/50 transition-all" 
                    />
                </div>
                <button 
                  onClick={() => setGoodQty(q => q + 5)} 
                  className="w-16 h-16 bg-blue-600 text-white rounded-3xl text-lg font-black shadow-xl shadow-blue-200 shrink-0 hover:bg-blue-700 active:scale-90 transition-all"
                >+5</button>
              </div>
            </section>

            <section>
              <label className="block text-[11px] font-black text-gray-400 uppercase mb-4 px-1 tracking-widest">불량 발생 내역 (DEFECTS)</label>
              <div className="grid gap-3">
                {state.defectTypes.map(type => (
                  <div key={type.id} className="flex items-center justify-between p-5 bg-red-50/50 rounded-3xl border-2 border-red-50 transition-all">
                    <span className="text-sm font-black text-red-900/70">{type.name}</span>
                    <div className="flex items-center gap-4 bg-white px-3 py-2 rounded-2xl shadow-sm border border-red-100">
                      <button onClick={() => handleDefectChange(type.id, (defects[type.id] || 0) - 1)} className="w-8 h-8 flex items-center justify-center font-black text-red-500 text-xl hover:bg-red-50 rounded-lg transition-colors">-</button>
                      <span className="w-8 text-center font-black text-red-600 text-lg">{defects[type.id] || 0}</span>
                      <button onClick={() => handleDefectChange(type.id, (defects[type.id] || 0) + 1)} className="w-8 h-8 flex items-center justify-center font-black text-white bg-red-500 rounded-lg shadow-lg shadow-red-100 hover:bg-red-600 transition-all">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 px-1 tracking-widest">생산 특이사항 (REMARK)</label>
              <textarea 
                value={comment} 
                onChange={e => setComment(e.target.value)} 
                placeholder="지연 사유나 설비 이상 등 특이사항을 적어주세요." 
                className="w-full bg-gray-50 border-2 border-gray-50 rounded-3xl p-5 text-sm font-bold focus:bg-white focus:border-blue-200 outline-none min-h-[120px] transition-all" 
              />
            </section>

            <button 
              onClick={handleSubmitPerformance} 
              className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              생산 실적 보고 완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
