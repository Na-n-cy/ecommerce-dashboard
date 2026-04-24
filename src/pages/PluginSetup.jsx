import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Copy, 
  Check, 
  Terminal, 
  ChevronRight, 
  Zap, 
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';

const PluginSetup = () => {
  const { shopId } = useAuth();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedStep, setCopiedStep] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState(null); // 'connected' or 'no-events'

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const maskedUrl = supabaseUrl.substring(0, 30) + '...';

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'shopId') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedStep(type);
      setTimeout(() => setCopiedStep(null), 2000);
    }
  };

  const verifyConnection = async () => {
    setVerifying(true);
    setStatus(null);
    try {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .gte('created_at', fiveMinsAgo);

      setStatus(count > 0 ? 'connected' : 'no-events');
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Copy plugin files',
      desc: "Copy tracker.js and TrackerProvider.jsx into your website's src/lib/ folder",
      code: '// Available in the ecommerce-tracker-plugin directory'
    },
    {
      id: 2,
      title: 'Add to .env',
      desc: "Add these variables to your website's .env file",
      code: `VITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY\nVITE_SHOP_ID=${shopId}`
    },
    {
      id: 3,
      title: 'Wrap your App in main.jsx',
      desc: 'Connect the provider to your React application root.',
      code: `import { TrackerProvider } from './lib/TrackerProvider'
const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  shopId: import.meta.env.VITE_SHOP_ID
}

<TrackerProvider config={config}>
  <App />
</TrackerProvider>`
    },
    {
      id: 4,
      title: 'Track events in product components',
      desc: 'Use the hook to track views, cart adds, and purchases.',
      code: `import { useTracker } from './lib/TrackerProvider'
const { trackView } = useTracker()

useEffect(() => { 
  trackView(product.id) 
}, [product.id])`
    }
  ];

  return (
    <div className="max-w-4xl space-y-12 pb-20">
      <div className="flex justify-between items-end border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Plugin Setup</h1>
          <p className="text-gray-500 mt-1">Instrument your website to start tracking customer events.</p>
        </div>
      </div>

      {/* Section 1: Shop details */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
          <ChevronRight size={14} /> Shop Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm group">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Unique Shop ID</p>
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-gray-100 rounded-xl group-hover:border-blue-200 transition-colors">
              <code className="text-sm font-bold text-blue-600">{shopId}</code>
              <button 
                onClick={() => copyToClipboard(shopId, 'shopId')}
                className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400"
              >
                {copiedId ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Supabase URL</p>
            <p className="text-sm font-mono text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 truncate">
              {maskedUrl}
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Steps */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
          <ChevronRight size={14} /> Installation Steps
        </div>
        <div className="space-y-8">
          {steps.map(step => (
            <div key={step.id} className="relative pl-12 border-l-2 border-gray-100 pb-12 last:pb-0">
              <div className="absolute -left-[16px] top-0 w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                {step.id}
              </div>
              <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
              <p className="text-sm text-gray-500 mb-4">{step.desc}</p>
              <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2"><Terminal size={12} /> Code Snippet</div>
                  <button 
                    onClick={() => copyToClipboard(step.code, step.id)}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    {copiedStep === step.id ? <>Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
                <pre className="p-6 text-xs text-blue-300 font-mono overflow-x-auto">
                  <code>{step.code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Verify */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
          <ChevronRight size={14} /> Verify Connection
        </div>
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-lg flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6">
            <Zap className="text-blue-500" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Is it live?</h3>
          <p className="text-sm text-gray-500 text-center max-w-sm mb-8 leading-relaxed">
            Click the button below to check if event data from your store is correctly reaching our servers.
          </p>
          
          {status === 'connected' && (
            <div className="w-full bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700 font-bold text-sm mb-6 animate-in zoom-in-95">
              <ShieldCheck size={20} />
              Plugin is connected and sending events!
            </div>
          )}
          {status === 'no-events' && (
            <div className="w-full bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 text-amber-700 font-bold text-sm mb-6 animate-in zoom-in-95">
              <AlertCircle size={20} />
              No events received yet. Follow the steps above.
            </div>
          )}

          <button 
            onClick={verifyConnection}
            disabled={verifying}
            className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-10 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50"
          >
            {verifying ? <Loader2 size={24} className="animate-spin" /> : <>Check Connection</>}
          </button>
        </div>
      </section>
    </div>
  );
};

export default PluginSetup;
