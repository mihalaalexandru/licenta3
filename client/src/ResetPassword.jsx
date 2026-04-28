import { useState } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`http://localhost:3000/api/auth/resetpassword/${token}`, { password });
      setMessage(response.data.message);
      setError("");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred while resetting your password");
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] flex items-center justify-center p-8 relative overflow-hidden font-sans">
      
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-[10%] left-[20%] w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[140px]"
          animate={{ scale: [1, 1.15, 1], x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px]"
          animate={{ scale: [1.1, 1, 1.1], x: [0, -40, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[650px] relative z-10 py-16"
      >
        <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3.5rem] p-12 sm:p-16 border border-white/5 shadow-2xl">
          <div className="mb-14 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-10">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-5xl font-bold text-white mb-6 tracking-tight">
              New Password
            </h2>
            <p className="text-slate-400 text-xl leading-relaxed max-w-md">
              Your security is our priority. Please choose a strong new password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-4">
              <Label htmlFor="password" className="text-slate-300 ml-2 text-lg font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-16 rounded-2xl bg-slate-950/50 border-white/10 text-white text-lg placeholder:text-slate-600 px-6 pr-16 focus:ring-2 focus:ring-purple-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-base text-center font-medium"
              >
                {error}
              </motion.div>
            )}

            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-base text-center font-medium"
              >
                {message}
              </motion.div>
            )}

            <div className="pt-6">
              <Button
                type="submit"
                className="w-full h-20 bg-white text-slate-950 hover:bg-slate-200 text-2xl font-bold rounded-2xl transition-all shadow-xl hover:-translate-y-1"
              >
                Update Password
              </Button>
            </div>

            <div className="text-center mt-12">
              <Link
                to="/login"
                className="text-slate-400 hover:text-white text-xl font-medium transition-colors inline-flex items-center gap-3 underline underline-offset-[12px] decoration-white/10 hover:decoration-purple-500/50"
              >
                <ArrowLeft className="w-6 h-6" /> Back to Login
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default ResetPassword;