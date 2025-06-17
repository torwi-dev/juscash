import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Ops! Algo deu errado</CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-sm text-gray-600">
                  <summary className="cursor-pointer font-medium">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
              
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Recarregar Página
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente funcional para erros simples
interface ErrorMessageProps {
  error: string | Error;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage = ({ error, onRetry, className }: ErrorMessageProps) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className={`text-center p-6 ${className}`}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Erro ao carregar dados
      </h3>
      
      <p className="text-gray-600 mb-4">
        {errorMessage}
      </p>
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      )}
    </div>
  );
};