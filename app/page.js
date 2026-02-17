'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  TreePine, LogIn, LogOut, LayoutDashboard, FileText, TreesIcon, Settings, ChevronRight,
  Plus, Eye, CheckCircle, XCircle, Clock, AlertTriangle, Leaf, MapPin, Calendar,
  IndianRupee, TrendingUp, ClipboardList, Send, ArrowLeft, RefreshCw, ChevronDown,
  User, Shield, Building2, Layers, BookOpen
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
    // Use /api prefix for Next.js API routes
    const res = await fetch(`/api${url}`, { ...options, headers })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed')
    return data
  },
  get(url) { return this.fetch(url) },
  post(url, body) { return this.fetch(url, { method: 'POST', body: JSON.stringify(body) }) },
  patch(url, body) { return this.fetch(url, { method: 'PATCH', body: JSON.stringify(body) }) },
  delete(url) { return this.fetch(url, { method: 'DELETE' }) },
}

// ===================== CONSTANTS =====================
// APO Status Flow: DRAFT → PENDING_DM_APPROVAL → PENDING_HO_APPROVAL → SANCTIONED
const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  PENDING_DM_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-300',
  PENDING_HO_APPROVAL: 'bg-blue-50 text-blue-700 border-blue-300',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-300', // Legacy
  SANCTIONED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  REJECTED: 'bg-red-50 text-red-700 border-red-300',
}

const STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_DM_APPROVAL: 'Pending DM Approval',
  PENDING_HO_APPROVAL: 'Pending HO Approval',
  PENDING_APPROVAL: 'Pending Approval', // Legacy
  SANCTIONED: 'Sanctioned',
  REJECTED: 'Rejected',
}

const STATUS_ICONS = {
  DRAFT: <Clock className="w-3.5 h-3.5" />,
  PENDING_DM_APPROVAL: <AlertTriangle className="w-3.5 h-3.5" />,
  PENDING_HO_APPROVAL: <Send className="w-3.5 h-3.5" />,
  PENDING_APPROVAL: <AlertTriangle className="w-3.5 h-3.5" />, // Legacy
  SANCTIONED: <CheckCircle className="w-3.5 h-3.5" />,
  REJECTED: <XCircle className="w-3.5 h-3.5" />,
}

const CHART_COLORS = ['#166534', '#ca8a04', '#2563eb', '#dc2626', '#7c3aed']

const formatCurrency = (n) => {
  if (n == null) return '₹0'
  return '₹' + Math.round(Number(n)).toLocaleString('en-IN')
}

// ===================== LOGIN PAGE =====================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.post('/seed')
      setError('')
      alert('Demo data seeded successfully! You can now login.')
    } catch (e) {
      setError(e.message)
    }
    setSeeding(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api.post('/auth/login', { email, password })
      api.setToken(data.token)
      onLogin(data.user)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const demoAccounts = [
    { email: 'ro.dharwad@kfdc.in', role: 'Range Officer', division: 'Dharwad' },
    { email: 'ro.svpura@kfdc.in', role: 'Range Officer', division: 'Bangalore' },
    { email: 'dm.dharwad@kfdc.in', role: 'Division Manager', division: 'Dharwad' },
    { email: 'dm.bangalore@kfdc.in', role: 'Division Manager', division: 'Bangalore' },
    { email: 'admin@kfdc.in', role: 'Admin (HO)', division: 'All' },
    { email: 'ecw.dharwad@kfdc.in', role: 'Estimates Case Worker', division: 'Dharwad' },
    { email: 'ps.dharwad@kfdc.in', role: 'Plantation Supervisor', division: 'Dharwad' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left - Branding */}
        <div className="text-white space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <TreePine className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">KFDC iFMS</h1>
              <p className="text-emerald-300 text-sm">Integrated Forestry Management</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            Stump to Sale<br />
            <span className="text-emerald-300">Digital Platform</span>
          </h2>
          <p className="text-emerald-100/80 text-lg leading-relaxed">
            Centralized norms-driven platform managing the entire lifecycle of plantations.
            From APO generation to budget enforcement.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-emerald-300">45+</div>
              <div className="text-xs text-emerald-200/70">Plantations</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-emerald-300">19</div>
              <div className="text-xs text-emerald-200/70">Ranges</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-emerald-300">4</div>
              <div className="text-xs text-emerald-200/70">Divisions</div>
            </div>
          </div>
        </div>

        {/* Right - Login Form */}
        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Enter your KFDC credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your.name@kfdc.in" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
              <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
                <LogIn className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="mt-6">
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground mb-3">Demo Accounts (password: pass123)</p>
              <div className="space-y-2">
                {demoAccounts.map(acc => (
                  <button key={acc.email} onClick={() => { setEmail(acc.email); setPassword('pass123') }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="text-sm font-medium">{acc.role}</div>
                        <div className="text-xs text-muted-foreground">{acc.email}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{acc.division}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={handleSeed} disabled={seeding}>
              <RefreshCw className={`w-4 h-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
              {seeding ? 'Seeding...' : 'Initialize Demo Data'}
            </Button>
          </CardFooter>
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
    { id: 'apo-wizard', label: 'Create APO', icon: Plus, roles: ['RO'] },
    { id: 'norms', label: 'Standard Rate Card', icon: BookOpen, roles: ['RO', 'DM', 'ADMIN'] },
    { id: 'estimates', label: 'Estimates', icon: ClipboardList, roles: ['CASE_WORKER_ESTIMATES', 'PLANTATION_SUPERVISOR'] },
  ]

  const roleLabels = { 
    RO: 'Range Officer', 
    DM: 'Division Manager', 
    ADMIN: 'Admin (HO)',
    CASE_WORKER_ESTIMATES: 'Estimates Case Worker',
    PLANTATION_SUPERVISOR: 'Plantation Supervisor'
  }
  const roleColors = { 
    RO: 'bg-blue-100 text-blue-800', 
    DM: 'bg-purple-100 text-purple-800', 
    ADMIN: 'bg-amber-100 text-amber-800',
    CASE_WORKER_ESTIMATES: 'bg-cyan-100 text-cyan-800',
    PLANTATION_SUPERVISOR: 'bg-teal-100 text-teal-800'
  }

  return (
    <div className="w-64 bg-white border-r border-border h-screen flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-emerald-700 rounded-lg flex items-center justify-center">
            <TreePine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground">KFDC iFMS</h1>
            <p className="text-[10px] text-muted-foreground">The Green ERP</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.filter(n => n.roles.includes(user.role)).map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${currentView === item.id
                ? 'bg-emerald-50 text-emerald-800 font-medium shadow-sm border border-emerald-200'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}>
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <Badge className={`text-[10px] ${roleColors[user.role]}`}>{roleLabels[user.role]}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={onLogout}>
          <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  )
}

// ===================== DASHBOARD =====================
function Dashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats').then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

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
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back, {user.name} | FY 2026-27
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Budget: Sanctioned vs Utilized</CardTitle>
            <CardDescription>Activity-wise budget comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.budget_chart?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.budget_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="sanctioned" name="Sanctioned" fill="#166534" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" name="Utilized" fill="#ca8a04" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>No budget data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">APO Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">No APOs yet</div>
            )}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Sanctioned</span>
                <span className="font-semibold">{formatCurrency(stats.total_sanctioned_amount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Utilized</span>
                <span className="font-semibold">{formatCurrency(stats.total_expenditure)}</span>
              </div>
              <Progress value={stats.utilization_pct} className="h-2 mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(user.role === 'RO' && (stats.draft_apos > 0 || stats.pending_apos > 0)) && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.draft_apos > 0 && (
              <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-gray-500" />{stats.draft_apos} APO(s) in Draft - submit for approval</div>
            )}
            {stats.pending_apos > 0 && (
              <div className="flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-amber-500" />{stats.pending_apos} APO(s) pending approval</div>
            )}
          </CardContent>
        </Card>
      )}

      {(user.role === 'DM' && stats.pending_apos > 0) && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{stats.pending_apos} APO(s) waiting for your review and approval</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ===================== PLANTATIONS =====================
function PlantationsView({ user, setView, setSelectedPlantation }) {
  const [plantations, setPlantations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', species: '', year_of_planting: 2024, total_area_ha: '', village: '', taluk: '', district: '' })

  const load = useCallback(() => {
    setLoading(true)
    api.get('/plantations').then(setPlantations).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      await api.post('/plantations', form)
      setShowCreate(false)
      setForm({ name: '', species: '', year_of_planting: 2024, total_area_ha: '', village: '', taluk: '', district: '' })
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plantations</h2>
          <p className="text-muted-foreground">Manage your plantation assets</p>
        </div>
        {user.role === 'RO' && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-700 hover:bg-emerald-800"><Plus className="w-4 h-4 mr-2" /> Add Plantation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Plantation</DialogTitle>
                <DialogDescription>Add a new plantation to your range</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>Plantation Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Varavanagalavi" /></div>
                <div><Label>Species</Label><Input value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))} placeholder="e.g., Acacia Auriculiformis, Eucalyptus Pellita" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Year of Planting</Label><Input type="number" value={form.year_of_planting} onChange={e => setForm(f => ({ ...f, year_of_planting: e.target.value }))} /></div>
                  <div><Label>Area (Hectares)</Label><Input type="number" step="0.1" value={form.total_area_ha} onChange={e => setForm(f => ({ ...f, total_area_ha: e.target.value }))} /></div>
                </div>
                <div><Label>Village Name</Label><Input value={form.village} onChange={e => setForm(f => ({ ...f, village: e.target.value }))} placeholder="e.g., Varavanagalavi" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Taluk</Label><Input value={form.taluk} onChange={e => setForm(f => ({ ...f, taluk: e.target.value }))} placeholder="e.g., Dharwad, Khanapur" /></div>
                  <div><Label>District</Label><Input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g., Dharwad, Belagavi" /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleCreate}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantations.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { setSelectedPlantation(p); setView('plantation-detail') }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-emerald-700" />
                  </div>
                  <Badge variant="outline" className="text-xs">{p.species}</Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-emerald-700 transition-colors">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-1">{p.range_name} | {p.division_name}</p>
                {p.village && <p className="text-xs text-muted-foreground mb-3">{p.village}{p.taluk ? `, ${p.taluk}` : ''}{p.district ? ` (${p.district})` : ''}</p>}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Age</p>
                    <p className="font-semibold text-sm">{p.age} yr</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Area</p>
                    <p className="font-semibold text-sm">{p.total_area_ha} Ha</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Planted</p>
                    <p className="font-semibold text-sm">{p.year_of_planting}</p>
                  </div>
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

  useEffect(() => {
    api.get(`/plantations/${plantation.id}/history`).then(setHistory).catch(console.error).finally(() => setLoading(false))
  }, [plantation.id])

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => setView('plantations')}>
        <ArrowLeft className="w-4 h-4" /> Back to Plantations
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TreePine className="w-8 h-8 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{plantation.name}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{plantation.range_name}</span>
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{plantation.division_name}</span>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800">{plantation.species}</Badge>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Age</p>
              <p className="text-lg font-bold">{plantation.age} years</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Area</p>
              <p className="text-lg font-bold">{plantation.total_area_ha} Ha</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Year Planted</p>
              <p className="text-lg font-bold">{plantation.year_of_planting}</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Total APOs</p>
              <p className="text-lg font-bold">{history.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">APO History</CardTitle>
          <CardDescription>All Annual Plans of Operations for this plantation</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-20"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No APOs created for this plantation yet</p>
          ) : (
            <div className="space-y-3">
              {history.map(apo => (
                <div key={apo.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-sm">FY {apo.financial_year}</span>
                    </div>
                    <Badge className={STATUS_COLORS[apo.status]}>{STATUS_LABELS[apo.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span>Amount: {formatCurrency(apo.total_sanctioned_amount)}</span>
                    <span>Items: {apo.items?.length || 0}</span>
                    <span>Created: {new Date(apo.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ===================== APO WIZARD =====================
function ApoWizard({ user, setView }) {
  const [step, setStep] = useState(1)
  const [plantations, setPlantations] = useState([])
  const [selectedPlantation, setSelectedPlt] = useState(null)
  const [financialYear, setFinancialYear] = useState('2026-27')
  const [draft, setDraft] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/plantations').then(setPlantations).catch(console.error)
  }, [])

  const generateDraft = async () => {
    if (!selectedPlantation) return
    setLoading(true)
    try {
      const data = await api.post('/apo/generate-draft', { plantation_id: selectedPlantation, financial_year: financialYear })
      setDraft(data)
      setItems(data.items.map(i => ({ ...i, sanctioned_qty: i.suggested_qty })))
      setStep(2)
    } catch (e) {
      alert(e.message)
    }
    setLoading(false)
  }

  const updateQty = (index, qty) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const newQty = parseFloat(qty) || 0
      return { ...item, sanctioned_qty: newQty, total_cost: newQty * item.sanctioned_rate }
    }))
  }

  const totalCost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0)

  const submitApo = async (status) => {
    setSubmitting(true)
    try {
      await api.post('/apo', {
        plantation_id: selectedPlantation,
        financial_year: financialYear,
        status,
        items: items.map(i => ({
          activity_id: i.activity_id,
          activity_name: i.activity_name,
          sanctioned_qty: i.sanctioned_qty,
          sanctioned_rate: i.sanctioned_rate,
          unit: i.unit,
        })),
      })
      setStep(4)
    } catch (e) {
      alert(e.message)
    }
    setSubmitting(false)
  }

  const selectedPlt = plantations.find(p => p.id === selectedPlantation)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">APO Wizard</h2>
        <p className="text-muted-foreground">Create a new Annual Plan of Operations</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-emerald-700 text-white' : 'bg-muted text-muted-foreground'
              }`}>{s}</div>
            <span className={`text-sm ${step >= s ? 'font-medium' : 'text-muted-foreground'}`}>
              {s === 1 ? 'Select Plantation' : s === 2 ? 'Review Activities' : s === 3 ? 'Confirm & Submit' : 'Done'}
            </span>
            {s < 4 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Plantation */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Plantation & Financial Year</CardTitle>
            <CardDescription>Choose the plantation for which you want to generate the APO</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Plantation</Label>
              <Select value={selectedPlantation || ''} onValueChange={setSelectedPlt}>
                <SelectTrigger><SelectValue placeholder="Select a plantation" /></SelectTrigger>
                <SelectContent>
                  {plantations.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.species}, {p.age} yr old, {p.total_area_ha} Ha)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Financial Year</Label>
              <Select value={financialYear} onValueChange={setFinancialYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026-27">2026-27</SelectItem>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPlt && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="font-medium text-sm text-emerald-800 mb-2">Selected Plantation Info</h4>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Species:</span> <strong>{selectedPlt.species}</strong></div>
                  <div><span className="text-muted-foreground">Age:</span> <strong>{selectedPlt.age} years</strong></div>
                  <div><span className="text-muted-foreground">Area:</span> <strong>{selectedPlt.total_area_ha} Ha</strong></div>
                  <div><span className="text-muted-foreground">Range:</span> <strong>{selectedPlt.range_name}</strong></div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={generateDraft} disabled={!selectedPlantation || loading}>
              {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <>Generate Draft <ChevronRight className="w-4 h-4 ml-2" /></>}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Review Activities with locked rates */}
      {step === 2 && draft && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Review Standard Works</CardTitle>
            <CardDescription>
              Based on plantation age ({draft.age} years), the system has auto-filled standard activities and rates.
              <span className="text-amber-600 font-medium"> Unit rates are locked and cannot be modified.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[30%]">Activity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Rate (₹)</TableHead>
                    <TableHead className="text-right w-[120px]">Quantity</TableHead>
                    <TableHead className="text-right">Total Cost (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.activity_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-right">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm font-mono cursor-not-allowed">
                          {item.sanctioned_rate.toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" step="0.1" className="w-24 text-right ml-auto" value={item.sanctioned_qty}
                          onChange={e => updateQty(idx, e.target.value)} />
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => setStep(3)}>
              Review & Submit <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Confirm & Submit</CardTitle>
            <CardDescription>Review the APO summary before submission</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Plantation</p>
                <p className="font-semibold">{draft?.plantation_name}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Financial Year</p>
                <p className="font-semibold">{draft?.financial_year}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Activities</p>
                <p className="font-semibold">{items.length}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-600">Total Amount</p>
                <p className="font-bold text-lg text-emerald-800">{formatCurrency(totalCost)}</p>
              </div>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.activity_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.sanctioned_rate)}</TableCell>
                      <TableCell className="text-right">{item.sanctioned_qty}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => submitApo('DRAFT')} disabled={submitting}>
                <Clock className="w-4 h-4 mr-2" /> Save as Draft
              </Button>
              <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => submitApo('PENDING_DM_APPROVAL')} disabled={submitting}>
                {submitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4 mr-2" /> Submit to DM</>}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <Card className="border-emerald-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-700" />
            </div>
            <h3 className="text-xl font-bold mb-2">APO Submitted Successfully!</h3>
            <p className="text-muted-foreground mb-6">Your APO has been submitted to the Division Manager for approval.</p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-sm text-blue-800">
              <strong>Approval Hierarchy:</strong> RO → DM → Head Office (Admin)
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setView('apo-list')}>View All APOs</Button>
              <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => { setStep(1); setDraft(null); setItems([]); setSelectedPlt(null) }}>
                Create Another APO
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ===================== APO LIST =====================
function ApoList({ user, setView, setSelectedApo }) {
  const [apos, setApos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(() => {
    setLoading(true)
    const url = filter === 'all' ? '/apo' : `/apo?status=${filter}`
    api.get(url).then(setApos).catch(console.error).finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">APO Management</h2>
          <p className="text-muted-foreground">View and manage Annual Plans of Operations</p>
        </div>
        {user.role === 'RO' && (
          <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => setView('apo-wizard')}>
            <Plus className="w-4 h-4 mr-2" /> New APO
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'DRAFT', 'PENDING_DM_APPROVAL', 'PENDING_HO_APPROVAL', 'SANCTIONED', 'REJECTED'].map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm"
            className={filter === f ? 'bg-emerald-700 hover:bg-emerald-800' : ''}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : STATUS_LABELS[f] || f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : apos.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No APOs found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {apos.map(apo => (
            <Card key={apo.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedApo(apo.id); setView('apo-detail') }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{apo.plantation_name}</h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>FY {apo.financial_year}</span>
                        <span>by {apo.created_by_name}</span>
                        <span>{new Date(apo.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(apo.total_sanctioned_amount)}</p>
                    </div>
                    <Badge className={`${STATUS_COLORS[apo.status]} flex items-center gap-1`}>
                      {STATUS_ICONS[apo.status]} {STATUS_LABELS[apo.status]}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ===================== APO DETAIL =====================
function ApoDetail({ apoId, user, setView }) {
  const [apo, setApo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showApproval, setShowApproval] = useState(false)
  const [approvalAction, setApprovalAction] = useState('')
  const [comment, setComment] = useState('')
  const [showWorkLog, setShowWorkLog] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [workLogForm, setWorkLogForm] = useState({ actual_qty: '', expenditure: '', work_date: '' })

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/apo/${apoId}`).then(setApo).catch(console.error).finally(() => setLoading(false))
  }, [apoId])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (status) => {
    try {
      await api.patch(`/apo/${apoId}/status`, { status, comment })
      setShowApproval(false)
      setComment('')
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleWorkLog = async () => {
    try {
      await api.post('/work-logs', {
        apo_item_id: selectedItem.id,
        actual_qty: parseFloat(workLogForm.actual_qty),
        expenditure: parseFloat(workLogForm.expenditure),
        work_date: workLogForm.work_date || undefined,
      })
      setShowWorkLog(false)
      setWorkLogForm({ actual_qty: '', expenditure: '', work_date: '' })
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600" /></div>
  if (!apo) return <p>APO not found</p>

  const totalSpent = apo.items?.reduce((sum, i) => sum + (i.total_spent || 0), 0) || 0
  const totalBudget = apo.items?.reduce((sum, i) => sum + (i.total_cost || 0), 0) || 0
  const utilPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => setView('apo-list')}>
        <ArrowLeft className="w-4 h-4" /> Back to APO List
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{apo.plantation_name}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>FY {apo.financial_year}</span>
                <span>|</span>
                <span>{apo.species} - {apo.plantation_age} yr old</span>
                <span>|</span>
                <span>{apo.total_area_ha} Ha</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>Created by: {apo.created_by_name}</span>
                {apo.approved_by_name && <span>| Approved by: {apo.approved_by_name}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${STATUS_COLORS[apo.status]} text-sm px-3 py-1 flex items-center gap-1`}>
                {STATUS_ICONS[apo.status]} {STATUS_LABELS[apo.status]}
              </Badge>
            </div>
          </div>

          {/* Budget summary */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs text-emerald-600">Total Budget</p>
              <p className="text-xl font-bold text-emerald-800">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-600">Total Spent</p>
              <p className="text-xl font-bold text-amber-800">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600">Utilization</p>
              <p className="text-xl font-bold text-blue-800">{utilPct}%</p>
              <Progress value={utilPct} className="h-2 mt-2" />
            </div>
          </div>

          {/* APO Approval Workflow: RO → DM → HO (Admin) */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {/* RO: Submit DRAFT to DM */}
            {user.role === 'RO' && apo.status === 'DRAFT' && (
              <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => handleStatusChange('PENDING_DM_APPROVAL')}>
                <Send className="w-4 h-4 mr-2" /> Submit to DM for Approval
              </Button>
            )}
            
            {/* RO: Revise rejected APO */}
            {user.role === 'RO' && apo.status === 'REJECTED' && (
              <Button variant="outline" onClick={() => handleStatusChange('DRAFT')}>
                <RefreshCw className="w-4 h-4 mr-2" /> Revise & Resubmit
              </Button>
            )}
            
            {/* DM: Approve (forward to HO) or Reject */}
            {user.role === 'DM' && (apo.status === 'PENDING_DM_APPROVAL' || apo.status === 'PENDING_APPROVAL') && (
              <>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setApprovalAction('PENDING_HO_APPROVAL'); setShowApproval(true) }}>
                  <Send className="w-4 h-4 mr-2" /> Forward to Head Office
                </Button>
                <Button variant="destructive" onClick={() => { setApprovalAction('REJECTED'); setShowApproval(true) }}>
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </>
            )}
            
            {/* ADMIN/HO: Final Sanction or Reject */}
            {user.role === 'ADMIN' && (apo.status === 'PENDING_HO_APPROVAL' || apo.status === 'PENDING_APPROVAL') && (
              <>
                <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => { setApprovalAction('SANCTIONED'); setShowApproval(true) }}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Sanction APO
                </Button>
                <Button variant="destructive" onClick={() => { setApprovalAction('REJECTED'); setShowApproval(true) }}>
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </>
            )}

            {/* Status indicators */}
            {apo.status === 'PENDING_DM_APPROVAL' && user.role === 'RO' && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700">Awaiting DM Review</Badge>
            )}
            {apo.status === 'PENDING_HO_APPROVAL' && ['RO', 'DM'].includes(user.role) && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">Awaiting HO Sanction</Badge>
            )}
            {apo.status === 'SANCTIONED' && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700">✓ APO Sanctioned</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">APO Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Activity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate (₹)</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Budget (₹)</TableHead>
                  <TableHead className="text-right">Spent (₹)</TableHead>
                  <TableHead className="text-right">Remaining (₹)</TableHead>
                  <TableHead className="text-center">Usage</TableHead>
                  {user.role === 'RO' && apo.status === 'SANCTIONED' && <TableHead className="text-center">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {apo.items?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.activity_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="text-right font-mono">{item.sanctioned_rate?.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">{item.sanctioned_qty}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.total_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total_spent)}</TableCell>
                    <TableCell className="text-right text-emerald-700 font-medium">{formatCurrency(item.remaining_budget)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={item.utilization_pct} className="h-2 w-16" />
                        <span className="text-xs">{item.utilization_pct}%</span>
                      </div>
                    </TableCell>
                    {user.role === 'RO' && apo.status === 'SANCTIONED' && (
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setShowWorkLog(true) }}>
                          <Plus className="w-3 h-3 mr-1" /> Log Work
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Work Logs per Item */}
      {apo.status === 'SANCTIONED' && apo.items?.some(i => i.work_logs?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Work Logs / Expenditure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {apo.items?.filter(i => i.work_logs?.length > 0).map(item => (
                <div key={item.id} className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">{item.activity_name}</h4>
                  <div className="space-y-1">
                    {item.work_logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <span>{new Date(log.work_date).toLocaleDateString()}</span>
                        <span>Qty: {log.actual_qty}</span>
                        <span className="font-semibold">{formatCurrency(log.expenditure)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApproval} onOpenChange={setShowApproval}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approvalAction === 'SANCTIONED' ? 'Approve APO' : 'Reject APO'}</DialogTitle>
            <DialogDescription>
              {approvalAction === 'SANCTIONED'
                ? 'This will sanction the budget. The APO will become immutable.'
                : 'This will reject the APO. The Range Officer can revise and resubmit.'}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Comments (optional)</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add your comments..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproval(false)}>Cancel</Button>
            <Button className={approvalAction === 'SANCTIONED' ? 'bg-emerald-700 hover:bg-emerald-800' : ''}
              variant={approvalAction === 'REJECTED' ? 'destructive' : 'default'}
              onClick={() => handleStatusChange(approvalAction)}>
              {approvalAction === 'SANCTIONED' ? 'Approve & Sanction' : 'Reject APO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work Log Dialog */}
      <Dialog open={showWorkLog} onOpenChange={setShowWorkLog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Work - {selectedItem?.activity_name}</DialogTitle>
            <DialogDescription>
              Budget: {formatCurrency(selectedItem?.total_cost)} | Spent: {formatCurrency(selectedItem?.total_spent)} | Remaining: {formatCurrency(selectedItem?.remaining_budget)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Work Date</Label><Input type="date" value={workLogForm.work_date} onChange={e => setWorkLogForm(f => ({ ...f, work_date: e.target.value }))} /></div>
            <div><Label>Actual Quantity ({selectedItem?.unit})</Label><Input type="number" step="0.1" value={workLogForm.actual_qty} onChange={e => setWorkLogForm(f => ({ ...f, actual_qty: e.target.value }))} /></div>
            <div><Label>Expenditure (₹)</Label><Input type="number" step="0.01" value={workLogForm.expenditure} onChange={e => setWorkLogForm(f => ({ ...f, expenditure: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkLog(false)}>Cancel</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleWorkLog}>Save Work Log</Button>
          </DialogFooter>
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
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ activity_id: '', applicable_age: '', standard_rate: '', financial_year: '2025-26' })
  const [selectedAge, setSelectedAge] = useState('all')

  useEffect(() => {
    Promise.all([api.get('/norms'), api.get('/activities')]).then(([n, a]) => { setNorms(n); setActivities(a) }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    try {
      const newNorm = await api.post('/norms', form)
      setNorms(prev => [...prev, { ...newNorm, activity_name: activities.find(a => a.id === form.activity_id)?.name }])
      setShowCreate(false)
      setForm({ activity_id: '', applicable_age: '', standard_rate: '', financial_year: '2025-26' })
    } catch (e) {
      alert(e.message)
    }
  }

  const filteredNorms = selectedAge === 'all' ? norms : norms.filter(n => n.applicable_age === parseInt(selectedAge))
  const ages = [...new Set(norms.map(n => n.applicable_age))].sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Standard Rate Card</h2>
          <p className="text-muted-foreground">Approved cost per activity, organized by plantation age (SSR-based)</p>
        </div>
        {user.role === 'ADMIN' && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-700 hover:bg-emerald-800"><Plus className="w-4 h-4 mr-2" /> Add Norm</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Norm</DialogTitle>
                <DialogDescription>Add a standard rate for an activity</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Activity</Label>
                  <Select value={form.activity_id} onValueChange={v => setForm(f => ({ ...f, activity_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
                    <SelectContent>
                      {activities.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.category})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Applicable Age (Year)</Label><Input type="number" value={form.applicable_age} onChange={e => setForm(f => ({ ...f, applicable_age: e.target.value }))} /></div>
                  <div><Label>Standard Rate (₹)</Label><Input type="number" step="0.01" value={form.standard_rate} onChange={e => setForm(f => ({ ...f, standard_rate: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Financial Year</Label>
                  <Select value={form.financial_year} onValueChange={v => setForm(f => ({ ...f, financial_year: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-26">2025-26</SelectItem>
                      <SelectItem value="2026-27">2026-27</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleCreate}>Create Norm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter by Age */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={selectedAge === 'all' ? 'default' : 'outline'} size="sm"
          className={selectedAge === 'all' ? 'bg-emerald-700 hover:bg-emerald-800' : ''}
          onClick={() => setSelectedAge('all')}>All Ages</Button>
        {ages.map(age => (
          <Button key={age} variant={selectedAge === String(age) ? 'default' : 'outline'} size="sm"
            className={selectedAge === String(age) ? 'bg-emerald-700 hover:bg-emerald-800' : ''}
            onClick={() => setSelectedAge(String(age))}>Year {age}</Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><RefreshCw className="w-6 h-6 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-lg border-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Activity</TableHead>
                    <TableHead>SSR No.</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-center">Applicable Age (Yr)</TableHead>
                    <TableHead className="text-right">Approved Cost (₹)</TableHead>
                    <TableHead>Financial Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNorms.map(n => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.activity_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{n.ssr_no || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{n.category}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.unit}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 text-emerald-800">{n.applicable_age}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono">{formatCurrency(n.standard_rate)}</TableCell>
                      <TableCell className="text-sm">{n.financial_year}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ===================== ESTIMATES VIEW =====================
function EstimatesView({ user }) {
  const [works, setWorks] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isECW = user.role === 'CASE_WORKER_ESTIMATES'
  const isPS = user.role === 'PLANTATION_SUPERVISOR'

  const fetchWorks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/apo/estimates')
      setWorks(data.works || [])
      setSummary(data.summary || null)
    } catch (e) {
      setError(e.message)
      setWorks([])
      setSummary(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchWorks()
  }, [fetchWorks])

  const handleUpdateQty = async (itemId, newQty) => {
    try {
      await api.patch(`/apo/items/${itemId}/estimate`, { revised_qty: parseFloat(newQty), user_role: user.role })
      fetchWorks()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      await api.patch(`/apo/items/${itemId}/status`, { status: newStatus, user_role: user.role })
      fetchWorks()
    } catch (e) {
      setError(e.message)
    }
  }

  // Group works by plantation for better organization
  const worksByPlantation = works.reduce((acc, work) => {
    const key = work.plantation_id || 'unknown'
    if (!acc[key]) {
      acc[key] = {
        plantation_name: work.plantation_name,
        plantation_id: work.plantation_id,
        items: []
      }
    }
    acc[key].items.push(work)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estimates Dashboard</h1>
          <p className="text-muted-foreground">
            Manage work estimates for <span className="font-medium text-emerald-700">SANCTIONED APOs</span> in your jurisdiction
          </p>
        </div>
        <Button onClick={fetchWorks} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Jurisdiction & Summary Card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-emerald-600 font-medium">Your Jurisdiction</div>
                <div className="text-xl font-bold text-emerald-900">{summary?.jurisdiction || 'Loading...'}</div>
                <div className="text-xs text-muted-foreground">{summary?.jurisdiction_type || ''} Level Access</div>
              </div>
            </div>
            
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Sanctioned APOs</div>
                <div className="text-2xl font-bold text-emerald-800">{summary?.sanctioned_apo_count || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Work Items</div>
                <div className="text-2xl font-bold text-emerald-800">{summary?.work_count || 0}</div>
              </div>
              <div className="text-center border-l pl-8">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Sanctioned Budget</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.total_sanctioned || 0)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Revised Estimate</div>
                <div className={`text-2xl font-bold ${(summary?.total_revised || 0) > (summary?.total_sanctioned || 0) ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(summary?.total_revised || 0)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Info */}
      <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <User className="w-5 h-5 text-blue-600" />
        <div className="text-sm">
          <span className="font-medium text-blue-900">
            {isECW ? 'Case Worker' : isPS ? 'Supervisor' : 'Admin'} Mode:
          </span>
          <span className="text-blue-700 ml-2">
            {isECW && 'You can edit quantities and submit estimates for approval.'}
            {isPS && 'You can approve or reject submitted estimates.'}
            {!isECW && !isPS && 'Full access to all estimates.'}
          </span>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

      {/* Works by Plantation */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-muted-foreground">Loading works from sanctioned APOs...</p>
          </CardContent>
        </Card>
      ) : works.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Sanctioned Works Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {summary?.message || 'There are no sanctioned APOs in your jurisdiction yet. APOs must be approved by the Division Manager before work estimates can be managed.'}
            </p>
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 max-w-md mx-auto">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Only works from <strong>SANCTIONED</strong> (MD-approved) APOs appear here. 
                Draft or pending APOs are not visible in the Estimates Dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(worksByPlantation).map(([pltId, group]) => (
            <Card key={pltId}>
              <CardHeader className="pb-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <TreePine className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{group.plantation_name}</CardTitle>
                      <CardDescription>Plantation ID: {group.plantation_id} • {group.items.length} work item(s)</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">SANCTIONED</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Activity / Work Item</TableHead>
                      <TableHead>Estimate Status</TableHead>
                      <TableHead className="text-right">Sanctioned Qty</TableHead>
                      <TableHead className="text-right">Revised Qty</TableHead>
                      <TableHead className="text-right">Est. Cost (₹)</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map(item => {
                      const currentQty = item.revised_qty !== null ? item.revised_qty : item.sanctioned_qty
                      const cost = currentQty * item.sanctioned_rate
                      const isEditable = isECW && ['DRAFT', 'REJECTED'].includes(item.estimate_status)

                      const statusConfig = {
                        DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock },
                        SUBMITTED: { color: 'bg-amber-100 text-amber-800', icon: Send },
                        APPROVED: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
                        REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle }
                      }
                      const status = statusConfig[item.estimate_status] || statusConfig.DRAFT
                      const StatusIcon = status.icon

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-medium">{item.activity_name}</div>
                            <div className="text-xs text-muted-foreground">{item.unit} @ {formatCurrency(item.sanctioned_rate)}/unit</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${status.color} gap-1`}>
                              <StatusIcon className="w-3 h-3" />
                              {item.estimate_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{item.sanctioned_qty}</TableCell>
                          <TableCell className="text-right">
                            {isEditable ? (
                              <Input 
                                type="number" 
                                defaultValue={currentQty} 
                                className="w-24 text-right"
                                onBlur={(e) => handleUpdateQty(item.id, e.target.value)}
                              />
                            ) : (
                              <span className="font-mono font-medium">{currentQty}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(cost)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              {isECW && ['DRAFT', 'REJECTED'].includes(item.estimate_status) && (
                                <Button size="sm" onClick={() => handleStatusChange(item.id, 'SUBMITTED')} className="bg-blue-600 hover:bg-blue-700">
                                  <Send className="w-3 h-3 mr-1" /> Submit
                                </Button>
                              )}
                              {isPS && item.estimate_status === 'SUBMITTED' && (
                                <>
                                  <Button size="sm" onClick={() => handleStatusChange(item.id, 'APPROVED')} className="bg-emerald-600 hover:bg-emerald-700">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleStatusChange(item.id, 'REJECTED')}>
                                    <XCircle className="w-3 h-3 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                              {item.estimate_status === 'APPROVED' && (
                                <span className="text-xs text-emerald-600 font-medium">✓ Approved</span>
                              )}
                              {item.estimate_status === 'SUBMITTED' && isECW && (
                                <span className="text-xs text-amber-600">Pending Review</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
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
    if (token) {
      api.setToken(token)
      api.get('/auth/me').then(u => setUser(u)).catch(() => { api.setToken(null) }).finally(() => setAuthChecked(true))
    } else {
      setAuthChecked(true)
    }
  }, [])

  const handleLogout = () => {
    api.post('/auth/logout').catch(() => { })
    api.setToken(null)
    setUser(null)
    setView('dashboard')
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={(u) => { 
      setUser(u)
      // Set default view based on role
      if (u.role === 'CASE_WORKER_ESTIMATES' || u.role === 'PLANTATION_SUPERVISOR') {
        setView('estimates')
      } else {
        setView('dashboard')
      }
    }} />
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard user={user} />
      case 'plantations': return <PlantationsView user={user} setView={setView} setSelectedPlantation={setSelectedPlantation} />
      case 'plantation-detail': return selectedPlantation ? <PlantationDetail plantation={selectedPlantation} setView={setView} /> : null
      case 'apo-wizard': return <ApoWizard user={user} setView={setView} />
      case 'apo-list': return <ApoList user={user} setView={setView} setSelectedApo={setSelectedApo} />
      case 'apo-detail': return selectedApo ? <ApoDetail apoId={selectedApo} user={user} setView={setView} /> : null
      case 'norms': return <NormsView user={user} />
      case 'estimates': return <EstimatesView user={user} />
      default: 
        // Default to estimates for ECW/PS users, dashboard for others
        if (user.role === 'CASE_WORKER_ESTIMATES' || user.role === 'PLANTATION_SUPERVISOR') {
          return <EstimatesView user={user} />
        }
        return <Dashboard user={user} />
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={user} currentView={view} setView={setView} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  )
}

export default App
