import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, TrendingUp, BarChart3, ShieldCheck, Zap } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { toast } from "sonner";

export function Register() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [requires2FA, setRequires2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
    setErrors({});

    const params = new URLSearchParams(location.search);
    if (params.get('requires2FA') === 'true' && params.get('userId')) {
      const uId = params.get('userId');
      const trustedToken = localStorage.getItem('trustedDeviceToken');

      if (trustedToken) {
        axios.post('http://localhost:3000/api/auth/login/trusted', { userId: uId, trustedDeviceToken: trustedToken })
          .then(res => {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/dashboard');
          })
          .catch(() => {
            setRequires2FA(true);
            setTempUserId(uId);
            toast.info('Please enter your 2FA code to continue.');
            window.history.replaceState({}, document.title, "/login");
          });
      } else {
        setRequires2FA(true);
        setTempUserId(uId);
        toast.info('Please enter your 2FA code to continue.');
        window.history.replaceState({}, document.title, "/login");
      }
    } else {
      setRequires2FA(false);
    }
  }, [location.pathname, location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isLogin) {
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        if (!isLogin) {
          const fullName = `${formData.firstName} ${formData.lastName}`.trim();
          
          await axios.post('http://localhost:3000/api/auth/register', {
            name: fullName,
            email: formData.email,
            password: formData.password
          });
          
          toast.success('Account created successfully! You can now log in.');
          navigate('/login');
        } else {
          const trustedDeviceToken = localStorage.getItem('trustedDeviceToken');
          const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: formData.email,
            password: formData.password,
            trustedDeviceToken
          });
          
          if (response.data.requires2FA) {
            setRequires2FA(true);
            setTempUserId(response.data.userId);
            toast.info('Please enter your 2FA code to continue.');
            return;
          }

          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          toast.success('Welcome back!');
          navigate('/dashboard');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'A connection error occurred');
      }
    }
  };

  const handleVerify2FALogin = async (e) => {
    e.preventDefault();
    
    if (twoFactorCode.length !== 6) {
      return toast.warning('Code must be exactly 6 digits.');
    }

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login/2fa', {
        userId: tempUserId,
        token: twoFactorCode,
        rememberMe
      });

      if (rememberMe && response.data.trustedDeviceToken) {
        localStorage.setItem('trustedDeviceToken', response.data.trustedDeviceToken);
      } else if (!rememberMe) {
        localStorage.removeItem('trustedDeviceToken');
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Identity verified. Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid 2FA code');
      setTwoFactorCode('');
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = 'http://localhost:3000/api/auth/google';
  };

  const features = [
    { icon: BarChart3, title: "Pro Analytics", color: "text-blue-400" },
    { icon: ShieldCheck, title: "Vault Security", color: "text-emerald-400" },
    { icon: Zap, title: "Instant Trade", color: "text-purple-400" },
  ];

  return (
    <div 
      className="min-h-screen bg-[#030712] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-blue-500/30"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay"></div>
        
        <motion.div
          className="absolute top-[-10%] -left-[10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(3,7,18,0) 70%)' }}
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-[10%] -right-[10%] w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[120px] opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(3,7,18,0) 70%)' }}
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="w-full max-w-7xl grid lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full lg:col-span-5 order-2 lg:order-1"
        >
          <div className="bg-[#0f172a]/30 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 border border-white/[0.06] shadow-2xl relative overflow-hidden">
            
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-8 lg:hidden">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">InvestPro</h1>
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
                {requires2FA ? "Two-Factor Auth" : (isLogin ? "Welcome back" : "Create account")}
              </h2>
              <p className="text-slate-400 text-sm font-medium">
                {requires2FA 
                  ? "Enter the 6-digit code from your authenticator app." 
                  : (isLogin ? "Enter your credentials to access your portfolio." : "Start your journey to financial freedom.")}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {requires2FA ? (
                <motion.form 
                  key="2fa-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleVerify2FALogin} 
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="twoFactorCode" className="text-[11px] uppercase tracking-widest text-slate-500 font-bold ml-1">Authentication Code</Label>
                    <Input
                      id="twoFactorCode" name="twoFactorCode" type="text" maxLength="6" placeholder="000000"
                      value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                      className="h-14 rounded-lg bg-black/20 border-white/5 text-white placeholder:text-slate-700 px-4 text-center text-2xl tracking-[0.5em] font-bold focus:bg-black/40 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <label className="flex items-center justify-center space-x-3 pt-2 pb-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded-md border border-white/20 bg-black/40 peer-checked:bg-blue-600 peer-checked:border-blue-500 transition-all flex items-center justify-center group-hover:border-white/40 shadow-inner">
                        <svg className={`w-3.5 h-3.5 text-white ${rememberMe ? 'opacity-100 scale-100' : 'opacity-0 scale-50'} transition-all duration-200`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors select-none">
                      Remember this device
                    </span>
                  </label>
                  
                  <div className="pt-2 space-y-4">
                    <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5">
                      Verify Identity
                    </Button>
                    <button type="button" onClick={() => { setRequires2FA(false); setTwoFactorCode(''); setRememberMe(false); }} className="w-full h-11 bg-transparent hover:bg-white/[0.03] border border-white/5 text-white text-sm font-medium rounded-lg transition-all">
                      Back to login
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form 
                  key="standard-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSubmit} 
                  className="space-y-5"
                >
                  {!isLogin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-[11px] uppercase tracking-widest text-slate-500 font-bold ml-1">First Name</Label>
                        <Input
                          id="firstName" name="firstName" type="text" placeholder="John"
                          value={formData.firstName} onChange={handleChange}
                          className={`h-11 rounded-lg bg-black/20 border-white/5 text-white placeholder:text-slate-700 px-4 focus:bg-black/40 focus:ring-1 focus:ring-blue-500 transition-all ${errors.firstName ? 'border-red-500/50' : ''}`}
                        />
                        {errors.firstName && <p className="text-xs text-red-400 ml-1">{errors.firstName}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-[11px] uppercase tracking-widest text-slate-500 font-bold ml-1">Last Name</Label>
                        <Input
                          id="lastName" name="lastName" type="text" placeholder="Doe"
                          value={formData.lastName} onChange={handleChange}
                          className={`h-11 rounded-lg bg-black/20 border-white/5 text-white placeholder:text-slate-700 px-4 focus:bg-black/40 focus:ring-1 focus:ring-blue-500 transition-all ${errors.lastName ? 'border-red-500/50' : ''}`}
                        />
                        {errors.lastName && <p className="text-xs text-red-400 ml-1">{errors.lastName}</p>}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[11px] uppercase tracking-widest text-slate-500 font-bold ml-1">Email Address</Label>
                    <Input
                      id="email" name="email" type="email" placeholder="name@example.com"
                      value={formData.email} onChange={handleChange}
                      className={`h-11 rounded-lg bg-black/20 border-white/5 text-white placeholder:text-slate-700 px-4 focus:bg-black/40 focus:ring-1 focus:ring-blue-500 transition-all ${errors.email ? 'border-red-500/50' : ''}`}
                    />
                    {errors.email && <p className="text-xs text-red-400 ml-1">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <Label htmlFor="password" className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Password</Label>
                      {isLogin && (
                        <Link to="/forgot-password" size="sm" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                          Forgot password?
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                        value={formData.password} onChange={handleChange}
                        className={`h-11 rounded-lg bg-black/20 border-white/5 text-white placeholder:text-slate-700 px-4 pr-12 focus:bg-black/40 focus:ring-1 focus:ring-blue-500 transition-all ${errors.password ? 'border-red-500/50' : ''}`}
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-400 ml-1">{errors.password}</p>}
                  </div>

                  {!isLogin && (
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-[11px] uppercase tracking-widest text-slate-500 font-bold ml-1">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••"
                          value={formData.confirmPassword} onChange={handleChange}
                          className={`h-11 rounded-lg bg-black/20 border-white/5 text-white placeholder:text-slate-700 px-4 pr-12 focus:bg-black/40 focus:ring-1 focus:ring-blue-500 transition-all ${errors.confirmPassword ? 'border-red-500/50' : ''}`}
                        />
                        <button
                          type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-xs text-red-400 ml-1">{errors.confirmPassword}</p>}
                    </div>
                  )}

                  <div className="pt-6 space-y-4">
                    <Button
                      type="submit"
                      className="w-full h-11 bg-white text-black hover:bg-slate-200 text-sm font-bold rounded-lg transition-all shadow-lg hover:-translate-y-0.5"
                    >
                      {isLogin ? "Sign In" : "Create Account"}
                    </Button>

                    <div className="flex items-center justify-center space-x-3 py-1">
                      <div className="flex-1 h-px bg-white/5"></div>
                      <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">or</span>
                      <div className="flex-1 h-px bg-white/5"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="w-full h-11 bg-transparent hover:bg-white/[0.03] border border-white/5 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-3"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                  </div>

                  <p className="text-center text-slate-500 mt-8 text-sm">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <Link
                      to={isLogin ? "/register" : "/login"}
                      className="text-white font-semibold hover:text-blue-400 transition-colors"
                    >
                      {isLogin ? "Sign up" : "Log in"}
                    </Link>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-7 lg:pl-10 order-1 lg:order-2 hidden lg:flex flex-col h-full relative"
        >
          <div className="absolute -inset-x-10 -inset-y-20 opacity-40 pointer-events-none">
            <svg viewBox="0 0 500 500" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <motion.path 
                d="M50 400 L150 350 L200 370 L300 300 L380 320 L480 200" 
                stroke="url(#lineGradient)" 
                strokeWidth="2" 
                fill="none" 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 3, delay: 0.5, ease: "easeInOut" }}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(59,130,246,0)" />
                  <stop offset="50%" stopColor="rgba(59,130,246,0.8)" />
                  <stop offset="100%" stopColor="rgba(139,92,246,0.8)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <div className="mb-16 relative z-10 pt-10">
            <div className="hidden lg:flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight">InvestPro</h1>
            </div>
            
            <h2 className="text-5xl font-black text-white leading-tight tracking-tighter mb-8">
              Trade<br />
              <span className="text-blue-400">future</span>. Now.
            </h2>
            <p className="text-lg text-slate-400 max-w-md font-medium leading-relaxed">
              Join a global network of smart investors. Access institutional-grade tools with zero friction.
            </p>
          </div>

          <div className="space-y-10 relative z-10 flex-grow">
            {features.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.15 }}
                className="flex items-center gap-6"
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center ${item.color} shadow-[0_0_15px_rgba(255,255,255,0.02)]`}>
                  <item.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-bold text-white tracking-tight">{item.title}</h3>
                  <div className="w-10 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-1.5"></div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="relative z-10 pt-10 mt-auto border-t border-white/[0.05]">
            <div className="grid grid-cols-3 gap-8">
              {[ { value: "500K+", label: "Investors" }, { value: "$2B+", label: "Capital" }, { value: "4.9★", label: "Rating" } ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-slate-600 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}

export default Register;