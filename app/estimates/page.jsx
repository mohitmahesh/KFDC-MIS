'use client';
import { useState, useEffect } from 'react';
import { TreePine, User, LogOut, CheckCircle, XCircle, AlertTriangle, Send, Clock } from 'lucide-react';

// ===================== API HELPER =====================
const api = {
    token: null,
    user: null,
    setToken(t) { this.token = t; if (t) localStorage.setItem('kfdc_token', t); else localStorage.removeItem('kfdc_token') },
    setUser(u) { this.user = u; if (u) localStorage.setItem('kfdc_user', JSON.stringify(u)); else localStorage.removeItem('kfdc_user') },
    getToken() { if (!this.token) this.token = localStorage.getItem('kfdc_token'); return this.token },
    getUser() { if (!this.user) { const u = localStorage.getItem('kfdc_user'); if (u) this.user = JSON.parse(u); } return this.user },
    async fetch(url, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...options.headers }
        const token = this.getToken()
        // In real app, we verify token. Here we rely on stored token.
        // For the estimates workflow, we simply pass the role in the body because 
        // the backend doesn't have full AuthGuard setup for this specific task flow yet.
        // But for consistency, we try to behave like an authenticated app.
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`http://localhost:3000${url}`, { ...options, headers })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || data.message || 'Request failed')
        return data
    },
    get(url) { return this.fetch(url) },
    post(url, body) { return this.fetch(url, { method: 'POST', body: JSON.stringify(body) }) },
    patch(url, body) { return this.fetch(url, { method: 'PATCH', body: JSON.stringify(body) }) },
}

// ===================== LOGIN COMPONENT =====================
function LoginPage({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await api.post('/auth/login', { email, password });
            api.setToken(data.token);
            api.setUser(data.user);
            onLogin(data.user);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const demoAccounts = [
        { email: 'ecw.dharwad@kfdc.in', role: 'CASE_WORKER_ESTIMATES', label: 'Estimates Case Worker' },
        { email: 'ps.dharwad@kfdc.in', role: 'PLANTATION_SUPERVISOR', label: 'Plantation Supervisor' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <TreePine className="w-6 h-6 text-emerald-700" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-center mb-2">Estimates Dashboard</h1>
                <p className="text-center text-gray-500 mb-6">Sign in to manage estimates</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="name@kfdc.in" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Enter password" />
                    </div>
                    {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
                    <button type="submit" disabled={loading}
                        className="w-full bg-emerald-700 text-white py-2 rounded hover:bg-emerald-800 disabled:opacity-50">
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 border-t pt-4">
                    <p className="text-xs text-gray-500 mb-3 uppercase font-semibold text-center">Demo Accounts (Pass: pass123)</p>
                    <div className="space-y-2">
                        {demoAccounts.map(acc => (
                            <button key={acc.email} onClick={() => { setEmail(acc.email); setPassword('pass123') }}
                                className="w-full text-left p-2 hover:bg-gray-50 rounded border flex items-center justify-between group transition-colors">
                                <div>
                                    <div className="text-sm font-medium text-gray-900 group-hover:text-emerald-700">{acc.label}</div>
                                    <div className="text-xs text-gray-500">{acc.email}</div>
                                </div>
                                <User className="w-4 h-4 text-gray-300 group-hover:text-emerald-600" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ===================== MAIN DASHBOARD =====================
export default function EstimatesPage() {
    const [user, setUser] = useState(null);
    const [plantationId, setPlantationId] = useState('');
    const [items, setItems] = useState([]);
    const [totalSanctioned, setTotalSanctioned] = useState(0);
    const [totalRevised, setTotalRevised] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const u = api.getUser();
        if (u) setUser(u);
    }, []);

    const fetchItems = async () => {
        if (!plantationId) return;
        setLoading(true);
        setError('');
        try {
            const data = await api.get(`/apo/estimates?plantation_id=${plantationId}`);
            setItems(data);
            calculateTotals(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = (currentItems) => {
        let revisedSum = 0;
        let sanctionedSum = 0;
        currentItems.forEach(item => {
            const qty = item.revised_qty !== null ? item.revised_qty : item.sanctioned_qty;
            revisedSum += qty * item.sanctioned_rate;
            sanctionedSum += item.sanctioned_qty * item.sanctioned_rate;
        });
        setTotalRevised(revisedSum);
        setTotalSanctioned(sanctionedSum);
    };

    // Auto-load if plantation ID is preset or user has range (mock behavior)
    useEffect(() => {
        if (user && !plantationId) {
            // In a real app we'd fetch user's plantation list. 
            // For demo, we default to dharwad plantation if user is from dharwad
            if (user.division_id === 'div-dharwad') setPlantationId('plt-d01');
        }
    }, [user]);

    useEffect(() => {
        if (plantationId) fetchItems();
    }, [plantationId]);

    const handleUpdateQty = async (id, newQty) => {
        try {
            // Pass user_role in body as simple RBAC enforcement for this demo
            await api.patch(`/apo/items/${id}/estimate`, {
                revised_qty: parseFloat(newQty),
                user_role: user.role
            });
            fetchItems(); // Refresh to ensure sync
        } catch (err) {
            alert(err.message);
            fetchItems(); // Revert UI on error
        }
    };

    const handleStatusChange = async (id, status) => {
        // Confirmation
        if (!confirm(`Are you sure you want to change status to ${status}?`)) return;

        try {
            await api.patch(`/apo/items/${id}/status`, {
                status,
                user_role: user.role
            });
            fetchItems();
        } catch (err) {
            alert(err.message);
        }
    }

    const handleLogout = () => {
        api.setToken(null);
        api.setUser(null);
        setUser(null);
        setItems([]);
        setPlantationId('');
    };

    if (!user) return <LoginPage onLogin={setUser} />;

    const isECW = user.role === 'CASE_WORKER_ESTIMATES';
    const isPS = user.role === 'PLANTATION_SUPERVISOR';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center">
                            <TreePine className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-bold text-gray-900">KFDC Estimates</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.role.replace(/_/g, ' ')}</div>
                        </div>
                        <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="Sign Out">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Controls */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Plantation ID</label>
                        <input
                            type="text"
                            value={plantationId}
                            onChange={(e) => setPlantationId(e.target.value)}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border"
                            placeholder="Enter ID (e.g., plt-d01)"
                        />
                    </div>
                    <button onClick={fetchItems} className="bg-emerald-700 text-white px-4 py-2 rounded shadow-sm hover:bg-emerald-800 font-medium">
                        Reload
                    </button>
                    <div className="pl-4 border-l flex gap-6">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Budget Limit</div>
                            <div className="text-lg font-bold text-gray-900">₹{totalSanctioned.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Revised Total</div>
                            <div className={`text-lg font-bold ${totalRevised > totalSanctioned ? 'text-red-600' : 'text-emerald-600'}`}>
                                ₹{totalRevised.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">{error}</div>}

                {/* Table */}
                <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Sanctioned</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Revised Qty</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Cost (₹)</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading works...</td></tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <AlertTriangle className="w-10 h-10 mb-3 text-amber-500" />
                                            <h3 className="text-lg font-medium text-gray-900">No Sanctioned Works Found</h3>
                                            <div className="max-w-md mx-auto mt-2 text-sm text-gray-600 space-y-1">
                                                <p>No works available for this plantation. This could mean:</p>
                                                <ul className="list-disc text-left pl-8 inline-block">
                                                    <li>The Plantation ID is incorrect.</li>
                                                    <li>The APO has not yet been <strong>SANCTIONED</strong> (MD Approved).</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map(item => {
                                    const currentQty = item.revised_qty !== null ? item.revised_qty : item.sanctioned_qty;
                                    const cost = currentQty * item.sanctioned_rate;
                                    const isEditable = isECW && ['DRAFT', 'REJECTED'].includes(item.estimate_status);

                                    // Status Badge Logic
                                    let statusColor = 'bg-gray-100 text-gray-800';
                                    let StatusIcon = Clock;
                                    if (item.estimate_status === 'SUBMITTED') { statusColor = 'bg-amber-100 text-amber-800'; StatusIcon = AlertTriangle; }
                                    if (item.estimate_status === 'APPROVED') { statusColor = 'bg-emerald-100 text-emerald-800'; StatusIcon = CheckCircle; }
                                    if (item.estimate_status === 'REJECTED') { statusColor = 'bg-red-100 text-red-800'; StatusIcon = XCircle; }

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {item.activity_name}
                                                <div className="text-xs text-gray-500 font-normal">{item.unit} @ ₹{item.sanctioned_rate}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor} gap-1`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {item.estimate_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                {item.sanctioned_qty}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {isEditable ? (
                                                    <input
                                                        type="number"
                                                        defaultValue={currentQty}
                                                        className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-24 sm:text-sm border-gray-300 rounded-md text-right p-1 border"
                                                        onBlur={(e) => handleUpdateQty(item.id, e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="text-sm text-gray-900 font-medium">{currentQty}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex justify-center gap-2">
                                                    {isECW && ['DRAFT', 'REJECTED'].includes(item.estimate_status) && (
                                                        <button
                                                            onClick={() => handleStatusChange(item.id, 'SUBMITTED')}
                                                            className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-xs flex items-center gap-1">
                                                            <Send className="w-3 h-3" /> Submit
                                                        </button>
                                                    )}

                                                    {isPS && item.estimate_status === 'SUBMITTED' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusChange(item.id, 'APPROVED')}
                                                                className="text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-md text-xs flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusChange(item.id, 'REJECTED')}
                                                                className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-xs flex items-center gap-1">
                                                                <XCircle className="w-3 h-3" /> Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    {((isECW && item.estimate_status === 'SUBMITTED') || (item.estimate_status === 'APPROVED')) && (
                                                        <span className="text-gray-400 italic text-xs">Locked</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
