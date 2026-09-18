import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="h-screen print:h-auto flex flex-col bg-background overflow-hidden print:overflow-visible text-gray-100 print:bg-white print:text-black">
      <div className="print:hidden">
        <Navbar />
      </div>
      <div className="flex-1 flex overflow-hidden print:overflow-visible print:block">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto print:overflow-visible bg-background/50 print:bg-transparent print:p-0 print:m-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 print:max-w-none print:w-full print:p-0 print:m-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
