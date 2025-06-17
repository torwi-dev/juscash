import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';


interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const LoadingSpinner = ({ 
  size = 'md', 
  text, 
  className,
  fullScreen = false 
}: LoadingSpinnerProps) => {
  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-2',
      className
    )}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 1, 
          repeat: Infinity, 
          ease: 'linear' 
        }}
      >
        <Loader2 className={cn(
          'text-primary-500',
          sizeClasses[size]
        )} />
      </motion.div>
      
      {text && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground"
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

// Componente de skeleton para cards
export const PublicationCardSkeleton = () => (
  <div className="p-4 border rounded-lg space-y-3 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
    </div>
    <div className="flex justify-between">
      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
    </div>
  </div>
);

// Componente de skeleton para Kanban
export const KanbanSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, j) => (
            <PublicationCardSkeleton key={j} />
          ))}
        </div>
      </div>
    ))}
  </div>
);