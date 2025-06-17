import { useEffect } from 'react';
import { LoginForm } from '@/components/auth';
import { useRedirectIfAuthenticated } from '@/hooks';

export const Login = () => {
  useRedirectIfAuthenticated();

  return <LoginForm />;
};