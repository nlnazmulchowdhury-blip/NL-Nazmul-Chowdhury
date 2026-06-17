import { useState, useEffect } from 'react';
import {
  Shield, Smartphone, KeyRound, Copy, Check, AlertCircle,
  Loader2, Download, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { setup2FA, verify2FA, disable2FA, get2FAStatus, regenerateBackupCodes } from '../../api';

export default function SecurityPage() {
  const { requires2FASetup } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Setup state
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupStep, setSetupStep] = useState('idle'); // idle | show_qr | verifying | done
  const [saving, setSaving] = useState(false);

  // Disable state
  const [disableCode, setDisableCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  // Backup codes
  const [backupCodes, setBackupCodes] = useState([]);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadStatus = () => {
    get2FAStatus()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSetup = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await setup2FA();
      setSetupData(data);
      setSetupStep('show_qr');
      setBackupCodes(data.backup_codes || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start 2FA setup.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (setupCode.length !== 6) return;
    setSaving(true);
    setError('');
    try {
      const data = await verify2FA(setupCode);
      setSetupStep('done');
      setBackupCodes(data.backup_codes || []);
      setSuccess('2FA enabled successfully! Save your backup codes.');
      loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!disableCode) return;
    setSaving(true);
    setError('');
    try {
      await disable2FA(disableCode);
      setSuccess('2FA disabled successfully.');
      setShowDisable(false);
      setDisableCode('');
      setSetupStep('idle');
      setSetupData(null);
      loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disable 2FA.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await regenerateBackupCodes();
      setBackupCodes(data.backup_codes || []);
      setSuccess('New backup codes generated!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to regenerate codes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCodes = () => {
    const text = `ProConverterBD Backup Codes\n${'='.repeat(30)}\n\n${backupCodes.join('\n')}\n\nKeep these in a safe place!\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proconverterbd-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isEnabled = status?.is_enabled;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        <p className="text-gray-500 text-sm mt-1">Two-factor authentication settings</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><span className="text-xs">✕</span></button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2.5">
          <Check size={16} className="text-green-500" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Two-Factor Authentication
              </h3>
              <p className={`text-xs ${isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {isEnabled ? 'Enabled — Extra security is active' : 'Not configured'}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${isEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
            {isEnabled ? 'ON' : 'OFF'}
          </span>
        </div>

        {isEnabled && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
            <Smartphone size={14} />
            <span>Backup codes remaining: {status?.backup_codes_remaining || 0}</span>
          </div>
        )}
      </div>

      {/* Mandatory 2FA Banner */}
      {requires2FASetup && !loading && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              2FA is required for all admin users
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Your account is not yet protected. Please set up two-factor authentication below to
              continue accessing the admin panel.
            </p>
          </div>
        </div>
      )}

      {/* Setup Flow */}
      {!isEnabled && setupStep === 'idle' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {requires2FASetup ? 'Set Up Two-Factor Authentication (Required)' : 'Enable 2FA'}
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Add an extra layer of security to your admin account. Use Google Authenticator,
            Authy, or any TOTP-compatible app.
          </p>
          {requires2FASetup ? (
            <button
              onClick={handleSetup}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              Get Started — Set Up 2FA Now
            </button>
          ) : (
            <button
              onClick={handleSetup}
              disabled={saving}
              className="btn-primary !py-2.5 !px-5 text-sm flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
              Get Started
            </button>
          )}
        </div>
      )}

      {/* QR Code Step */}
      {setupStep === 'show_qr' && setupData && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Step 1: Scan QR Code</h3>
            <p className="text-xs text-gray-500">
              Scan this QR code with your authenticator app, or enter the secret key manually.
            </p>
          </div>

          {/* QR Code (server-generated) */}
          <div className="flex justify-center">
            <img
              src={setupData.qr_data_url}
              alt="2FA QR Code"
              className="rounded-xl border border-gray-200 shadow-sm"
              width="200"
              height="200"
            />
          </div>

          {/* Manual entry */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Or enter this key manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-white border border-gray-200 rounded-lg px-3 py-2 select-all">
                {setupData.secret}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(setupData.secret);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-2 rounded-lg hover:bg-white border border-gray-200 text-gray-400 hover:text-indigo-600"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Verify */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Step 2: Verify Code</h3>
            <p className="text-xs text-gray-500 mb-3">
              Enter the 6-digit code from your authenticator app to enable 2FA.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-36 px-3 py-2.5 border border-gray-200 rounded-lg text-center text-lg tracking-[0.3em] font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                maxLength={6}
                autoFocus
              />
              <button
                onClick={handleVerify}
                disabled={saving || setupCode.length !== 6}
                className="btn-primary !py-2.5 !px-5 text-sm flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Verify & Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Display */}
      {backupCodes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Backup Codes</h3>
            {isEnabled && (
              <button
                onClick={handleRegenerate}
                disabled={saving}
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <RefreshCw size={12} /> Regenerate
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Each backup code can be used once if you lose access to your authenticator app.
            Keep them in a safe place.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {backupCodes.map((code, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 text-center tracking-wider">
                {code}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handleCopyCodes} className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={handleDownloadCodes} className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1">
              <Download size={12} /> Download
            </button>
          </div>
        </div>
      )}

      {/* Disable 2FA */}
      {isEnabled && (
        <div className="mt-6">
          {!showDisable ? (
            <button
              onClick={() => setShowDisable(true)}
              className="text-sm text-red-500 hover:text-red-600"
            >
              &larr; Disable Two-Factor Authentication
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-red-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Disable 2FA</h3>
              <p className="text-xs text-gray-500 mb-3">
                Enter your current 2FA code or a backup code to disable.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="2FA or backup code"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
                <button
                  onClick={handleDisable}
                  disabled={saving || !disableCode}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Disable
                </button>
                <button
                  onClick={() => { setShowDisable(false); setDisableCode(''); }}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
