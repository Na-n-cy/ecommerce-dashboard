import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { callGemini } from '../lib/gemini';
import { Sparkles, Loader2, IndianRupee, TrendingUp, Package } from 'lucide-react';

function formatGeminiResponse(text) {
  if (!text) return null
  return text
    .split('\n')
    .filter(line => line.trim() !== '')
    .map((line, index) => {
      // Remove ** markdown bold markers
      const cleaned = line.replace(/\*\*(.*?)\*\*/g, '$1').trim()

      // Check if it starts with a number like "1." "2." "3."
      const isNumbered = /^\d+\./.test(cleaned)

      return (
        <div key={index} className={`mb-2 ${isNumbered ? 'font-medium' : ''}`}>
          {cleaned}
        </div>
      )
    })
}

const Recommendations = () => {
  const { shopId } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (shopId) fetchProducts();
  }, [shopId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Fetch products
      const { data: prods, error: pErr } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopId)
        .order('name');

      console.log('Products fetched:', prods?.length, prods?.map(p => p.name));

      if (pErr) throw pErr;

      // Fetch event counts
      const { data: events, error: eErr } = await supabase
        .from('events')
        .select('product_id, event_type')
        .eq('shop_id', shopId);

      if (eErr) throw eErr;

      const scoredProducts = prods.map(p => {
        const pEvents = events.filter(e => e.product_id === p.id);
        const counts = {
          view: pEvents.filter(e => e.event_type === 'view').length,
          cart: pEvents.filter(e => e.event_type === 'cart').length,
          purchase: pEvents.filter(e => e.event_type === 'purchase').length,
        };
        const score = (counts.view * 1) + (counts.cart * 2) + (counts.purchase * 5);
        return { ...p, counts, score };
      }).sort((a, b) => b.score - a.score);

      setProducts(scoredProducts);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsight = async () => {
    const topProducts = products.map(p => ({
      name: p.name,
      views: p.counts?.view,
      carts: p.counts?.cart,
      purchases: p.counts?.purchase
    }));
    if (topProducts.length === 0) {
      setAiInsight("No engagement data yet.");
      return;
    }

    setAiLoading(true);
    const prompt = `Give exactly 3 recommendations for this store owner. Number them 1, 2, 3. Start with "1." on the first line. Put each on a new line. Max 20 words each. No intro. No asterisks.

Products this week:
${topProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p.name}: ${p.views || 0} views, ${p.carts || 0} carts, ${p.purchases || 0} bought`).join('\n')}`;

    const result = await callGemini(prompt);
    if (result) {
      setAiInsight(result);
    } else {
      setAiInsight("AI insight unavailable. Check your VITE_GROQ_API_KEY in .env");
    }
    setAiLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (error) return <div className="text-center p-12 bg-red-50 rounded-xl"><p className="text-red-600 mb-4">{error}</p><button onClick={fetchProducts} className="px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button></div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            Recommendations
          </h1>
          <p className="text-gray-500 mt-1">Smart insights for your inventory.</p>
        </div>
        <button
          onClick={generateAIInsight}
          disabled={aiLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          Generate AI Insight
        </button>
      </div>

      {/* AI Insight Panel */}
      {aiInsight && (
        <div className="bg-white rounded-r-2xl shadow-sm animate-in slide-in-from-top-4 duration-500" style={{
          borderLeft: '4px solid #0d9488',
          background: '#f0fdfa',
          padding: '20px 24px',
          borderRadius: '0 12px 12px 0',
          marginBottom: '24px',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'visible',
          minHeight: 'auto'
        }}>
          <div className="flex items-center gap-2 mb-4 text-teal-700 font-bold">
            <Sparkles size={18} />
            AI Strategy Insight
          </div>
          <div className="text-gray-700 whitespace-pre-line leading-relaxed">
            {aiInsight && (() => {
              // Try to split by numbered points first
              const lines = aiInsight.split('\n').filter(l => l.trim().length > 0)
              const numbered = lines.filter(l => /^\d+[\.\)]/.test(l.trim()))

              // If we got numbered lines use them, otherwise split by sentence
              const points = numbered.length >= 2 ? numbered :
                aiInsight.split(/(?<=\.)\s+(?=[A-Z]|[0-9])/)
                  .filter(s => s.trim().length > 10)
                  .slice(0, 3)

              return points.map((point, i) => (
                <div key={i} style={{
                  padding: '14px 18px',
                  marginBottom: '10px',
                  background: 'white',
                  borderLeft: '3px solid #16a34a',
                  borderRadius: '0 8px 8px 0',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  color: '#111827',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  overflow: 'visible',
                  wordBreak: 'break-word',
                  display: 'block',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {point.trim()}
                </div>
              ))
            })()}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Generated at {new Date().toLocaleTimeString()}</p>
            <button onClick={generateAIInsight} className="text-xs text-teal-600 font-semibold hover:underline">Regenerate</button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-500">No products found. Add products in the Products page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full group hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    {p.category}
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.score > 20 ? 'bg-green-100 text-green-700' : p.score > 5 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {p.score > 20 ? 'High demand' : p.score > 5 ? 'Moderate' : 'Low activity'}
                </div>
              </div>

              <div className="flex items-center gap-1 text-xl font-bold text-gray-900 mb-1">
                <IndianRupee size={16} strokeWidth={3} />
                {p.price}
              </div>
              <p className="text-xs text-gray-500 mb-6 flex items-center gap-1">
                <Package size={12} /> {p.stock} units in stock
              </p>

              {/* Engagement Bars */}
              <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-gray-400 w-16 uppercase">Views</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, p.counts.view * 5)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-600">{p.counts.view}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-gray-400 w-16 uppercase">In Cart</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, p.counts.cart * 10)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-600">{p.counts.cart}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-gray-400 w-16 uppercase">Bought</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, p.counts.purchase * 20)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-600">{p.counts.purchase}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-50 flex items-start gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
                  <TrendingUp size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Why Recommended?</p>
                  <p className="text-xs text-gray-700 font-medium">
                    {p.counts.purchase > 0 ? 'Customers are actively buying this' :
                      p.counts.cart > 0 ? 'Frequently added to cart' :
                        p.counts.view > 0 ? 'High browsing interest' : 'New product — no activity yet'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recommendations;
