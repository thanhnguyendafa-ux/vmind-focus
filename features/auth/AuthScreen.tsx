

import * as React from 'react';
import { supabase } from '../../services/supabaseClient';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card';

const AuthScreen: React.FC = () => {
  const { handleGuestLogin } = useUserStore();
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-secondary-900 p-4 transition-colors duration-300">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-400 mb-2">Vmind</h1>
            <p className="text-text-subtle">Welcome to your learning space.</p>
        </div>
        
        <Card>
           <CardHeader className="p-6">
             <CardTitle className="text-xl text-center">{isLogin ? 'Log In' : 'Sign Up'}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-600 dark:text-secondary-300 mb-1" htmlFor="email">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 dark:text-secondary-300 mb-1" htmlFor="password">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? (isLogin ? 'Logging In...' : 'Signing Up...') : (isLogin ? 'Log In' : 'Sign Up')}
              </Button>

              {error && <p className="text-error-500 text-sm text-center">{error}</p>}
              {message && <p className="text-success-500 text-sm text-center">{message}</p>}

            </form>

            <div className="text-center mt-6">
              <Button variant="ghost" onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
            <Button variant="ghost" onClick={handleGuestLogin} className="text-sm text-text-subtle hover:underline">
                Or continue as a guest
            </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;