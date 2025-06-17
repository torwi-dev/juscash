import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from './Navbar';
import { ErrorBoundary } from '@/components/common';
import { Toaster } from '@/components/ui/sonner';

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export const Layout = ({ children, className = '' }: LayoutProps) => {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <ErrorBoundary>
        <motion.main 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`container mx-auto px-4 py-6 ${className} flex-1 min-h-0 flex flex-col`}
        >
          {children}
        </motion.main>
      </ErrorBoundary>
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            color: '#374151',
          },
        }}
      />
    </div>
  );
};