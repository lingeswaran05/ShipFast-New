import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { AlertModal } from '../shared/AlertModal';
import { useShipment } from '../../context/ShipmentContext';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, verifyOtp, resetPassword } = useShipment();
  const [currentStep, setCurrentStep] = useState('email'); // 'email' | 'otp' | 'reset' | 'success'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showResendModal, setShowResendModal] = useState(false);

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    try {
      await forgotPassword(email);
      setCurrentStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.join('').length !== 6) {
      setError('Please enter the complete OTP');
      return;
    }
    try {
      await verifyOtp(email, otp.join(''));
      setCurrentStep('reset');
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      await resetPassword(email, newPassword);
      setCurrentStep('success');
    } catch (err) {
      setError(err.message || 'Password reset failed');
    }
  };

  const handleResendCode = async () => {
      try {
        await forgotPassword(email);
        setShowResendModal(true);
      } catch (err) {
        setError(err.message || 'Failed to resend OTP');
      }
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, label: '' };
    if (password.length < 6) return { strength: 25, label: 'Weak', color: 'bg-red-500' };
    if (password.length < 10) return { strength: 50, label: 'Fair', color: 'bg-orange-500' };
    if (password.length < 14) return { strength: 75, label: 'Good', color: 'bg-yellow-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <AlertModal 
        isOpen={showResendModal}
        onClose={() => setShowResendModal(false)}
        title="Code Resent"
        message={`A new verification code has been sent to ${email}.`}
        type="success"
      />

      {/* Main Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-10 animate-scale-in">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo />
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'email' || currentStep === 'otp' || currentStep === 'reset' || currentStep === 'success' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              1
            </div>
            <div className={`w-16 h-1 ${currentStep === 'otp' || currentStep === 'reset' || currentStep === 'success' ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'otp' || currentStep === 'reset' || currentStep === 'success' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              2
            </div>
            <div className={`w-16 h-1 ${currentStep === 'reset' || currentStep === 'success' ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'reset' || currentStep === 'success' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              3
            </div>
          </div>

          {/* Email Step */}
          {currentStep === 'email' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Forgot Password?</h2>
                <p className="text-slate-600">Enter your email to receive a reset code</p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-slate-700 font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="arulraj.chennai@example.in"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-500/50 hover:shadow-xl"
                >
                  Send Reset Code
                </button>
              </form>

              <button
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-blue-600 font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          )}

          {/* OTP Step */}
          {currentStep === 'otp' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Enter OTP</h2>
                <p className="text-slate-600">We sent a code to {email}</p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 text-slate-900"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-500/50 hover:shadow-xl"
                >
                  Verify OTP
                </button>
              </form>

              <div className="text-center">
                <button 
                  type="button"
                  onClick={handleResendCode}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Resend Code
                </button>
              </div>
            </div>
          )}

          {/* Reset Password Step */}
          {currentStep === 'reset' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Create New Password</h2>
                <p className="text-slate-600">Choose a strong password</p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-slate-700 font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400"
                    required
                  />
                  
                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${passwordStrength.strength}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Password strength: <span className="font-semibold">{passwordStrength.label}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-slate-700 font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-500/50 hover:shadow-xl"
                >
                  Reset Password
                </button>
              </form>
            </div>
          )}

          {/* Success Step */}
          {currentStep === 'success' && (
            <div className="text-center space-y-6 animate-scale-in">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset Successful!</h2>
                <p className="text-slate-600">You can now login with your new password</p>
              </div>
              <button
                onClick={handleBackToLogin}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-500/50 hover:shadow-xl flex items-center justify-center gap-2"
              >
                Back to Login
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


