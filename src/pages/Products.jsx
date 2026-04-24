import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Package, Trash2, IndianRupee, Loader2 } from 'lucide-react';

const Products = () => {
  const { shopId } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', category: '', price: '', stock: '' });
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (shopId) fetchProducts();
  }, [shopId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      const { data: eventData } = await supabase
        .from('events')
        .select('product_id, event_type')
        .eq('shop_id', shopId);

      const productsWithStats = (prods || []).map(p => {
        const pEvents = (eventData || []).filter(e => e.product_id === p.id);
        const views = pEvents.filter(e => e.event_type === 'view').length;
        const purchases = pEvents.filter(e => e.event_type === 'purchase').length;
        const conversion = views > 0 ? ((purchases / views) * 100).toFixed(1) : 0;
        return { ...p, views, purchases, conversion };
      });

      setProducts(productsWithStats);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAdding(true);
    const { error } = await supabase.from('products').insert([
      { ...form, price: parseFloat(form.price), stock: parseInt(form.stock), shop_id: shopId }
    ]);

    if (!error) {
      setForm({ name: '', category: '', price: '', stock: '' });
      setToast('Product added successfully!');
      setTimeout(() => setToast(null), 3000);
      fetchProducts();
    }
    setAdding(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Products Management</h1>
          <p className="text-gray-500">Add or manage your store inventory.</p>
        </div>
      </div>

      {toast && (
        <div className="fixed top-8 right-8 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-right-4 duration-300 font-bold flex items-center gap-2">
          <Plus size={18} /> {toast}
        </div>
      )}

      {/* Add Form */}
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Plus size={18} className="text-blue-600" /> Add New Product
        </h3>
        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Product Name</label>
            <input
              required
              className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Cleansing Oil"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
            <select
              required
              className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value})}
            >
              <option value="">Select Category</option>
              <option value="Serums">Serums</option>
              <option value="Moisturizers">Moisturizers</option>
              <option value="Cleansers">Cleansers</option>
              <option value="Oils">Oils</option>
              <option value="Masks">Masks</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Price (₹)</label>
            <input
              required
              type="number"
              className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="999"
              value={form.price}
              onChange={e => setForm({...form, price: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Stock</label>
            <input
              required
              type="number"
              className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="50"
              value={form.stock}
              onChange={e => setForm({...form, stock: e.target.value})}
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
             <button
              disabled={adding}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl flex items-center gap-2 transition-all"
            >
              {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Create Product
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-50 uppercase text-[10px] font-bold text-gray-400 tracking-widest">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Status / Category</th>
                <th className="px-6 py-4 text-center">Engagement (V/P)</th>
                <th className="px-6 py-4 text-center">Cvr Rate</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr><td colSpan="6" className="p-20 text-center text-gray-400 font-medium italic">Fetching products...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="6" className="p-20 text-center text-gray-400 font-medium italic animate-pulse">No products found. Use the form above to add your first product.</td></tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                          <Package size={18} />
                        </div>
                        <div>
                           <p className="font-bold text-gray-900 leading-none mb-1">{p.name}</p>
                           <p className="text-xs text-gray-400 flex items-center gap-1 font-medium italic">
                            <IndianRupee size={10} strokeWidth={3} /> {p.price}
                           </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1.5">
                         <span className="w-fit px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded-full tracking-wider border border-gray-200">
                          {p.category}
                        </span>
                        {p.stock <= 5 && <span className="w-fit px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-full animate-pulse border border-red-100">Low Stock</span>}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{p.views || 0} / {p.purchases || 0}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Views / Sales</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className={`text-sm font-bold ${p.conversion > 10 ? 'text-emerald-600' : p.conversion > 2 ? 'text-amber-600' : 'text-slate-400'}`}>
                         {p.conversion}%
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-xs ${p.stock <= 5 ? 'text-red-500 font-bold' : 'text-gray-600'}`}>{p.stock}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Products;
