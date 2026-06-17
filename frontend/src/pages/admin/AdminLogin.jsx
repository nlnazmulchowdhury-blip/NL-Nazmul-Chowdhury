import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle, Shield, KeyRound, Smartphone, Check, Loader2, Copy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { complete2FALogin, mandatory2FASetup, mandatory2FAVerify } from '../../api';

export default function AdminLogin() {
  const { login, setUserFromData } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('credentials'); // credentials | verify_2fa | mandatory_setup | mandatory_verify | mandatory_done
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // 2FA verification
  const [twoFACode, setTwoFACode] = useState('');
  const [tempToken, setTempToken] = useState('');

  // Mandatory 2FA setup
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-start mandatory setup when we have a temp token and step is mandatory_setup
  useEffect(() => {
    if (step === 'mandatory_setup' && tempToken && !setupData) {
      startMandatorySetup();
    }
  }, [step, tempToken]);

  const startMandatorySetup = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await mandatory2FASetup(tempToken);
      setSetupData(data);
      setBackupCodes(data.backup_codes || []);
      setStep('mandatory_verify');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await login(username, password);
      if (data.requires_2fa) {
        setTempToken(data.temp_token);
        setStep('verify_2fa');
        setPassword('');
        setError('');
      } else if (data.requires_2fa_setup) {
        setTempToken(data.temp_token);
        setStep('mandatory_setup');
        setPassword('');
        setError('');
      } else {
        navigate('/control-panel');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!twoFACode) {
      setError('Please enter your 2FA code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await complete2FALogin(tempToken, twoFACode);
      setUserFromData(data);
      navigate('/control-panel');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid 2FA code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMandatoryVerify = async (e) => {
    e.preventDefault();
    if (setupCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await mandatory2FAVerify(tempToken, setupCode);
      setUserFromData(data);
      setStep('mandatory_done');
      setBackupCodes(data.backup_codes || []);
      // Navigate to dashboard after a brief moment
      setTimeout(() => navigate('/control-panel'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setTwoFACode('');
    setTempToken('');
    setSetupData(null);
    setSetupCode('');
    setError('');
  };

  const renderIcon = () => {
    if (step === 'mandatory_setup' || step === 'mandatory_verify' || step === 'mandatory_done') return Shield;
    if (step === 'verify_2fa') return Smartphone;
    return Shield;
  };

  const Icon = renderIcon();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4">
            <Icon size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-indigo-200/70 text-sm mt-1">
            {step === 'mandatory_setup' && 'Setting Up Two-Factor Authentication...'}
            {step === 'mandatory_verify' && 'Verify Your Authenticator App'}
            {step === 'mandatory_done' && '2FA Enabled Successfully!'}
            {step === 'verify_2fa' && 'Enter 2FA Verification Code'}
            {step === 'credentials' && 'ProConverterBD Control Center'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          {step === 'credentials' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} /> Sign In
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'verify_2fa' && (
            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div className="text-center mb-2">
                <KeyRound size={40} className="text-indigo-400 mx-auto mb-2" />
                <p className="text-sm text-indigo-200">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-2 text-center">
                  Authentication Code
                </label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                disabled={loading || twoFACode.length !== 6}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} /> Verify & Sign In
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
                >
                  &larr; Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* Loading state for mandatory setup */}
          {step === 'mandatory_setup' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 size={40} className="animate-spin text-indigo-400 mx-auto" />
              <p className="text-indigo-200 text-sm">Preparing your 2FA setup...</p>
            </div>
          )}

          {/* Mandatory 2FA verify step */}
          {step === 'mandatory_verify' && setupData && (
            <div className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-xs text-indigo-300 text-center font-medium">
                  Two-Factor Authentication is required for all admin users.
                  Set it up now to continue.
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <img
                  src={setupData.qr_data_url}
                  alt="2FA QR Code"
                  className="rounded-xl border border-white/10 shadow-sm bg-white p-2"
                  width="180"
                  height="180"
                />
              </div>

              {/* Manual key */}
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs font-medium text-indigo-300 mb-1">Or enter this key manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-indigo-200 select-all">
                    {setupData.secret}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(setupData.secret);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 border border-white/10 text-gray-400 hover:text-indigo-300"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Verify code */}
              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-2 text-center">
                  Enter the 6-digit code from your authenticator app
                </label>
                <input
                  type="text"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                />
              </div>

              <button
                type="button"
                onClick={handleMandatoryVerify}
                disabled={loading || setupCode.length !== 6}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} /> Verify & Enable 2FA
                  </>
                )}
              </button>
            </div>
          )}

          {/* Mandatory done - success */}
          {step === 'mandatory_done' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <Check size={32} className="text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold">2FA Enabled Successfully!</p>
                <p className="text-indigo-200/70 text-xs mt-1">Redirecting to dashboard...</p>
              </div>
              {backupCodes.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 text-left">
                  <p className="text-xs font-medium text-indigo-300 mb-2">Your Backup Codes</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {backupCodes.map((code, i) => (
                      <div key={i} className="bg-white/10 rounded px-2 py-1 font-mono text-xs text-indigo-200 text-center tracking-wider">
                        {code}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-indigo-400/60 mt-2">
                    Save these somewhere safe. Each code can be used once if you lose access to your authenticator app.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <Link to="/" className="text-sm text-indigo-300 hover:text-indigo-200 transition-colors">
              &larr; Back to ProConverterBD
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
