
import React from 'react';
import { User, UserRole } from '../types';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
}

const LoginView: React.FC<Props> = ({ users, onLogin }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 mb-8 border border-gray-100">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl shadow-lg shadow-blue-100 mb-6 rotate-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m0 10V4m-4 6h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">SmartPOP <span className="text-blue-600">Pro</span></h1>
          <p className="text-gray-400 text-sm font-bold mt-2 uppercase tracking-widest">Manufacturing Management</p>
        </div>

        <div className="space-y-8">
          <div className="grid gap-4">
            <h2 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] ml-2">System Administrator</h2>
            {users.filter(u => u.role === UserRole.ADMIN).map(user => (
              <button
                key={user.id}
                onClick={() => onLogin(user)}
                className="group flex items-center justify-between p-5 bg-gray-50 rounded-[1.5rem] hover:bg-blue-600 transition-all text-left border-2 border-transparent hover:border-blue-100 active:scale-95"
              >
                <div>
                  <div className="font-black text-gray-800 group-hover:text-white transition-colors">{user.name}</div>
                  <div className="text-[10px] text-gray-400 group-hover:text-blue-200 transition-colors uppercase font-bold">ID: {user.username}</div>
                </div>
                <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black group-hover:bg-white/20 group-hover:text-white">관리자</div>
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            <h2 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] ml-2">Shop Floor Worker</h2>
            <div className="grid grid-cols-1 gap-3">
              {users.filter(u => u.role === UserRole.WORKER).map(user => (
                <button
                  key={user.id}
                  onClick={() => onLogin(user)}
                  className="group flex items-center justify-between p-5 bg-white border-2 border-gray-100 rounded-[1.5rem] hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left active:scale-95 shadow-sm"
                >
                  <div>
                    <div className="font-black text-gray-800 group-hover:text-indigo-700">{user.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Work ID: {user.username}</div>
                  </div>
                  <div className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">작업자</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Developer Promo Section */}
      <div className="max-w-md w-full bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-[2rem] p-6 text-center animate-fadeIn">
        <p className="text-blue-800 font-black text-sm mb-2">🚀 우리 공장에도 도입하고 싶다면?</p>
        <p className="text-blue-600/70 text-xs font-medium leading-relaxed mb-4">
          대학생이 직접 만든 가성비 생산관리 시스템!<br/>
          복잡한 솔루션 대신 가벼운 스마트팝을 만나보세요.
        </p>
        <div className="flex flex-col gap-2 bg-white/60 p-4 rounded-2xl border border-blue-50 shadow-sm">
          <div className="flex justify-between text-[11px]">
            <span className="font-bold text-gray-400 uppercase">구축 비용</span>
            <span className="font-black text-blue-600">50,000원 ~ (협의)</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="font-bold text-gray-400 uppercase">기능 추가</span>
            <span className="font-black text-indigo-600">요구사항 맞춤형 개발</span>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-100">
            <a href="mailto:hooing777@naver.com" className="text-blue-700 font-black text-sm hover:underline">hooing777@naver.com</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
