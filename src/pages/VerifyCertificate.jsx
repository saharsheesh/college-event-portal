import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as api from '../services/api';
import { Shield, Search, CheckCircle, XCircle, Calendar, User, Award, Hash } from 'lucide-react';

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const certParam = searchParams.get('cert') || '';
  const [certNumber, setCertNumber] = useState(certParam);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const verify = useCallback(async (query) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.verifyCertificate(query);
      setResult(res);
    } catch {
      setResult({ valid: false, message: 'Verification failed' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify automatically when opened from a link or QR code (?cert=...)
  useEffect(() => {
    if (certParam.trim()) verify(certParam.trim());
  }, [certParam, verify]);

  const handleVerify = () => {
    const query = certNumber.trim();
    if (query) verify(query);
  };

  return (
    <div className="min-h-screen dark:bg-surface-950 bg-surface-50 pt-24 pb-16">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold dark:text-white text-surface-900 mb-2">
              Certificate Verification
            </h1>
            <p className="dark:text-surface-400 text-surface-500">
              Enter a certificate number or scan a QR code to verify authenticity
            </p>
          </div>

          {/* Search */}
          <div className="rounded-2xl dark:bg-surface-900/50 bg-white border dark:border-white/5 border-surface-200 p-6 sm:p-8 mb-6">
            <label className="block text-sm font-medium dark:text-surface-300 text-surface-700 mb-3">
              Certificate Number
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 dark:text-surface-500 text-surface-400" />
                <input
                  type="text"
                  value={certNumber}
                  onChange={e => setCertNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  className="w-full pl-11 pr-4 py-3 rounded-xl dark:bg-surface-800/50 bg-surface-50 border dark:border-white/10 border-surface-200 dark:text-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition font-mono"
                  placeholder="e.g. CERT-2026-WDB-001"
                />
              </div>
              <button
                onClick={() => handleVerify()}
                disabled={loading || !certNumber.trim()}
                className="px-6 py-3 rounded-xl text-white font-semibold gradient-bg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Search className="w-5 h-5" /> Verify</>
                )}
              </button>
            </div>
          </div>

          {/* Result */}
          {searched && !loading && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border p-6 sm:p-8 ${
                result.valid
                  ? 'dark:bg-emerald-500/5 bg-emerald-50 border-emerald-500/20'
                  : 'dark:bg-red-500/5 bg-red-50 border-red-500/20'
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                {result.valid ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-emerald-400">Certificate Verified ✓</h3>
                      <p className="text-sm dark:text-surface-400 text-surface-500">This certificate is authentic</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <XCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-red-400">Not Found</h3>
                      <p className="text-sm dark:text-surface-400 text-surface-500">No certificate matches this number</p>
                    </div>
                  </>
                )}
              </div>

              {result.valid && result.certificate && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { icon: User, label: 'Name', value: result.certificate.name },
                      { icon: Award, label: 'Event', value: result.certificate.eventName },
                      { icon: Calendar, label: 'Event Date', value: new Date(result.certificate.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                      { icon: Calendar, label: 'Issued On', value: new Date(result.certificate.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    ].map(item => (
                      <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl dark:bg-surface-900/50 bg-white border dark:border-white/10 border-surface-200">
                        <item.icon className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs dark:text-surface-500 text-surface-400 font-medium">{item.label}</p>
                          <p className="text-sm dark:text-white text-surface-900 font-medium">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl dark:bg-surface-900/50 bg-white border dark:border-white/10 border-surface-200">
                    <Hash className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs dark:text-surface-500 text-surface-400 font-medium">Certificate Number</p>
                      <p className="text-sm dark:text-white text-surface-900 font-mono font-medium">{result.certificate.certificateNumber}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Help text */}
          <div className="mt-8 text-center">
            <p className="text-sm dark:text-surface-500 text-surface-400">
              Certificate numbers can be found on PDF certificates or by scanning the QR code.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
