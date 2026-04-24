import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { callGemini } from '../lib/gemini';
import StatCard from '../components/StatCard';
import { Search, Hash, AlertTriangle, TrendingUp, Sparkles, Loader2, Calendar } from 'lucide-react';

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

const SearchIntelligence = () => {
  const { shopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalToday: 0,
    uniqueLast7: 0,
    zeroResultsLast7: 0,
    topToday: '...',
  });
  const [keywordTable, setKeywordTable] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStrategy, setAiStrategy] = useState(null);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [gapOpportunities, setGapOpportunities] = useState([]);

  useEffect(() => {
    if (shopId) fetchData();
  }, [shopId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isoToday = today.toISOString();

      const last7 = new Date();
      last7.setDate(last7.getDate() - 7);
      const iso7 = last7.toISOString();

      // 1. Searches Today
      const { count: countToday } = await supabase
        .from('search_events')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .gte('created_at', isoToday)
        .not('keyword', 'in', '("test keyword","test")');

      // 2. All Searches Last 7 Days
      const { data: searchData, error: sErr } = await supabase
        .from('search_events')
        .select('keyword, result_count')
        .eq('shop_id', shopId)
        .gte('created_at', iso7)
        .not('keyword', 'in', '("test keyword","test")');

      if (sErr) throw sErr;

      // 3. Process Keywords & Stats
      const kwMap = {};
      let zeroCount = 0;
      const zeroKeywords = new Set();

      searchData.forEach(s => {
        const kw = s.keyword?.toLowerCase().trim() || 'unknown';
        if (!kwMap[kw]) {
          kwMap[kw] = { count: 0, totalResults: 0, occurrences: 0 };
        }
        kwMap[kw].count += 1;
        kwMap[kw].totalResults += (s.result_count || 0);
        kwMap[kw].occurrences += 1;

        if (s.result_count === 0) {
          zeroCount += 1;
          zeroKeywords.add(kw);
        }
      });

      const sortedKws = Object.entries(kwMap)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([keyword, stats], index) => ({
          rank: index + 1,
          keyword,
          search_count: stats.count,
          avg_results: Math.round(stats.totalResults / stats.occurrences),
          status: stats.totalResults / stats.occurrences === 0 ? 'No Results' : 'Popular'
        }));

      setKeywordTable(sortedKws.slice(0, 20));
      setStats({
        totalToday: countToday || 0,
        uniqueLast7: Object.keys(kwMap).length,
        zeroResultsLast7: zeroCount,
        topToday: sortedKws[0]?.keyword || 'None'
      });

      const { data: trendFetchData } = await supabase
        .from('search_events')
        .select('keyword, result_count')
        .eq('shop_id', shopId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .not('keyword', 'in', '("test keyword","test")')

      if (trendFetchData) {
        // Group by keyword and count
        const keywordMap = {}
        trendFetchData.forEach(s => {
          if (!keywordMap[s.keyword]) {
            keywordMap[s.keyword] = { count: 0, hasResults: s.result_count > 0 }
          }
          keywordMap[s.keyword].count++
          if (s.result_count > 0) keywordMap[s.keyword].hasResults = true
        })

        const allKeywords = Object.entries(keywordMap)
          .map(([keyword, data]) => ({ keyword, ...data }))
          .sort((a, b) => b.count - a.count)

        // Trending = has results, searched more than once
        const trending = allKeywords.filter(k => k.hasResults)
        setTrendingSearches(trending)

        // Gap opportunities = zero results
        const gaps = allKeywords.filter(k => !k.hasResults)
        setGapOpportunities(gaps)
      }
    } catch (err) {
      console.error('Fetch search intelligence error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateAIStrategy = async () => {
    setAiLoading(true);
    try {
      const topKeywords = keywordTable.slice(0, 5);
      const gapKeywords = keywordTable.filter(k => k.avg_results === 0).slice(0, 5);

      const prompt = `You are a helpful business advisor for a small e-commerce store owner.

What customers searched for this week:
Searched and found products: ${trendingSearches.slice(0, 3).map(k => `"${k.keyword}" (${k.count} times)`).join(', ')}
Searched but found nothing: ${gapOpportunities.slice(0, 3).map(k => `"${k.keyword}" (${k.count} times)`).join(', ')}

Give exactly 3 practical recommendations to help the store owner improve sales.
Write in simple friendly language a non-technical person can understand.

Use this exact format for all 3 points:
1. [What to do]: [Why this will help - one clear sentence]
2. [What to do]: [Why this will help - one clear sentence]
3. [What to do]: [Why this will help - one clear sentence]

Important rules:
- Write all 3 points completely
- No asterisks or stars
- No bullet points
- Simple everyday words
- Maximum 25 words per point`;

      const result = await callGemini(prompt);
      setAiStrategy(result || "AI unavailable. Check VITE_GEMINI_API_KEY");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div>Loading Intelligence...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Intelligence</h1>
        <p className="text-gray-500">Track what customers are looking for.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Searches Today" value={stats.totalToday} icon={Search} color="blue" />
        <StatCard title="Unique Keywords (7d)" value={stats.uniqueLast7} icon={Hash} color="green" />
        <StatCard title="Zero Results (7d)" value={stats.zeroResultsLast7} icon={AlertTriangle} color="amber" />
        <StatCard title="Most Searched Today" value={stats.topToday} icon={TrendingUp} color="purple" />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 leading-none">What Customers Are Searching</h3>
          <Calendar className="text-gray-400" size={18} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-50 uppercase text-[10px] font-bold text-gray-400 tracking-widest">
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Keyword</th>
                <th className="px-6 py-4 text-center">Search Count</th>
                <th className="px-6 py-4 text-center">Avg Results</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {keywordTable.map((row) => (
                <tr key={row.keyword} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-400">{row.rank}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{row.keyword}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{row.search_count}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{row.avg_results}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.avg_results === 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                      {row.avg_results === 0 ? 'No results' : 'Popular'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="font-bold mb-4 flex items-center gap-2 text-green-600">
            <TrendingUp size={18} /> Trending Searches
          </h4>
          <div className="flex flex-wrap gap-2">
            {trendingSearches.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No trending searches yet</p>
            ) : (
              trendingSearches.map(item => (
                <span key={item.keyword} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100 uppercase tracking-tighter">
                  {item.keyword} <span className="text-green-300 ml-1">×{item.count}</span>
                </span>
              ))
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="font-bold mb-1 flex items-center gap-2 text-red-600">
            <AlertTriangle size={18} /> Gap Opportunities
          </h4>
          <p className="text-xs text-gray-500 mb-4 font-medium italic">Customers searched — found nothing</p>
          <div className="flex flex-wrap gap-2">
            {gapOpportunities.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No gap opportunities found</p>
            ) : (
              gapOpportunities.map(item => (
                <span key={item.keyword} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-100 uppercase tracking-tighter">
                  {item.keyword} <span className="text-red-300 ml-1">×{item.count}</span>
                </span>
              ))
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-wider">Note: Consider adding these products to your store</p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <button
          onClick={generateAIStrategy}
          disabled={aiLoading}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          Generate Business Strategy
        </button>

        {aiStrategy && (
          <div className="mt-8 max-w-3xl w-full bg-white shadow-sm" style={{
            borderLeft: '4px solid #0d9488',
            background: '#f0fdfa',
            padding: '20px 24px',
            borderRadius: '0 12px 12px 0',
            marginBottom: '24px',
            width: '100%',
            boxSizing: 'border-box',
            whiteSpace: 'normal',
            overflow: 'visible',
            minHeight: 'auto'
          }}>
            <div className="flex items-center gap-2 mb-6 text-teal-700 font-bold">
              <Sparkles size={18} />
              AI Market Strategy
            </div>
            <div className="text-gray-700 whitespace-pre-line leading-relaxed pb-6 border-b border-gray-50">
              {aiStrategy && (() => {
                // Try to split by numbered points first
                const lines = aiStrategy.split('\n').filter(l => l.trim().length > 0)
                const numbered = lines.filter(l => /^\d+[\.\)]/.test(l.trim()))

                // If we got numbered lines use them, otherwise split by sentence
                const points = numbered.length >= 2 ? numbered :
                  aiStrategy.split(/(?<=\.)\s+(?=[A-Z]|[0-9])/)
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
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {point.trim()}
                  </div>
                ))
              })()}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Generated at {new Date().toLocaleTimeString()}</p>
              <button
                onClick={generateAIStrategy}
                className="text-xs text-teal-600 font-bold hover:underline"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchIntelligence;
