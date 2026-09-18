import React from 'react';
import { Hammer } from 'lucide-react';

const Placeholder = ({ title }) => {
  return (
    <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
      <div className="bg-surface border border-gray-800 p-6 rounded-2xl shadow-xl mb-6">
        <Hammer className="h-16 w-16 text-primary mb-4 mx-auto opacity-80" />
        <h2 className="text-2xl font-bold text-white mb-2">{title || 'Under Construction'}</h2>
        <p className="text-gray-400 max-w-md">
          This section is coming in the next build phase. Check back later for updates to the MailDrishti AI platform.
        </p>
      </div>
    </div>
  );
};

export default Placeholder;
