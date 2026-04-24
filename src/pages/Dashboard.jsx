import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import PerformanceChart from '../components/PerformanceChart';
import { Package, Activity, Search, TrendingUp, Loader2, Clock, Calendar } from 'lucide-react';

const Dashboard = () => {
  const { shopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    eventsThisWeek: 0,
    searchesThisWeek: 0,
  });
  const [topProduct, setTopProduct] = useState('...');
  const [chartData, setChartData] = useState([]);
  const [dailyTrends, setDailyTrends] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!shopId) return;
    console.log('shopId in Dashboard:', shopId);
    fetchTopProduct(shopId);
    fetchData();
  }, [shopId]);

  async function fetchTopProduct(sid) {
    const { data } = await supabase
      .from('events')
      .select('product_id')
      .eq('shop_id', sid)
      .not('product_id', 'is', null)
    if (!data?.length) { setTopProduct('No data'); return }
    const counts = {}
    data.forEach(e => { counts[e.product_id] = (counts[e.product_id]||0)+1 })
    const topId = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0]
    const { data: p } = await supabase.from('products').select('name').eq('id',topId).single()
    setTopProduct(p?.name || 'Unknown')
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      // Total Products
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId);

      // Total Engagement (events last 7 days)
      const { count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Search Queries (search_events last 7 days)
      const { count: searchCount } = await supabase
        .from('search_events')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      console.log('Product count:', productCount);
      console.log('Event count:', eventCount);

      // Performance Trend
      const { data: trendData } = await supabase
        .from('events')
        .select('created_at, event_type')
        .eq('shop_id', shopId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      const grouped = {};
      trendData?.forEach(event => {
        const day = new Date(event.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        grouped[day] = (grouped[day] || 0) + 1;
      });
      const chartDataLog = Object.entries(grouped).map(([day, count]) => ({ date: day, count }));

      const { data: ev } = await supabase
        .from('events')
        .select('id, event_type, created_at, product_id')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(8)

      const ids = [...new Set((ev||[]).map(e=>e.product_id).filter(Boolean))]
      let nm = {}
      if (ids.length) {
        const { data: pr } = await supabase.from('products').select('id,name').in('id',ids)
        pr?.forEach(p=>{ nm[p.id]=p.name })
      }
      setRecentActivity((ev||[]).map(e=>({...e, productName: nm[e.product_id]||'Product'})))
      setDailyTrends(chartDataLog);
      
      setStats({
        totalProducts: productCount || 0,
        eventsThisWeek: eventCount || 0,
        searchesThisWeek: searchCount || 0,
      });
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl border border-gray-100"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 h-80 bg-gray-200 rounded-2xl"></div>
           <div className="h-80 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Store Overview</h1>
        <p className="text-gray-500">Real-time performance metrics for your shop.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Products" value={stats.totalProducts} icon={Package} color="blue" />
        <StatCard title="Total Engagement" value={stats.eventsThisWeek} icon={Activity} color="green" />
        <StatCard title="Search Queries" value={stats.searchesThisWeek} icon={Search} color="purple" />
        <StatCard title="Top Performing" value={topProduct} icon={TrendingUp} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="text-blue-600" size={18} /> Performance Trend
            </h3>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest bg-gray-50 px-3 py-1 rounded-full">Last 7 Days</span>
          </div>
          <PerformanceChart data={dailyTrends} />
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Clock className="text-indigo-600" size={18} /> Recent Activity
          </h3>
          <div className="space-y-6 flex-1">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Clock className="mb-2 opacity-50" size={24} />
                <p>No recent activity yet</p>
              </div>
            ) : (
              recentActivity.map(event => (
                <div key={event.id || event.created_at} className="flex gap-4 items-start relative pb-6 border-l-2 border-slate-50 pl-4 last:pb-0 last:border-0 ml-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-200"></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 leading-none mb-1">
                      {event.event_type.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 font-medium truncate max-w-[180px]">
                      {event.productName}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase shrink-0">
                    {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
