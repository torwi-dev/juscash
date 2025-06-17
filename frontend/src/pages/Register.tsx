import { RegisterForm } from '@/components/auth';
import { useRedirectIfAuthenticated } from '@/hooks';

export const Register = () => {
  useRedirectIfAuthenticated();

  return <RegisterForm />;
};