
import React, { useState, useMemo } from 'react';
import { AppState, UserRole, WorkOrderStatus, Item, DefectType, User, WorkOrder, ProductionLog } from '../types';
import { getProductionInsight } from '../services/geminiService';

interface Props {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
  onLogout: () => void;
}

type ReportType = 'TOTAL' | 'DAILY' | 'ITEM' | 'WORKER' | 'DEFECT';

const AdminDashboard: React.FC<Props> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'logs' | 'report' | 'master'>('orders');
  const [reportType, setReportType] = useState<ReportType>('TOTAL');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // --- Search & Filter States ---
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Form States ---
  const [orderForm, setOrderForm] = useState<Partial<WorkOrder>>({ id: '', date: new Date().toISOString().split('T')[0], itemId: '', workerId: '', targetQuantity: 100, status: WorkOrderStatus.PENDING });
  const [logForm, setLogForm] = useState<Partial<ProductionLog>>({ id: '', workOrderId: '', goodQuantity: 0, comment: '' });
  const [itemForm, setItemForm] = useState({ id: '', code: '', name: '', unit: 'EA' });
  const [defectForm, setDefectForm] = useState({ id: '', name: '' });
  const [userForm, setUserForm] = useState({ id: '', username: '', name: '', role: UserRole.WORKER });

  // --- Filtering Logic ---
  const filteredOrders = useMemo(() => {
    return state.workOrders.filter(o => {
      const item = state.items.find(i => i.id === o.itemId);
      const worker = state.users.find(u => u.id === o.workerId);
      const matchesSearch = (item?.name || '').includes(searchQuery) || (worker?.name || '').includes(searchQuery);
      const matchesDate = o.date >= startDate && o.date <= endDate;
      return matchesSearch && matchesDate;
    });
  }, [state.workOrders, state.items, state.users, searchQuery, startDate, endDate]);

  const filteredLogs = useMemo(() => {
    return state.productionLogs.filter(l => {
      const order = state.workOrders.find(o => o.id === l.workOrderId);
      const item = state.items.find(i => i.id === order?.itemId);
      const worker = state.users.find(u => u.id === l.workerId);
      const matchesSearch = (item?.name || '').includes(searchQuery) || (worker?.name || '').includes(searchQuery) || (l.comment || '').includes(searchQuery);
      const matchesDate = (order?.date || '') >= startDate && (order?.date || '') <= endDate;
      return matchesSearch && matchesDate;
    });
  }, [state.productionLogs, state.workOrders, state.items, state.users, searchQuery, startDate, endDate]);

  const handleFetchInsight = async () => {
    setLoadingAi(true);
    const insight = await getProductionInsight(state.productionLogs, state.items, state.defectTypes, state.workOrders);
    setAiInsight(insight || "분석 결과가 없습니다.");
    setLoadingAi(false);
  };

  const exportToExcel = (data: any[], filename: string) => {
    if (data.length === 0) return alert('내보낼 데이터가 없습니다.');
    const headerMap: { [key: string]: string } = {
      classification: '구분', date: '일자', itemName: '품목명', workerName: '작업자명', defectName: '불량유형',
      target: '목표수량', good: '양품수량', defects: '불량수량', rate: '달성률(%)'
    };
    const keys = Object.keys(data[0]);
    const headers = keys.map(k => headerMap[k] || k).join(',');
    const rows = data.map(row => keys.map(k => typeof row[k] === 'string' ? `"${row[k]}"` : row[k]).join(',')).join('\n');
    const csvContent = "\uFEFF" + headers + '\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const deleteAny = (type: 'workOrders' | 'productionLogs' | 'items' | 'defectTypes' | 'users', id: string) => {
    if (type === 'users' && id === state.currentUser?.id) return alert('본인 계정은 삭제 불가');
    if (confirm('삭제하시겠습니까?')) {
      updateState(prev => ({ ...prev, [type]: (prev as any)[type].filter((x: any) => x.id !== id) }));
    }
  };

  // --- Aggregated Data Logic (Corrected Classification) ---
  const reportData = useMemo(() => {
    const summary: any = {};
    
    if (reportType === 'DEFECT') {
      filteredLogs.forEach(log => log.defects.forEach(d => {
        const name = state.defectTypes.find(dt => dt.id === d.defectTypeId)?.name || '기타';
        summary[name] = (summary[name] || 0) + d.quantity;
      }));
      return Object.entries(summary).map(([name, qty]) => ({ classification: name, defects: qty }));
    }
    
    // Group logs by report type
    filteredLogs.forEach(log => {
      const order = state.workOrders.find(o => o.id === log.workOrderId);
      if (!order) return;
      
      let key = '';
      let displayValue = '';
      
      if (reportType === 'DAILY') {
        key = order.date;
        displayValue = order.date;
      } else if (reportType === 'ITEM') {
        key = order.itemId;
        displayValue = state.items.find(i => i.id === order.itemId)?.name || '-';
      } else if (reportType === 'WORKER') {
        key = order.workerId;
        displayValue = state.users.find(u => u.id === order.workerId)?.name || '-';
      } else {
        key = `${order.date}_${order.itemId}_${order.workerId}`;
        displayValue = `${order.date}`;
      }

      if (!summary[key]) {
        summary[key] = { 
          classification: displayValue, 
          itemName: state.items.find(i => i.id === order.itemId)?.name || '-', 
          workerName: state.users.find(u => u.id === order.workerId)?.name || '-', 
          good: 0, 
          defects: 0 
        };
      }
      summary[key].good += log.goodQuantity;
      summary[key].defects += log.defects.reduce((a, b) => a + b.quantity, 0);
    });

    // Sum targets from unique work orders within the filter criteria
    const targets: any = {};
    state.workOrders.forEach(o => {
      const matchesDate = o.date >= startDate && o.date <= endDate;
      if (!matchesDate) return;
      
      let key = '';
      if (reportType === 'DAILY') key = o.date;
      else if (reportType === 'ITEM') key = o.itemId;
      else if (reportType === 'WORKER') key = o.workerId;
      else key = `${o.date}_${o.itemId}_${o.workerId}`;
      
      if (summary[key]) {
        targets[key] = (targets[key] || 0) + o.targetQuantity;
      }
    });

    return Object.entries(summary).map(([key, s]: [string, any]) => {
      const finalTarget = targets[key] || 0;
      return {
        ...s,
        target: finalTarget,
        rate: finalTarget > 0 ? ((s.good / finalTarget) * 100).toFixed(1) : '0.0'
      };
    });
  }, [filteredLogs, state, reportType, startDate, endDate]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">SmartPOP <span className="text-blue-600">Pro</span></h1>
          <p className="text-gray-500 font-medium">제조 실행 및 실적 관리 시스템</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border">
          <div className="text-right px-4 border-r">
            <div className="text-sm font-bold text-gray-800">{state.currentUser?.name}</div>
            <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Admin Control</div>
          </div>
          <button onClick={onLogout} className="text-gray-400 hover:text-red-500 p-2 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      {activeTab !== 'master' && (
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">조회 기간</span>
            <div className="flex items-center bg-gray-50 rounded-xl p-1 border">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-0 text-sm font-bold px-3 py-1 focus:ring-0 outline-none" />
              <span className="px-2 text-gray-300">~</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-0 text-sm font-bold px-3 py-1 focus:ring-0 outline-none" />
            </div>
          </div>
          <div className="flex-1 min-w-[250px] relative">
            <svg className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="품목명, 작업자명 또는 비고 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-50 border border-gray-100 pl-11 pr-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-8 bg-gray-100 p-1.5 rounded-2xl w-fit">
        {[ {id:'orders',l:'작업 지시'}, {id:'logs',l:'생산 실적'}, {id:'report',l:'집계 리포트'}, {id:'master',l:'마스터 관리'} ].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id as any); setSearchQuery(''); }} className={`px-7 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>{t.l}</button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
          <form onSubmit={(e) => {
            e.preventDefault();
            updateState(prev => {
              if (orderForm.id) return { ...prev, workOrders: prev.workOrders.map(o => o.id === orderForm.id ? { ...o, ...orderForm } as WorkOrder : o) };
              return { ...prev, workOrders: [{ ...orderForm as WorkOrder, id: `wo-${Date.now()}` }, ...prev.workOrders] };
            });
            setOrderForm({ id: '', date: new Date().toISOString().split('T')[0], itemId: '', workerId: '', targetQuantity: 100, status: WorkOrderStatus.PENDING });
          }} className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100 h-fit space-y-5">
            <h3 className="text-xl font-black text-gray-800">{orderForm.id ? '지시 정보 수정' : '신규 지시 발행'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">지시 일자</label>
                <input type="date" value={orderForm.date} onChange={e => setOrderForm({...orderForm, date: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold border-0 focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">생산 품목</label>
                <select value={orderForm.itemId} onChange={e => setOrderForm({...orderForm, itemId: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold border-0 focus:ring-2 focus:ring-blue-500" required>
                  <option value="">품목을 선택하세요</option>
                  {state.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">담당 작업자</label>
                <select value={orderForm.workerId} onChange={e => setOrderForm({...orderForm, workerId: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold border-0 focus:ring-2 focus:ring-blue-500" required>
                  <option value="">작업자를 지정하세요</option>
                  {state.users.filter(u => u.role === UserRole.WORKER).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">목표 수량</label>
                <input type="number" value={orderForm.targetQuantity} onChange={e => setOrderForm({...orderForm, targetQuantity: Number(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold border-0 focus:ring-2 focus:ring-blue-500" required />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">{orderForm.id ? '수정 내용 저장' : '작업 지시 발행'}</button>
          </form>
          <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="p-5 border-b bg-gray-50/50 flex justify-between items-center">
                <span className="text-sm font-black text-gray-600">작업 지시 이력</span>
                <span className="text-[10px] font-bold text-blue-500">조회 범위 내 {filteredOrders.length}건</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-gray-400 font-bold border-b">
                  <tr><th className="p-5">날짜</th><th className="p-5">품목</th><th className="p-5">작업자</th><th className="p-5 text-center">목표</th><th className="p-5 text-right">관리</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-5 font-bold">{o.date}</td>
                      <td className="p-5">{state.items.find(i => i.id === o.itemId)?.name}</td>
                      <td className="p-5">{state.users.find(u => u.id === o.workerId)?.name}</td>
                      <td className="p-5 text-center font-black text-blue-600">{o.targetQuantity}</td>
                      <td className="p-5 text-right">
                        <button onClick={() => setOrderForm(o)} className="text-blue-500 font-bold mr-4 hover:underline">수정</button>
                        <button onClick={() => deleteAny('workOrders', o.id)} className="text-red-400 font-bold hover:underline">삭제</button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-gray-300 italic">조회된 지시가 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
          <form onSubmit={(e) => {
            e.preventDefault();
            updateState(prev => {
              const targetOrder = prev.workOrders.find(o => o.id === logForm.workOrderId);
              if (logForm.id) return { ...prev, productionLogs: prev.productionLogs.map(l => l.id === logForm.id ? { ...l, ...logForm } as ProductionLog : l) };
              return { ...prev, productionLogs: [{ ...logForm as ProductionLog, id: `log-${Date.now()}`, timestamp: new Date().toISOString(), workerId: targetOrder?.workerId || '', defects: [] }, ...prev.productionLogs] };
            });
            setLogForm({ id: '', workOrderId: '', goodQuantity: 0, comment: '' });
          }} className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100 h-fit space-y-5">
            <h3 className="text-xl font-black text-gray-800">{logForm.id ? '실적 수정' : '실적 수동 등록'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">대상 작업 지시</label>
                <select value={logForm.workOrderId} onChange={e => setLogForm({...logForm, workOrderId: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold border-0 focus:ring-2 focus:ring-green-500" required>
                  <option value="">지시를 선택하세요</option>
                  {state.workOrders.map(o => <option key={o.id} value={o.id}>[{o.date}] {state.items.find(i => i.id === o.itemId)?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">양품 생산 수량</label>
                <input type="number" placeholder="수량 입력" value={logForm.goodQuantity} onChange={e => setLogForm({...logForm, goodQuantity: Number(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold border-0 focus:ring-2 focus:ring-green-500" required />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">작업 비고</label>
                <textarea placeholder="특이사항 입력" value={logForm.comment} onChange={e => setLogForm({...logForm, comment: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-medium border-0 focus:ring-2 focus:ring-green-500 h-28" />
              </div>
            </div>
            <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all">{logForm.id ? '실적 내용 반영' : '생산 실적 저장'}</button>
          </form>
          <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="p-5 border-b bg-gray-50/50 flex justify-between items-center">
                <span className="text-sm font-black text-gray-600">생산 실적 상세 로그</span>
                <span className="text-[10px] font-bold text-green-500">총 {filteredLogs.length}건 검색됨</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-gray-400 font-bold border-b">
                  <tr><th className="p-5">기록 시간</th><th className="p-5">품목</th><th className="p-5">작업자</th><th className="p-5 text-center">양품</th><th className="p-5 text-right">관리</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map(l => {
                    const o = state.workOrders.find(ord => ord.id === l.workOrderId);
                    return (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5 text-gray-400 text-[10px] font-bold">{new Date(l.timestamp).toLocaleString()}</td>
                        <td className="p-5 font-bold text-gray-700">{state.items.find(i => i.id === o?.itemId)?.name || 'N/A'}</td>
                        <td className="p-5">{state.users.find(u => u.id === l.workerId)?.name}</td>
                        <td className="p-5 text-center font-black text-green-600">{l.goodQuantity}</td>
                        <td className="p-5 text-right">
                          <button onClick={() => setLogForm(l)} className="text-blue-500 font-bold mr-4 hover:underline">수정</button>
                          <button onClick={() => deleteAny('productionLogs', l.id)} className="text-red-400 font-bold hover:underline">삭제</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLogs.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-gray-300 italic">검색된 실적이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap gap-2 bg-gray-200/50 p-1.5 rounded-2xl">
              {[ {id:'TOTAL',l:'상세 합계'}, {id:'DAILY',l:'일자별'}, {id:'ITEM',l:'품목별'}, {id:'WORKER',l:'작업자별'}, {id:'DEFECT',l:'불량유형별'} ].map(t => (
                <button key={t.id} onClick={() => setReportType(t.id as ReportType)} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${reportType === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{t.l}</button>
              ))}
            </div>
            <button onClick={() => exportToExcel(reportData, `POP_REPORT_${reportType}`)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-2xl shadow-blue-100 flex items-center gap-3 hover:bg-blue-700 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                집계 리포트 다운로드 (CSV)
            </button>
          </div>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b font-black text-gray-500">
                <tr>
                  <th className="p-6">구분 (Classification)</th>
                  {reportType === 'TOTAL' && <th className="p-6 text-xs text-gray-400">품목 / 작업자</th>}
                  {reportType !== 'DEFECT' ? (
                    <>
                      <th className="p-6 text-center">총 목표</th>
                      <th className="p-6 text-center text-green-600">총 양품</th>
                      <th className="p-6 text-center text-red-500">총 불량</th>
                      <th className="p-6 text-center">공정 달성률</th>
                    </>
                  ) : (
                    <th className="p-6 text-center">누적 불량 건수</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map((row: any, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-6 font-black text-gray-800">{row.classification}</td>
                    {reportType === 'TOTAL' && <td className="p-6 text-gray-400 text-xs font-bold">{row.itemName} / {row.workerName}</td>}
                    {reportType !== 'DEFECT' ? (
                      <>
                        <td className="p-6 text-center font-bold text-gray-400">{row.target.toLocaleString()}</td>
                        <td className="p-6 text-center font-black text-green-600">{row.good.toLocaleString()}</td>
                        <td className="p-6 text-center font-bold text-red-500">{row.defects.toLocaleString()}</td>
                        <td className="p-6 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-tighter shadow-sm ${Number(row.rate) >= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                            {row.rate}%
                          </span>
                        </td>
                      </>
                    ) : (
                      <td className="p-6 text-center font-black text-red-600">{row.defects.toLocaleString()} EA</td>
                    )}
                  </tr>
                ))}
                {reportData.length === 0 && <tr><td colSpan={6} className="p-32 text-center text-gray-300 italic">표시할 데이터가 없습니다. 조회 조건을 확인하세요.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'master' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn">
          {/* Items */}
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[600px]">
            <h3 className="text-lg font-black mb-6 flex items-center gap-3"><div className="w-2.5 h-6 bg-blue-500 rounded-full" />품목 데이터</h3>
            <div className="bg-gray-50 p-5 rounded-2xl mb-6 space-y-3">
              <input type="text" placeholder="품목 코드" value={itemForm.code} onChange={e => setItemForm({...itemForm, code: e.target.value})} className="w-full p-3.5 rounded-xl border-0 shadow-sm text-sm font-bold" />
              <input type="text" placeholder="품목 명칭" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full p-3.5 rounded-xl border-0 shadow-sm text-sm font-bold" />
              <div className="flex gap-2">
                <input type="text" placeholder="단위" value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} className="flex-1 p-3.5 rounded-xl border-0 shadow-sm text-sm font-bold" />
                <button onClick={() => { 
                    if(!itemForm.code || !itemForm.name) return alert('필수값을 입력하세요');
                    updateState(prev => itemForm.id ? { ...prev, items: prev.items.map(i => i.id === itemForm.id ? itemForm : i) } : { ...prev, items: [{ ...itemForm, id: `i-${Date.now()}` }, ...prev.items] }); 
                    setItemForm({id:'',code:'',name:'',unit:'EA'}); 
                }} className="bg-blue-600 text-white px-6 rounded-xl text-xs font-black shadow-lg">저장</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y">
              {state.items.map(i => (
                <div key={i.id} className="py-4 flex justify-between items-center group">
                  <div className="text-sm font-bold text-gray-700">{i.name} <span className="text-[10px] text-gray-300 ml-1">({i.unit})</span></div>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setItemForm(i)} className="text-blue-500 font-black text-xs hover:underline">수정</button>
                    <button onClick={() => deleteAny('items', i.id)} className="text-red-400 font-black text-xs hover:underline">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Defects */}
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[600px]">
            <h3 className="text-lg font-black mb-6 flex items-center gap-3"><div className="w-2.5 h-6 bg-red-500 rounded-full" />불량 유형 관리</h3>
            <div className="bg-gray-50 p-5 rounded-2xl mb-6 flex gap-3">
              <input type="text" placeholder="불량 항목명" value={defectForm.name} onChange={e => setDefectForm({...defectForm, name: e.target.value})} className="flex-1 p-3.5 rounded-xl border-0 shadow-sm text-sm font-bold" />
              <button onClick={() => { 
                if(!defectForm.name) return alert('명칭을 입력하세요');
                updateState(prev => defectForm.id ? { ...prev, defectTypes: prev.defectTypes.map(d => d.id === defectForm.id ? defectForm : d) } : { ...prev, defectTypes: [{ ...defectForm, id: `d-${Date.now()}` }, ...prev.defectTypes] }); 
                setDefectForm({id:'',name:''}); 
              }} className="bg-red-600 text-white px-6 rounded-xl text-xs font-black shadow-lg">추가</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y">
              {state.defectTypes.map(d => (
                <div key={d.id} className="py-4 flex justify-between items-center group">
                  <div className="text-sm font-bold text-gray-700">{d.name}</div>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setDefectForm(d)} className="text-blue-500 font-black text-xs hover:underline">수정</button>
                    <button onClick={() => deleteAny('defectTypes', d.id)} className="text-red-400 font-black text-xs hover:underline">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Users */}
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[600px]">
            <h3 className="text-lg font-black mb-6 flex items-center gap-3"><div className="w-2.5 h-6 bg-indigo-500 rounded-full" />계정 정보 제어</h3>
            <div className="bg-gray-50 p-5 rounded-2xl mb-6 space-y-3">
              <input type="text" placeholder="로그인 ID" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-3.5 rounded-xl border-0 shadow-sm text-sm font-bold" />
              <input type="text" placeholder="사용자 이름" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-3.5 rounded-xl border-0 shadow-sm text-sm font-bold" />
              <div className="flex gap-2">
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="flex-1 p-3.5 rounded-xl border-0 shadow-sm text-sm font-bold">
                    <option value={UserRole.WORKER}>현장 작업자</option>
                    <option value={UserRole.ADMIN}>관리자</option>
                </select>
                <button onClick={() => { 
                    if(!userForm.username || !userForm.name) return alert('정보를 입력하세요');
                    updateState(prev => userForm.id ? { ...prev, users: prev.users.map(u => u.id === userForm.id ? userForm : u) } : { ...prev, users: [{ ...userForm, id: `u-${Date.now()}` }, ...prev.users] }); 
                    setUserForm({id:'',username:'',name:'',role:UserRole.WORKER}); 
                }} className="bg-indigo-600 text-white px-6 rounded-xl text-xs font-black shadow-lg">저장</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y">
              {state.users.map(u => (
                <div key={u.id} className="py-4 flex justify-between items-center group">
                  <div className="text-sm font-bold text-gray-700">{u.name} <span className="text-[10px] text-gray-300 font-normal ml-1">({u.role})</span></div>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setUserForm(u)} className="text-blue-500 font-black text-xs hover:underline">수정</button>
                    <button onClick={() => deleteAny('users', u.id)} className="text-red-400 font-black text-xs hover:underline">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
