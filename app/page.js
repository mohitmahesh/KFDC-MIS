'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  TreePine, LogIn, LogOut, LayoutDashboard, FileText, Plus, Eye, CheckCircle, XCircle, Clock,
  AlertTriangle, Leaf, MapPin, Calendar, TrendingUp, ClipboardList, Send, ArrowLeft, RefreshCw,
  ChevronRight, User, Building2, BookOpen, Hammer, Trash2, Package
} from 'lucide-react'

// ===================== API HELPER =====================
const api = {
  token: null,
  setToken(t) { this.token = t; if (t) localStorage.setItem('kfdc_token', t); else localStorage.removeItem('kfdc_token') },
  getToken() { if (!this.token) this.token = localStorage.getItem('kfdc_token'); return this.token },
  async fetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers }
    const token = this.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`/api${url}`, { ...options, headers })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  },
  get(url) { return this.fetch(url) },
  post(url, body) { return this.fetch(url, { method: 'POST', body: JSON.stringify(body) }) },
  patch(url, body) { return this.fetch(url, { method: 'PATCH', body: JSON.stringify(body) }) },
  put(url, body) { return this.fetch(url, { method: 'PUT', body: JSON.stringify(body) }) },
  del(url) { return this.fetch(url, { method: 'DELETE' }) },
}

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-300',
  SANCTIONED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  REJECTED: 'bg-red-50 text-red-700 border-red-300',
}
const STATUS_LABELS = { DRAFT: 'Draft', PENDING_APPROVAL: 'Pending Approval', SANCTIONED: 'Sanctioned', REJECTED: 'Rejected' }
const STATUS_ICONS = { DRAFT: <Clock className="w-3.5 h-3.5" />, PENDING_APPROVAL: <AlertTriangle className="w-3.5 h-3.5" />, SANCTIONED: <CheckCircle className="w-3.5 h-3.5" />, REJECTED: <XCircle className="w-3.5 h-3.5" /> }
const formatCurrency = (n) => { if (n == null) return '₹0'; return '₹' + Math.round(Number(n)).toLocaleString('en-IN') }

// ===================== LOGIN =====================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const handleSeed = async () => {
    setSeeding(true)
    try { await api.post('/seed'); alert('Demo data seeded!') } catch (e) { setError(e.message) }
    setSeeding(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try { const data = await api.post('/auth/login', { email, password }); api.setToken(data.token); onLogin(data.user) } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const demoAccounts = [
    { email: 'ro.dharwad@kfdc.in', role: 'Range Officer', division: 'Dharwad' },
    { email: 'ro.svpura@kfdc.in', role: 'Range Officer', division: 'Bangalore' },
    { email: 'dm.dharwad@kfdc.in', role: 'Division Manager', division: 'Dharwad' },
    { email: 'admin@kfdc.in', role: 'Admin (HO)', division: 'All' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        <div className="text-white space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20"><TreePine className="w-8 h-8 text-emerald-300" /></div>
            <div><h1 className="text-2xl font-bold">KFDC iFMS</h1><p className="text-emerald-300 text-sm">Integrated Forestry Management</p></div>
          </div>
          <h2 className="text-4xl font-bold leading-tight">Stump to Sale<br /><span className="text-emerald-300">Digital Platform</span></h2>
          <p className="text-emerald-100/80 text-lg leading-relaxed">Norms-driven platform with Activity → Works → APO hierarchy. Build APOs progressively over days.</p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10"><div className="text-2xl font-bold text-emerald-300">18+</div><div className="text-xs text-emerald-200/70">Plantations</div></div>
            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10"><div className="text-2xl font-bold text-emerald-300">19</div><div className="text-xs text-emerald-200/70">Ranges</div></div>
            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10"><div className="text-2xl font-bold text-emerald-300">4</div><div className="text-xs text-emerald-200/70">Divisions</div></div>
          </div>
        </div>
        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-4"><CardTitle className="text-2xl">Sign In</CardTitle><CardDescription>Enter your KFDC credentials</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="your.name@kfdc.in" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
              <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}<LogIn className="w-4 h-4 ml-2" /></Button>
            </form>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground mb-3">Demo Accounts (password: pass123)</p>
            <div className="space-y-2">
              {demoAccounts.map(acc => (
                <button key={acc.email} onClick={() => { setEmail(acc.email); setPassword('pass123') }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border hover:bg-accent transition-colors text-left">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-emerald-700" /><div><div className="text-sm font-medium">{acc.role}</div><div className="text-xs text-muted-foreground">{acc.email}</div></div></div>
                  <Badge variant="outline" className="text-xs">{acc.division}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
          <CardFooter><Button variant="outline" className="w-full" onClick={handleSeed} disabled={seeding}><RefreshCw className={`w-4 h-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />{seeding ? 'Seeding...' : 'Initialize Demo Data'}</Button></CardFooter>
        </Card>
      </div>
    </div>
  )
}

// ===================== SIDEBAR =====================
function Sidebar({ user, currentView, setView, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['RO', 'DM', 'ADMIN'] },
    { id: 'plantations', label: 'Plantations', icon: TreePine, roles: ['RO', 'DM', 'ADMIN'] },
    { id: 'apo-list', label: 'APO Management', icon: FileText, roles: ['RO', 'DM', 'ADMIN'] },
    { id: 'norms', label: 'Standard Rate Card', icon: BookOpen, roles: ['RO', 'DM', 'ADMIN'] },
  ]
  const roleLabels = { RO: 'Range Officer', DM: 'Division Manager', ADMIN: 'Admin (HO)' }
  const roleColors = { RO: 'bg-blue-100 text-blue-800', DM: 'bg-purple-100 text-purple-800', ADMIN: 'bg-amber-100 text-amber-800' }

  return (
    <div className="w-64 bg-white border-r h-screen flex flex-col shadow-sm">
      <div className="p-4 border-b"><div className="flex items-center gap-2.5"><div className="w-10 h-10 bg-emerald-700 rounded-lg flex items-center justify-center"><TreePine className="w-5 h-5 text-white" /></div><div><h1 className="font-bold text-sm">KFDC iFMS</h1><p className="text-[10px] text-muted-foreground">The Green ERP v2</p></div></div></div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.filter(n => n.roles.includes(user.role)).map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${currentView === item.id ? 'bg-emerald-50 text-emerald-800 font-medium shadow-sm border border-emerald-200' : 'text-muted-foreground hover:bg-accent'}`}>
            <item.icon className="w-4 h-4" />{item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-emerald-700" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user.name}</p><Badge className={`text-[10px] ${roleColors[user.role]}`}>{roleLabels[user.role]}</Badge></div></div>
        <Button variant="outline" size="sm" className="w-full" onClick={onLogout}><LogOut className="w-3.5 h-3.5 mr-2" />Sign Out</Button>
      </div>
    </div>
  )
}

// ===================== DASHBOARD =====================
function Dashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get('/dashboard/stats').then(setStats).catch(console.error).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div>
  if (!stats) return <p className="text-muted-foreground p-4">Failed to load dashboard</p>

  const statCards = [
    { label: 'Total Plantations', value: stats.total_plantations, icon: TreePine, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Area (Ha)', value: stats.total_area_ha?.toFixed(1), icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active APOs', value: stats.sanctioned_apos, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Budget Utilized', value: `${stats.utilization_pct}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  const pieData = [
    { name: 'Sanctioned', value: stats.sanctioned_apos, color: '#166534' },
    { name: 'Pending', value: stats.pending_apos, color: '#ca8a04' },
    { name: 'Draft', value: stats.draft_apos, color: '#6b7280' },
    { name: 'Rejected', value: stats.rejected_apos, color: '#dc2626' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Dashboard</h2><p className="text-muted-foreground">Welcome back, {user.name} | FY 2026-27</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (<Card key={s.label}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground mb-1">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div><div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div></div></CardContent></Card>))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-lg">Budget: Sanctioned vs Utilized</CardTitle></CardHeader><CardContent>
          {stats.budget_chart?.length > 0 ? (<ResponsiveContainer width="100%" height={300}><BarChart data={stats.budget_chart}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => formatCurrency(v)} /><Legend /><Bar dataKey="sanctioned" name="Sanctioned" fill="#166534" radius={[4,4,0,0]} /><Bar dataKey="spent" name="Utilized" fill="#ca8a04" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>) : (<div className="h-[300px] flex items-center justify-center text-muted-foreground">No budget data yet</div>)}
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-lg">APO Status</CardTitle></CardHeader><CardContent>
          {pieData.length > 0 ? (<ResponsiveContainer width="100%" height={200}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">No APOs</div>}
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Sanctioned</span><span className="font-semibold">{formatCurrency(stats.total_sanctioned_amount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Utilized</span><span className="font-semibold">{formatCurrency(stats.total_expenditure)}</span></div>
            <Progress value={stats.utilization_pct} className="h-2 mt-2" />
          </div>
        </CardContent></Card>
      </div>
      {user.role === 'RO' && stats.draft_apos > 0 && (
        <Card className="border-amber-200 bg-amber-50/30"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-amber-600" /><span className="text-sm">{stats.draft_apos} Draft APO(s) — continue adding works or submit for approval</span></CardContent></Card>
      )}
      {user.role === 'DM' && stats.pending_apos > 0 && (
        <Card className="border-purple-200 bg-purple-50/30"><CardContent className="p-4 flex items-center gap-3"><ClipboardList className="w-5 h-5 text-purple-600" /><span className="text-sm">{stats.pending_apos} APO(s) waiting for your review</span></CardContent></Card>
      )}
    </div>
  )
}

// ===================== PLANTATIONS =====================
function PlantationsView({ user, setView, setSelectedPlantation }) {
  const [plantations, setPlantations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [divisions, setDivisions] = useState([])
  const [speciesList, setSpeciesList] = useState([])
  const [form, setForm] = useState({ name: '', species: '', year_of_planting: 2025, total_area_ha: '', village: '', taluk: '', district: '', vidhana_sabha: '', lok_sabha: '', latitude: '', longitude: '' })

  const load = useCallback(() => { setLoading(true); api.get('/plantations').then(setPlantations).catch(console.error).finally(() => setLoading(false)) }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/divisions').then(setDivisions).catch(console.error)
    api.get('/species').then(setSpeciesList).catch(console.error)
  }, [])

  // Find user's division for constituency dropdowns
  const userDivision = divisions.find(d => d.id === user.division_id)

  const handleCreate = async () => {
    try { await api.post('/plantations', form); setShowCreate(false); setForm({ name: '', species: '', year_of_planting: 2025, total_area_ha: '', village: '', taluk: '', district: '', vidhana_sabha: '', lok_sabha: '', latitude: '', longitude: '' }); load() } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Plantations</h2><p className="text-muted-foreground">Manage plantation assets</p></div>
        {user.role === 'RO' && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button className="bg-emerald-700 hover:bg-emerald-800"><Plus className="w-4 h-4 mr-2" />Add Plantation</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create New Plantation</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Plantation Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Varavanagalavi" /></div>
                  <div><Label>Species *</Label>
                    <Select value={form.species} onValueChange={v => setForm(f => ({ ...f, species: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select species" /></SelectTrigger>
                      <SelectContent>{speciesList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Year of Planting</Label><Input type="number" value={form.year_of_planting} onChange={e => setForm(f => ({ ...f, year_of_planting: e.target.value }))} /></div>
                  <div><Label>Area (Ha)</Label><Input type="number" step="0.1" value={form.total_area_ha} onChange={e => setForm(f => ({ ...f, total_area_ha: e.target.value }))} /></div>
                  <div><Label>Village</Label><Input value={form.village} onChange={e => setForm(f => ({ ...f, village: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Taluk</Label><Input value={form.taluk} onChange={e => setForm(f => ({ ...f, taluk: e.target.value }))} /></div>
                  <div><Label>District</Label><Input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} /></div>
                </div>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Political & Geographical Data</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Vidhana Sabha Constituency</Label>
                    <Select value={form.vidhana_sabha} onValueChange={v => setForm(f => ({ ...f, vidhana_sabha: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select constituency" /></SelectTrigger>
                      <SelectContent>{(userDivision?.vidhana_sabha_list || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Lok Sabha Constituency</Label>
                    <Select value={form.lok_sabha} onValueChange={v => setForm(f => ({ ...f, lok_sabha: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select constituency" /></SelectTrigger>
                      <SelectContent>{(userDivision?.lok_sabha_list || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Latitude</Label><Input type="number" step="0.0001" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="e.g., 15.4589" /></div>
                  <div><Label>Longitude</Label><Input type="number" step="0.0001" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="e.g., 75.0078" /></div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleCreate}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {loading ? <div className="flex items-center justify-center h-40"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantations.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { setSelectedPlantation(p); setView('plantation-detail') }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3"><div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><Leaf className="w-5 h-5 text-emerald-700" /></div><Badge variant="outline" className="text-xs">{p.species}</Badge></div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-emerald-700">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-1">{p.range_name} | {p.division_name}</p>
                {p.village && <p className="text-xs text-muted-foreground mb-3">{p.village}{p.taluk ? `, ${p.taluk}` : ''}{p.district ? ` (${p.district})` : ''}</p>}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-muted rounded"><p className="text-xs text-muted-foreground">Age</p><p className="font-semibold text-sm">{p.age} yr</p></div>
                  <div className="text-center p-2 bg-muted rounded"><p className="text-xs text-muted-foreground">Area</p><p className="font-semibold text-sm">{p.total_area_ha} Ha</p></div>
                  <div className="text-center p-2 bg-muted rounded"><p className="text-xs text-muted-foreground">Planted</p><p className="font-semibold text-sm">{p.year_of_planting}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ===================== PLANTATION DETAIL =====================
function PlantationDetail({ plantation, setView }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get(`/plantations/${plantation.id}/history`).then(setHistory).catch(console.error).finally(() => setLoading(false)) }, [plantation.id])

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => setView('plantations')}><ArrowLeft className="w-4 h-4" />Back</Button>
      <Card><CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center"><TreePine className="w-8 h-8 text-emerald-700" /></div>
          <div className="flex-1"><h2 className="text-xl font-bold">{plantation.name}</h2><div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{plantation.range_name}</span><span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{plantation.division_name}</span></div>
            {plantation.village && <p className="text-sm text-muted-foreground mt-1">{plantation.village}, {plantation.taluk}, {plantation.district}</p>}
          </div>
          <Badge className="bg-emerald-100 text-emerald-800">{plantation.species}</Badge>
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Age</p><p className="text-lg font-bold">{plantation.age} yr</p></div>
          <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Area</p><p className="text-lg font-bold">{plantation.total_area_ha} Ha</p></div>
          <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Planted</p><p className="text-lg font-bold">{plantation.year_of_planting}</p></div>
          {plantation.latitude && <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Lat</p><p className="text-lg font-bold">{plantation.latitude}</p></div>}
          {plantation.longitude && <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Lng</p><p className="text-lg font-bold">{plantation.longitude}</p></div>}
          <div className="text-center p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Works</p><p className="text-lg font-bold">{history.length}</p></div>
        </div>
        {(plantation.vidhana_sabha || plantation.lok_sabha) && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {plantation.vidhana_sabha && <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Vidhana Sabha</p><p className="font-medium text-sm">{plantation.vidhana_sabha}</p></div>}
            {plantation.lok_sabha && <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Lok Sabha</p><p className="font-medium text-sm">{plantation.lok_sabha}</p></div>}
          </div>
        )}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-lg">Works History</CardTitle></CardHeader><CardContent>
        {loading ? <div className="flex items-center justify-center h-20"><RefreshCw className="w-5 h-5 animate-spin" /></div> : history.length === 0 ? <p className="text-muted-foreground text-sm py-6 text-center">No works for this plantation yet</p> : (
          <div className="space-y-3">{history.map(w => (
            <div key={w.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Hammer className="w-4 h-4 text-emerald-600" /><span className="font-medium text-sm">{w.name}</span></div><span className="font-semibold text-sm">{formatCurrency(w.total_estimated_cost)}</span></div>
              <div className="text-xs text-muted-foreground">{w.items?.length || 0} activities | Created: {new Date(w.created_at).toLocaleDateString()}</div>
            </div>
          ))}</div>
        )}
      </CardContent></Card>
    </div>
  )
}

// ===================== APO LIST (NEW: Shows Works-based APOs) =====================
function ApoList({ user, setView, setSelectedApo }) {
  const [apos, setApos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [fy, setFy] = useState('2026-27')

  const load = useCallback(() => {
    setLoading(true)
    const url = filter === 'all' ? '/apo' : `/apo?status=${filter}`
    api.get(url).then(setApos).catch(console.error).finally(() => setLoading(false))
  }, [filter])
  useEffect(() => { load() }, [load])

  const handleCreateApo = async () => {
    try {
      const apo = await api.post('/apo', { financial_year: fy })
      setShowCreate(false)
      setSelectedApo(apo.id)
      setView('apo-detail')
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">APO Management</h2><p className="text-muted-foreground">Annual Plans of Operations — build progressively with Works</p></div>
        {user.role === 'RO' && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button className="bg-emerald-700 hover:bg-emerald-800"><Plus className="w-4 h-4 mr-2" />New APO</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New APO</DialogTitle><DialogDescription>Start a new APO draft. You can add Works to it over time.</DialogDescription></DialogHeader>
              <div><Label>Financial Year</Label>
                <Select value={fy} onValueChange={setFy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2026-27">2026-27</SelectItem><SelectItem value="2025-26">2025-26</SelectItem></SelectContent></Select>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleCreateApo}>Create Draft APO</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="flex gap-2">{['all', 'DRAFT', 'PENDING_APPROVAL', 'SANCTIONED', 'REJECTED'].map(f => (
        <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" className={filter === f ? 'bg-emerald-700 hover:bg-emerald-800' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : STATUS_LABELS[f]}</Button>
      ))}</div>
      {loading ? <div className="flex items-center justify-center h-40"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div> : apos.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No APOs found. {user.role === 'RO' && 'Click "New APO" to start building one.'}</CardContent></Card>
      ) : (
        <div className="space-y-3">{apos.map(apo => (
          <Card key={apo.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedApo(apo.id); setView('apo-detail') }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-emerald-700" /></div>
                  <div>
                    <h4 className="font-semibold text-sm">APO - FY {apo.financial_year}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Hammer className="w-3 h-3" />{apo.works_count} Works</span>
                      <span>by {apo.created_by_name}</span>
                      <span>{new Date(apo.created_at).toLocaleDateString()}</span>
                    </div>
                    {apo.plantation_names?.length > 0 && <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">{apo.plantation_names.join(', ')}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">{formatCurrency(apo.total_amount)}</p>
                  <Badge className={`${STATUS_COLORS[apo.status]} flex items-center gap-1`}>{STATUS_ICONS[apo.status]} {STATUS_LABELS[apo.status]}</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}</div>
      )}
    </div>
  )
}

// ===================== APO DETAIL (NEW: Works-based view with Add Work) =====================
function ApoDetail({ apoId, user, setView }) {
  const [apo, setApo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddWork, setShowAddWork] = useState(false)
  const [showApproval, setShowApproval] = useState(false)
  const [approvalAction, setApprovalAction] = useState('')
  const [showWorkLog, setShowWorkLog] = useState(false)
  const [selectedWorkItem, setSelectedWorkItem] = useState(null)
  const [selectedWorkId, setSelectedWorkId] = useState(null)
  const [workLogForm, setWorkLogForm] = useState({ actual_qty: '', expenditure: '', work_date: '' })

  // Work creation state
  const [plantations, setPlantations] = useState([])
  const [allActivities, setAllActivities] = useState([])
  const [selectedPlt, setSelectedPlt] = useState(null)
  const [suggestions, setSuggestions] = useState(null)
  const [selectedActivities, setSelectedActivities] = useState({})
  const [quantities, setQuantities] = useState({})
  const [rates, setRates] = useState({})
  const [workName, setWorkName] = useState('')
  const [customItems, setCustomItems] = useState([])
  const [showActivityPicker, setShowActivityPicker] = useState(false)

  const load = useCallback(() => { setLoading(true); api.get(`/apo/${apoId}`).then(setApo).catch(console.error).finally(() => setLoading(false)) }, [apoId])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/plantations').then(setPlantations).catch(console.error)
    api.get('/activities').then(setAllActivities).catch(console.error)
  }, [])

  const handleStatusChange = async (status) => {
    try { await api.patch(`/apo/${apoId}/status`, { status }); setShowApproval(false); load() } catch (e) { alert(e.message) }
  }

  const loadSuggestions = async (pltId) => {
    setSelectedPlt(pltId)
    if (!pltId || !apo) return
    try {
      const data = await api.post('/works/suggest-activities', { plantation_id: pltId, financial_year: apo.financial_year })
      setSuggestions(data)
      const sel = {}, qty = {}, rt = {}
      data.suggested_activities?.forEach(a => { sel[a.activity_id] = true; qty[a.activity_id] = a.suggested_qty; rt[a.activity_id] = a.sanctioned_rate })
      setSelectedActivities(sel); setQuantities(qty); setRates(rt); setCustomItems([])
      const plt = plantations.find(p => p.id === pltId)
      setWorkName(`${data.age > 0 ? `Year ${data.age} Maintenance` : 'Advance Works'} - ${plt?.name || data.plantation_name}`)
    } catch (e) { alert(e.message) }
  }

  const addCustomActivity = (actId) => {
    const act = allActivities.find(a => a.id === actId)
    if (!act) return
    // Don't add if already in suggestions or custom list
    if (suggestions?.suggested_activities?.find(a => a.activity_id === actId)) return
    if (customItems.find(c => c.activity_id === actId)) return
    const plt = plantations.find(p => p.id === selectedPlt)
    const newItem = {
      activity_id: act.id, activity_name: act.name, category: act.category, unit: act.unit,
      ssr_no: act.ssr_no || '-', sanctioned_rate: 0, suggested_qty: plt?.total_area_ha || 1,
    }
    setCustomItems(prev => [...prev, newItem])
    setSelectedActivities(prev => ({ ...prev, [act.id]: true }))
    setQuantities(prev => ({ ...prev, [act.id]: plt?.total_area_ha || 1 }))
    setRates(prev => ({ ...prev, [act.id]: 0 }))
    setShowActivityPicker(false)
  }

  const removeCustomActivity = (actId) => {
    setCustomItems(prev => prev.filter(c => c.activity_id !== actId))
    setSelectedActivities(prev => { const n = { ...prev }; delete n[actId]; return n })
    setQuantities(prev => { const n = { ...prev }; delete n[actId]; return n })
    setRates(prev => { const n = { ...prev }; delete n[actId]; return n })
  }

  const handleAddWork = async () => {
    if (!suggestions && customItems.length === 0) return
    // Combine suggested + custom items that are selected
    const allItems = [
      ...(suggestions?.suggested_activities || []).filter(a => selectedActivities[a.activity_id]).map(a => ({
        activity_id: a.activity_id, activity_name: a.activity_name, unit: a.unit, ssr_no: a.ssr_no,
        sanctioned_rate: rates[a.activity_id] ?? a.sanctioned_rate, sanctioned_qty: quantities[a.activity_id] || a.suggested_qty,
      })),
      ...customItems.filter(a => selectedActivities[a.activity_id]).map(a => ({
        activity_id: a.activity_id, activity_name: a.activity_name, unit: a.unit, ssr_no: a.ssr_no,
        sanctioned_rate: rates[a.activity_id] || 0, sanctioned_qty: quantities[a.activity_id] || a.suggested_qty,
      })),
    ]
    if (allItems.length === 0) { alert('Select at least one activity'); return }
    try {
      await api.post('/works', { apo_id: apoId, plantation_id: selectedPlt, name: workName, items })
      setShowAddWork(false); setSuggestions(null); setSelectedPlt(null); setSelectedActivities({}); setQuantities({}); setWorkName('')
      load()
    } catch (e) { alert(e.message) }
  }

  const handleDeleteWork = async (workId) => {
    if (!confirm('Remove this work from the APO?')) return
    try { await api.del(`/works/${workId}`); load() } catch (e) { alert(e.message) }
  }

  const handleWorkLog = async () => {
    try {
      await api.post('/work-logs', { work_item_id: selectedWorkItem.id, work_id: selectedWorkId, actual_qty: parseFloat(workLogForm.actual_qty), expenditure: parseFloat(workLogForm.expenditure), work_date: workLogForm.work_date || undefined })
      setShowWorkLog(false); setWorkLogForm({ actual_qty: '', expenditure: '', work_date: '' }); load()
    } catch (e) { alert(e.message) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div>
  if (!apo) return <p>APO not found</p>

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => setView('apo-list')}><ArrowLeft className="w-4 h-4" />Back to APO List</Button>

      {/* APO Header */}
      <Card><CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">APO — FY {apo.financial_year}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{apo.works?.length || 0} Works</span><span>|</span>
              <span>Created by: {apo.created_by_name}</span>
              {apo.approved_by_name && <><span>|</span><span>Approved by: {apo.approved_by_name}</span></>}
            </div>
          </div>
          <Badge className={`${STATUS_COLORS[apo.status]} text-sm px-3 py-1 flex items-center gap-1`}>{STATUS_ICONS[apo.status]} {STATUS_LABELS[apo.status]}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200"><p className="text-xs text-emerald-600">Total Budget</p><p className="text-xl font-bold text-emerald-800">{formatCurrency(apo.total_amount)}</p></div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200"><p className="text-xs text-amber-600">Total Spent</p><p className="text-xl font-bold text-amber-800">{formatCurrency(apo.total_spent)}</p></div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200"><p className="text-xs text-blue-600">Utilization</p><p className="text-xl font-bold text-blue-800">{apo.utilization_pct}%</p><Progress value={apo.utilization_pct} className="h-2 mt-2" /></div>
        </div>
        <div className="flex gap-2 mt-4">
          {user.role === 'RO' && apo.status === 'DRAFT' && (
            <><Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => setShowAddWork(true)}><Plus className="w-4 h-4 mr-2" />Add Work</Button>
            <Button variant="outline" onClick={() => handleStatusChange('PENDING_APPROVAL')} disabled={(apo.works?.length || 0) === 0}><Send className="w-4 h-4 mr-2" />Submit for Approval</Button></>
          )}
          {['DM', 'ADMIN'].includes(user.role) && apo.status === 'PENDING_APPROVAL' && (
            <><Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => { setApprovalAction('SANCTIONED'); setShowApproval(true) }}><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>
            <Button variant="destructive" onClick={() => { setApprovalAction('REJECTED'); setShowApproval(true) }}><XCircle className="w-4 h-4 mr-2" />Reject</Button></>
          )}
        </div>
      </CardContent></Card>

      {/* Works List */}
      {apo.works?.map(work => (
        <Card key={work.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Hammer className="w-4 h-4 text-emerald-600" />{work.name}</CardTitle>
                <CardDescription>{work.plantation_name} | {work.species} | {work.plantation_age} yr | {work.total_area_ha} Ha</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">{formatCurrency(work.total_estimated_cost)}</span>
                {apo.status === 'DRAFT' && user.role === 'RO' && (
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteWork(work.id)}><Trash2 className="w-4 h-4" /></Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead>Activity</TableHead><TableHead>SSR</TableHead><TableHead>Unit</TableHead>
                <TableHead className="text-right">Rate (₹)</TableHead><TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Budget (₹)</TableHead><TableHead className="text-right">Spent (₹)</TableHead>
                <TableHead className="text-center">Usage</TableHead>
                {user.role === 'RO' && apo.status === 'SANCTIONED' && <TableHead className="text-center">Log</TableHead>}
              </TableRow></TableHeader>
              <TableBody>{work.items?.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm">{item.activity_name}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{item.ssr_no}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.unit}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{item.sanctioned_rate?.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right">{item.sanctioned_qty}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.total_cost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.total_spent)}</TableCell>
                  <TableCell className="text-center"><div className="flex items-center gap-2"><Progress value={item.utilization_pct} className="h-2 w-16" /><span className="text-xs">{item.utilization_pct}%</span></div></TableCell>
                  {user.role === 'RO' && apo.status === 'SANCTIONED' && (
                    <TableCell className="text-center"><Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedWorkItem(item); setSelectedWorkId(work.id); setShowWorkLog(true) }}><Plus className="w-3 h-3" /></Button></TableCell>
                  )}
                </TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {(!apo.works || apo.works.length === 0) && apo.status === 'DRAFT' && (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Works Added Yet</h3>
          <p className="text-muted-foreground mb-4">Start building this APO by adding works. Each work targets a plantation with specific activities.</p>
          {user.role === 'RO' && <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => setShowAddWork(true)}><Plus className="w-4 h-4 mr-2" />Add First Work</Button>}
        </CardContent></Card>
      )}

      {/* Add Work Dialog */}
      <Dialog open={showAddWork} onOpenChange={(v) => { setShowAddWork(v); if (!v) { setSuggestions(null); setSelectedPlt(null) } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Work to APO</DialogTitle><DialogDescription>Select a plantation, then choose activities from the rate card.</DialogDescription></DialogHeader>
          
          {!suggestions ? (
            <div className="space-y-4">
              <div><Label>Select Plantation</Label>
                <Select value={selectedPlt || ''} onValueChange={loadSuggestions}>
                  <SelectTrigger><SelectValue placeholder="Choose a plantation" /></SelectTrigger>
                  <SelectContent>{plantations.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.species}, {p.age} yr, {p.total_area_ha} Ha)</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm"><strong>{suggestions.plantation_name}</strong> | {suggestions.species} | Age: {suggestions.age} yr | Area: {suggestions.total_area_ha} Ha</p>
              </div>
              <div><Label>Work Name</Label><Input value={workName} onChange={e => setWorkName(e.target.value)} /></div>
              <div>
                <Label className="mb-2 block">Select Activities <span className="text-amber-600 text-xs">(Rates are locked from SSR)</span></Label>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50">
                      <TableHead className="w-10"></TableHead><TableHead>Activity</TableHead><TableHead>SSR</TableHead>
                      <TableHead className="text-right">Rate (₹)</TableHead><TableHead className="text-right w-24">Qty</TableHead>
                      <TableHead className="text-right">Cost (₹)</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{suggestions.suggested_activities?.map(a => (
                      <TableRow key={a.activity_id} className={selectedActivities[a.activity_id] ? 'bg-emerald-50/50' : 'opacity-60'}>
                        <TableCell><Checkbox checked={!!selectedActivities[a.activity_id]} onCheckedChange={(v) => setSelectedActivities(p => ({ ...p, [a.activity_id]: v }))} /></TableCell>
                        <TableCell className="font-medium text-sm">{a.activity_name}</TableCell>
                        <TableCell className="text-xs font-mono">{a.ssr_no}</TableCell>
                        <TableCell className="text-right"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm font-mono">{a.sanctioned_rate?.toLocaleString('en-IN')}</span></TableCell>
                        <TableCell className="text-right"><Input type="number" step="0.1" className="w-20 text-right" value={quantities[a.activity_id] || ''} onChange={e => setQuantities(p => ({ ...p, [a.activity_id]: parseFloat(e.target.value) || 0 }))} disabled={!selectedActivities[a.activity_id]} /></TableCell>
                        <TableCell className="text-right font-semibold">{selectedActivities[a.activity_id] ? formatCurrency((quantities[a.activity_id] || 0) * a.sanctioned_rate) : '-'}</TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-right"><p className="text-sm text-muted-foreground">Selected Cost</p>
                    <p className="text-xl font-bold text-emerald-800">{formatCurrency(suggestions.suggested_activities?.filter(a => selectedActivities[a.activity_id]).reduce((s, a) => s + (quantities[a.activity_id] || 0) * a.sanctioned_rate, 0))}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => { setSuggestions(null); setSelectedPlt(null) }}>Back</Button>
                <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleAddWork}><Plus className="w-4 h-4 mr-2" />Save Work</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApproval} onOpenChange={setShowApproval}>
        <DialogContent>
          <DialogHeader><DialogTitle>{approvalAction === 'SANCTIONED' ? 'Approve APO' : 'Reject APO'}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{approvalAction === 'SANCTIONED' ? 'This will sanction the budget. The APO becomes immutable.' : 'The RO can revise and resubmit.'}</p>
          <DialogFooter><Button variant="outline" onClick={() => setShowApproval(false)}>Cancel</Button>
            <Button className={approvalAction === 'SANCTIONED' ? 'bg-emerald-700 hover:bg-emerald-800' : ''} variant={approvalAction === 'REJECTED' ? 'destructive' : 'default'} onClick={() => handleStatusChange(approvalAction)}>{approvalAction === 'SANCTIONED' ? 'Approve & Sanction' : 'Reject'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work Log Dialog */}
      <Dialog open={showWorkLog} onOpenChange={setShowWorkLog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Work — {selectedWorkItem?.activity_name}</DialogTitle>
            <DialogDescription>Budget: {formatCurrency(selectedWorkItem?.total_cost)} | Spent: {formatCurrency(selectedWorkItem?.total_spent)} | Remaining: {formatCurrency(selectedWorkItem?.remaining_budget)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Work Date</Label><Input type="date" value={workLogForm.work_date} onChange={e => setWorkLogForm(f => ({ ...f, work_date: e.target.value }))} /></div>
            <div><Label>Actual Qty ({selectedWorkItem?.unit})</Label><Input type="number" step="0.1" value={workLogForm.actual_qty} onChange={e => setWorkLogForm(f => ({ ...f, actual_qty: e.target.value }))} /></div>
            <div><Label>Expenditure (₹)</Label><Input type="number" step="0.01" value={workLogForm.expenditure} onChange={e => setWorkLogForm(f => ({ ...f, expenditure: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowWorkLog(false)}>Cancel</Button><Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleWorkLog}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== NORMS VIEW =====================
function NormsView({ user }) {
  const [norms, setNorms] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAge, setSelectedAge] = useState('all')

  useEffect(() => { Promise.all([api.get('/norms'), api.get('/activities')]).then(([n, a]) => { setNorms(n); setActivities(a) }).catch(console.error).finally(() => setLoading(false)) }, [])

  const filteredNorms = selectedAge === 'all' ? norms : norms.filter(n => n.applicable_age === parseInt(selectedAge))
  const ages = [...new Set(norms.map(n => n.applicable_age))].sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Standard Rate Card</h2><p className="text-muted-foreground">Approved cost per activity, organized by plantation age (SSR-based)</p></div>
      <div className="flex gap-2 flex-wrap">
        <Button variant={selectedAge === 'all' ? 'default' : 'outline'} size="sm" className={selectedAge === 'all' ? 'bg-emerald-700 hover:bg-emerald-800' : ''} onClick={() => setSelectedAge('all')}>All Ages</Button>
        {ages.map(age => (<Button key={age} variant={selectedAge === String(age) ? 'default' : 'outline'} size="sm" className={selectedAge === String(age) ? 'bg-emerald-700 hover:bg-emerald-800' : ''} onClick={() => setSelectedAge(String(age))}>Year {age}</Button>))}
      </div>
      {loading ? <div className="flex items-center justify-center h-40"><RefreshCw className="w-6 h-6 animate-spin" /></div> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Activity</TableHead><TableHead>SSR No.</TableHead><TableHead>Category</TableHead><TableHead>Unit</TableHead>
            <TableHead className="text-center">Age (Yr)</TableHead><TableHead className="text-right">Approved Cost (₹)</TableHead><TableHead>FY</TableHead>
          </TableRow></TableHeader>
          <TableBody>{filteredNorms.map(n => (
            <TableRow key={n.id}>
              <TableCell className="font-medium">{n.activity_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground font-mono">{n.ssr_no || '-'}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{n.category}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{n.unit}</TableCell>
              <TableCell className="text-center"><Badge className="bg-emerald-100 text-emerald-800">{n.applicable_age}</Badge></TableCell>
              <TableCell className="text-right font-semibold font-mono">{formatCurrency(n.standard_rate)}</TableCell>
              <TableCell className="text-sm">{n.financial_year}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
    </div>
  )
}

// ===================== MAIN APP =====================
function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [selectedPlantation, setSelectedPlantation] = useState(null)
  const [selectedApo, setSelectedApo] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('kfdc_token')
    if (token) { api.setToken(token); api.get('/auth/me').then(u => setUser(u)).catch(() => { api.setToken(null) }).finally(() => setAuthChecked(true)) }
    else setAuthChecked(true)
  }, [])

  const handleLogout = () => { api.post('/auth/logout').catch(() => {}); api.setToken(null); setUser(null); setView('dashboard') }

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-emerald-600" /></div>
  if (!user) return <LoginPage onLogin={(u) => { setUser(u); setView('dashboard') }} />

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard user={user} />
      case 'plantations': return <PlantationsView user={user} setView={setView} setSelectedPlantation={setSelectedPlantation} />
      case 'plantation-detail': return selectedPlantation ? <PlantationDetail plantation={selectedPlantation} setView={setView} /> : null
      case 'apo-list': return <ApoList user={user} setView={setView} setSelectedApo={setSelectedApo} />
      case 'apo-detail': return selectedApo ? <ApoDetail apoId={selectedApo} user={user} setView={setView} /> : null
      case 'norms': return <NormsView user={user} />
      default: return <Dashboard user={user} />
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={user} currentView={view} setView={setView} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto"><div className="p-6 max-w-7xl mx-auto">{renderView()}</div></main>
    </div>
  )
}

export default App
