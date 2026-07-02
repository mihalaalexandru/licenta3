import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from './components/ui/skeleton'; 

export default function AuthSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userDataString = params.get('user');

    if (token && userDataString) {
      try {
        const user = JSON.parse(decodeURIComponent(userDataString));
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        toast.success('Successfully logged in with Google!');
        navigate('/dashboard', { replace: true });
      } catch (e) {
        toast.error('Error processing login data.');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [location, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full animate-spin border-t-4 border-blue-600 bg-transparent" />
        <p className="text-lg font-medium text-muted-foreground">Securing your session...</p>
      </div>
    </div>
  );
}