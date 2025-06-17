import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useRegister } from '@/hooks';
import { registerSchema, type RegisterFormData } from '@/utils/validations';
import { LoadingSpinner } from '@/components/common';
import { ROUTES } from '@/utils/constants';

export const RegisterForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, isLoading, error, clearError } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const watchedPassword = watch('password');
  const watchedFields = watch();

  // Validações de senha em tempo real
  const passwordValidations = {
    length: watchedPassword?.length >= 8,
    uppercase: /[A-Z]/.test(watchedPassword || ''),
    lowercase: /[a-z]/.test(watchedPassword || ''),
    number: /[0-9]/.test(watchedPassword || ''),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(watchedPassword || ''),
  };

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    await registerUser(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 border-3 border-white rounded-full relative">
                <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-3xl font-bold text-secondary-500">
              Jus<span className="text-primary-500">Cash</span>
            </span>
          </div>
        </motion.div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-secondary-500">
              Criar Conta
            </CardTitle>
            <CardDescription className="text-gray-600">
              Preencha os dados para criar sua conta
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Seu nome completo *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="João Silva"
                    className={`pl-10 h-11 transition-all duration-200 ${
                      errors.name 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
                    }`}
                    {...register('name')}
                  />
                </div>
                {errors.name && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600"
                  >
                    {errors.name.message}
                  </motion.p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  E-mail *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@exemplo.com"
                    className={`pl-10 h-11 transition-all duration-200 ${
                      errors.email 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
                    }`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`pl-10 pr-10 h-11 transition-all duration-200 ${
                      errors.password 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
                    }`}
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>

                {/* Password Requirements */}
                {watchedPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 space-y-1"
                  >
                    <p className="text-xs text-gray-600 mb-2">A senha deve ter:</p>
                    <div className="space-y-1">
                      {Object.entries({
                        length: '8 caracteres',
                        uppercase: 'Uma letra maiúscula',
                        lowercase: 'Uma letra minúscula', 
                        number: 'Um número',
                        special: 'Um caractere especial'
                      }).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <CheckCircle2 className={`h-3 w-3 ${
                            passwordValidations[key as keyof typeof passwordValidations]
                              ? 'text-green-500' 
                              : 'text-gray-300'
                          }`} />
                          <span className={`text-xs ${
                            passwordValidations[key as keyof typeof passwordValidations]
                              ? 'text-green-600' 
                              : 'text-gray-500'
                          }`}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirme sua senha *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`pl-10 pr-10 h-11 transition-all duration-200 ${
                      errors.confirmPassword 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
                    }`}
                    {...register('confirmPassword')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600"
                  >
                    {errors.confirmPassword.message}
                  </motion.p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || Object.values(passwordValidations).some(v => !v)}
                className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" text="Criando conta..." />
                ) : (
                  'Criar conta'
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Já possui uma conta?{' '}
                <Link
                  to={ROUTES.LOGIN}
                  className="font-medium text-primary-500 hover:text-primary-600 transition-colors duration-200"
                >
                  Fazer o login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-xs text-gray-500"
        >
          Sistema de Automação Judicial - Diário da Justiça Eletrônico
        </motion.div>
      </motion.div>
    </div>
  );
};