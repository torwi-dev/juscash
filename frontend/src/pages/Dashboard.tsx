import { motion } from 'framer-motion';

import { Layout } from '@/components/layout';
import { KanbanBoard } from '@/components/kanban';
import { SearchFilters, PublicationModal } from '@/components/publications';

import { useRequireAuth, usePublicationModal } from '@/hooks';

export const Dashboard = () => {
  useRequireAuth();
  
  const { publication, isOpen, close } = usePublicationModal();

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Search Filters with integrated header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 mb-6"
        >
          <SearchFilters />
        </motion.div>

        {/* Kanban Board - ocupa o resto do espaço disponível */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 min-h-0"
        >
          <KanbanBoard />
        </motion.div>

        {/* Publication Modal */}
        <PublicationModal
          publication={publication}
          isOpen={isOpen}
          onClose={close}
        />
      </div>
    </Layout>
  );
};