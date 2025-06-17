import { motion } from 'framer-motion';
import { X, Calendar, Users, Scale, DollarSign, FileText, ExternalLink } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Publication } from '@/types';
import { 
  formatDate, 
  formatCurrency, 
  formatProcessNumber, 
  formatAuthors, 
  formatLawyers,
  formatStatus 
} from '@/utils/formatters';

interface PublicationModalProps {
  publication: Publication | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PublicationModal = ({ publication, isOpen, onClose }: PublicationModalProps) => {
  if (!publication) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col h-full max-h-[90vh]"
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Publicação - {formatProcessNumber(publication.processNumber)}
                </DialogTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>DJE: {formatDate(publication.publicationDate)}</span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="bg-primary-100 text-primary-800"
                  >
                    {formatStatus(publication.status)}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="flex-1 max-h-[calc(90vh-120px)]">
            <div className="px-6 py-4 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <Users className="h-4 w-4 mr-2" />
                      Autor(es)
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-800">
                        {formatAuthors(publication.authors)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <Scale className="h-4 w-4 mr-2" />
                      Réu
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-800">
                        {publication.defendant || 'Instituto Nacional do Seguro Social - INSS'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <Scale className="h-4 w-4 mr-2" />
                      Advogado(s)
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="space-y-1">
                        {publication.lawyers && publication.lawyers.length > 0 ? (
                          publication.lawyers.map((lawyer, index) => (
                            <p key={index} className="text-sm text-gray-800">
                              {lawyer}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            Não informado
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Data de Disponibilização
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-800">
                        {formatDate(publication.availabilityDate, 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Values */}
              <div>
                <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Valores Monetários
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200"
                  >
                    <div className="text-sm text-green-700 font-medium mb-1">
                      Valor Principal Bruto/Líquido
                    </div>
                    <div className="text-xl font-bold text-green-800">
                      {formatCurrency(publication.mainValue)}
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200"
                  >
                    <div className="text-sm text-blue-700 font-medium mb-1">
                      Valor dos Juros Moratórios
                    </div>
                    <div className="text-xl font-bold text-blue-800">
                      {formatCurrency(publication.interestValue)}
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200"
                  >
                    <div className="text-sm text-purple-700 font-medium mb-1">
                      Valor dos Honorários Advocatícios
                    </div>
                    <div className="text-xl font-bold text-purple-800">
                      {formatCurrency(publication.legalFees)}
                    </div>
                  </motion.div>
                </div>
              </div>

              <Separator />

              {/* Full Content */}
              <div>
                <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                  <FileText className="h-5 w-5 mr-2" />
                  Conteúdo da Publicação
                </h4>
                
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {publication.fullContent || 'Conteúdo não disponível'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Source Link */}
              {publication.sourceUrl && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Fonte
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(publication.sourceUrl!, '_blank')}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver no DJE
                  </Button>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Informações do Sistema
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">ID:</span> {publication.id}
                  </div>
                  <div>
                    <span className="font-medium">Hash:</span> {publication.contentHash?.substring(0, 8) || 'N/A'}...
                  </div>
                  <div>
                    <span className="font-medium">Criado em:</span> {formatDate(publication.createdAt, 'dd/MM/yyyy HH:mm')}
                  </div>
                  <div>
                    <span className="font-medium">Atualizado em:</span> {formatDate(publication.updatedAt, 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};