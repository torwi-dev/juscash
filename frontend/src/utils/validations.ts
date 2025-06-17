import { z } from 'zod';

// Validação de Login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('Formato de e-mail inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória'),
});

// Validação de Cadastro
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('Formato de e-mail inválido'),
  password: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'A senha deve conter pelo menos um caractere especial'),
  confirmPassword: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'A confirmação de senha não corresponde',
  path: ['confirmPassword'],
});

// Validação de Filtros de Busca
export const searchFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['nova', 'lida', 'enviada_adv', 'concluida']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(30),
}).refine((data) => {
  if (data.date_from && data.date_to) {
    return new Date(data.date_from) <= new Date(data.date_to);
  }
  return true;
}, {
  message: 'Data inicial deve ser anterior à data final',
  path: ['date_to'],
});

// Validação de Status Update
export const updateStatusSchema = z.object({
  status: z.enum(['nova', 'lida', 'enviada_adv', 'concluida']),
});

// Tipos derivados dos schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type SearchFiltersData = z.infer<typeof searchFiltersSchema>;
export type UpdateStatusData = z.infer<typeof updateStatusSchema>;

// Função para validar transições de status
export const validateStatusTransition = (
  currentStatus: string,
  newStatus: string
): boolean => {
  const validTransitions: Record<string, string[]> = {
    nova: ['lida'],
    lida: ['enviada_adv'],
    enviada_adv: ['concluida', 'lida'],
    concluida: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

// Função para validar formato de processo
export const validateProcessNumber = (processNumber: string): boolean => {
  // Formato típico: NNNNNNN-NN.NNNN.N.NN.NNNN
  const processRegex = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
  return processRegex.test(processNumber);
};