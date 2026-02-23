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
import { Checkbox } from '@/components/ui/checkbox'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  TreePine, LogIn, LogOut, LayoutDashboard, FileText, TreesIcon, Settings, ChevronRight,
  Plus, Eye, CheckCircle, XCircle, Clock, AlertTriangle, Leaf, MapPin, Calendar,
  IndianRupee, TrendingUp, ClipboardList, Send, ArrowLeft, RefreshCw, ChevronDown, ChevronUp,
  User, Shield, Building2, Layers, BookOpen, Trash2, Upload, File, X, Bell, Search,
  Users, BarChart3, Wallet, FolderTree
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
  // Special method for file uploads (no Content-Type header - browser sets it automatically with boundary)
  async uploadFile(url, formData) {
    const token = this.getToken()
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`/api${url}`, { method: 'POST', headers, body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'Upload failed')
    return data
  },
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
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)

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
    { email: 'rfo.dharwad@kfdc.in', role: 'Range Forest Officer', division: 'Dharwad' },
    { email: 'dcf.dharwad@kfdc.in', role: 'Deputy Conservator', division: 'Dharwad' },
    { email: 'ed@kfdc.in', role: 'Executive Director', division: 'All' },
    { email: 'md@kfdc.in', role: 'Managing Director', division: 'All' },
  ]

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden">
      {/* Left Side - Login Form Panel */}
      <div 
        className="w-full lg:w-[50%] min-h-screen relative z-10"
        style={{
          background: 'linear-gradient(145deg, #1a5868 0%, #2a7585 40%, #3d8a98 100%)',
          clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)'
        }}
      >
        {/* Initialize Demo Data Button */}
        <div className="absolute top-6 right-20 z-20">
          <button 
            onClick={handleSeed}
            disabled={seeding}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            {seeding ? 'Initializing...' : 'Initialize Demo Data'}
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center justify-center min-h-screen px-12 lg:px-20 py-12">
          {/* Log In Title - Elegant serif font style */}
          <h1 className="text-5xl font-light text-white mb-10 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
            Log In
          </h1>
          
          {/* Logo Image - Blends with Background */}
          <div className="relative mb-6">
            <img 
              src="/kfdc-mis-logo.png" 
              alt="KFDC MIS Logo" 
              className="w-52 h-52 object-contain rounded-2xl"
              style={{ 
                filter: 'drop-shadow(0 0 50px rgba(45, 212, 191, 0.2))',
              }}
            />
          </div>
          
          {/* KFDC MIS Text */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-teal-300 tracking-widest">KFDC MIS</h2>
            <p className="text-sm text-white/50 mt-1 tracking-wide">Management Information System</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="w-full max-w-xs space-y-8">
            {/* Email Field */}
            <div>
              <label className="text-white/80 text-sm tracking-wide block mb-2">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                className="w-full bg-transparent border-0 border-b-2 border-white/30 focus:border-teal-400 text-white py-2 outline-none transition-all duration-300 placeholder:text-white/40"
                placeholder="your.name@kfdc.in"
              />
            </div>
            
            {/* Password Field */}
            <div>
              <label className="text-white/80 text-sm tracking-wide block mb-2">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                className="w-full bg-transparent border-0 border-b-2 border-white/30 focus:border-teal-400 text-white py-2 outline-none transition-all duration-300 placeholder:text-white/40"
                placeholder="Enter your password"
              />
            </div>

            {error && <p className="text-sm text-red-400 py-2">{error}</p>}
            
            {/* Login Button */}
            <Button 
              type="submit" 
              className="w-full h-14 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white font-bold text-base rounded-md shadow-xl shadow-green-600/30 mt-6 transition-all duration-300 border-2 border-green-400/30" 
              disabled={loading}
            >
              {loading ? 'LOGGING IN...' : 'LOG IN'}
            </Button>
          </form>

          {/* Demo Accounts */}
          <div className="w-full max-w-xs mt-8">
            <button 
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              className="w-full flex items-center justify-between text-sm text-white/50 hover:text-white/70 transition-colors"
            >
              <span>Demo Accounts (password: pass123)</span>
              {showDemoAccounts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showDemoAccounts && (
              <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
                {demoAccounts.map(acc => (
                  <button 
                    key={acc.email} 
                    onClick={() => { setEmail(acc.email); setPassword('pass123') }}
                    className="w-full flex items-center justify-between p-2 rounded border border-white/10 hover:bg-white/5 transition-colors text-left text-sm"
                  >
                    <div>
                      <div className="text-white/80">{acc.role}</div>
                      <div className="text-xs text-white/40">{acc.email}</div>
                    </div>
                    <span className="text-xs text-teal-400">{acc.division}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Full HD Forest Image */}
      <div 
        className="hidden lg:block absolute top-0 right-0 w-[65%] h-full"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/29697943/pexels-photo-29697943.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=1920&w=2880')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
        }}
      >
        {/* Gradient overlay for smooth blending */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(29, 78, 95, 0.95) 0%, rgba(29, 78, 95, 0.4) 15%, transparent 35%)',
          }}
        />
      </div>
    </div>
  )
}

// ===================== SIDEBAR =====================
function Sidebar({ user, currentView, setView, onLogout }) {
  const [expandedMenu, setExpandedMenu] = useState(null)
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['RO', 'DM', 'ADMIN'] },
    { id: 'plantations', label: 'Plantations', icon: TreePine, roles: ['RO', 'DM', 'ADMIN'] },
    { id: 'apo-list', label: 'APO Management', icon: FileText, roles: ['RO', 'DM', 'ADMIN'] },
    { id: 'apo-wizard', label: 'Create APO', icon: Plus, roles: ['RO'] },
    { id: 'norms', label: 'Standard Rate Card', icon: BookOpen, roles: ['RO', 'DM', 'ADMIN'] },
    // Fund Indent: RFO → DCF → ED → MD
    { id: 'fund-indent', label: 'Generate Fund Indent', icon: ClipboardList, roles: ['RFO'] },
    { id: 'fund-indent-approve', label: 'Approve Fund Indent', icon: CheckCircle, roles: ['DCF', 'ED', 'MD'] },
  ]

  const roleLabels = { 
    RO: 'Range Officer', 
    DM: 'Division Manager', 
    ADMIN: 'Admin (HO)',
    RFO: 'Range Forest Officer',
    DCF: 'Deputy Conservator',
    ED: 'Executive Director',
    MD: 'Managing Director'
  }
  
  const roleColors = { 
    RO: 'bg-green-100 text-green-700', 
    DM: 'bg-blue-100 text-blue-700', 
    ADMIN: 'bg-amber-100 text-amber-700',
    RFO: 'bg-cyan-100 text-cyan-700',
    DCF: 'bg-orange-100 text-orange-700',
    ED: 'bg-indigo-100 text-indigo-700',
    MD: 'bg-rose-100 text-rose-700'
  }

  return (
    <div className="w-64 bg-white h-screen flex flex-col border-r border-gray-100">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center">
          <img src="/kfdc-logo.png" alt="KFDC iFMS" className="w-full h-full object-contain" />
        </div>
        <span className="font-semibold text-gray-800 text-lg">KFDC iFMS</span>
      </div>

      {/* Menu Section */}
      <div className="px-4 pt-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Menu</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.filter(n => n.roles.includes(user.role)).map(item => (
          <button 
            key={item.id} 
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
              currentView === item.id
                ? 'bg-green-50 text-green-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {currentView === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-600 rounded-r-full" />
            )}
            <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-green-600' : 'text-gray-400'}`} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* General Section */}
      <div className="px-4 pt-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">General</p>
      </div>
      <div className="px-3 pb-2 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <Settings className="w-5 h-5 text-gray-400" />
          Settings
        </button>
      </div>

      {/* User Profile Card */}
      <div className="p-3">
        <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-green-200">{roleLabels[user.role]}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600/50 hover:bg-green-600/70 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-green-600" />
    </div>
  )
  if (!stats) return <p className="text-muted-foreground p-4">Failed to load dashboard</p>

  const statCards = [
    { label: 'Total Plantations', value: stats.total_plantations, icon: TreePine, color: 'text-green-600', bg: 'bg-green-50', iconBg: 'bg-green-100' },
    { label: 'Total Area', value: `${stats.total_area_ha?.toFixed(1)} Ha`, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
    { label: 'Active APOs', value: stats.sanctioned_apos, icon: FileText, color: 'text-green-600', bg: 'bg-green-50', iconBg: 'bg-green-100' },
    { label: 'Budget Utilized', value: `${stats.utilization_pct}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
  ]

  const pieData = [
    { name: 'Sanctioned', value: stats.sanctioned_apos, color: '#2563eb' },
    { name: 'Utilized', value: stats.pending_apos || 1, color: '#16a34a' },
    { name: 'APO Status', value: stats.draft_apos || 1, color: '#166534' },
  ].filter(d => d.value > 0)

  // Forest tree silhouette SVG for header background - UPRIGHT TREES
  const ForestHeader = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg viewBox="0 0 1200 200" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
        {/* Upright pine trees - pointing UP */}
        <g fill="#166534" opacity="0.15">
          {/* Back row - smaller, lighter */}
          {[50, 120, 190, 260, 330, 400, 470, 540, 610, 680, 750, 820, 890, 960, 1030, 1100].map((x, i) => (
            <polygon key={`back-${i}`} points={`${x},200 ${x-15},200 ${x-8},140 ${x-12},140 ${x-5},90 ${x-10},90 ${x},50 ${x+10},90 ${x+5},90 ${x+12},140 ${x+8},140 ${x+15},200`} 
              style={{ opacity: 0.4 + (i % 3) * 0.1 }} />
          ))}
        </g>
        <g fill="#166534" opacity="0.25">
          {/* Middle row */}
          {[80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880, 960, 1040, 1120].map((x, i) => (
            <polygon key={`mid-${i}`} points={`${x},200 ${x-18},200 ${x-10},130 ${x-15},130 ${x-6},70 ${x-12},70 ${x},20 ${x+12},70 ${x+6},70 ${x+15},130 ${x+10},130 ${x+18},200`} 
              style={{ opacity: 0.5 + (i % 2) * 0.2 }} />
          ))}
        </g>
        <g fill="#166534" opacity="0.35">
          {/* Front row - larger, darker */}
          {[30, 130, 230, 330, 430, 530, 630, 730, 830, 930, 1030, 1130].map((x, i) => (
            <polygon key={`front-${i}`} points={`${x},200 ${x-22},200 ${x-12},120 ${x-18},120 ${x-8},60 ${x-14},60 ${x},10 ${x+14},60 ${x+8},60 ${x+18},120 ${x+12},120 ${x+22},200`} 
              style={{ opacity: 0.6 + (i % 2) * 0.15 }} />
          ))}
        </g>
      </svg>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with Forest Background */}
      <div className="relative bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 overflow-hidden">
        <ForestHeader />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 bg-white/80">
              <Calendar className="w-4 h-4" />
              FY 2026-27
            </Button>
            <Button variant="outline" size="icon" className="relative bg-white/80">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center">3</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="border shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-800">{s.value}</p>
                </div>
                <div className={`w-12 h-12 ${s.iconBg} rounded-xl flex items-center justify-center`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Chart - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Budget Statistics</CardTitle>
                <CardDescription>Sanctioned vs Utilized Amount</CardDescription>
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="planting">Planting</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-xs text-gray-600">Sanctioned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-xs text-gray-600">Utilized Amount</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stats.budget_chart?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.budget_chart} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="sanctioned" name="Sanctioned" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" name="Utilized" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No budget data available yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* APO Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">APO Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 w-full mt-2">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 bg-green-50 border-green-200 hover:bg-green-100">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <TreePine className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-green-800">Total Plantations</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-800">Recent Actions</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent APOs */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent APOs</CardTitle>
              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                Reset APOs <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recent_apos?.slice(0, 3).map((apo, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{apo.plantation_name || 'Recent APOs'}</p>
                    <p className="text-xs text-gray-500">Past Issue - {apo.financial_year}</p>
                  </div>
                </div>
                <Badge className={STATUS_COLORS[apo.status] || 'bg-gray-100'}>
                  {STATUS_LABELS[apo.status] || apo.status}
                </Badge>
              </div>
            )) || (
              <div className="text-center text-gray-400 py-4">
                No recent APOs found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ===================== PLANTATIONS =====================
function PlantationsView({ user, setView, setSelectedPlantation }) {
  const [plantations, setPlantations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ 
    name: '', 
    species: '', 
    year_of_planting: new Date().getFullYear(), 
    total_area_ha: '', 
    village: '', 
    taluk: '', 
    district: '',
    vidhana_sabha: '',
    lok_sabha: '',
    division: '',
    latitude: '',
    longitude: '',
    work_type: 'FW'
  })

  // Dropdown options from document
  const vidhana_sabha_options = [
    "Chikkamagalore", "Kadur", "Sringeri", "Shivamogga", "Koppa", "Bhadravathi",
    "Sakaleshapura", "Arasikere", "Hassan", "Holenarasipura", "Chennarayapattana",
    "Malur", "Magadi", "Devanahalli", "Shidlagatta", "Srinivasapura", "Mulabagilu",
    "Kanakapura", "Shikaripura", "Sagara", "Soraba", "Thirthahalli", "Shimoga Rural", "Sirigere"
  ]

  const lok_sabha_options = [
    "Udupi-Chikkamagalore", "Shivamogga", "Dharwad", "Haveri", "Belagavi",
    "Bengaluru Rural", "Chikkaballapura", "Kolar"
  ]

  const division_options = [
    "Dharwad", "Belagavi", "Bengaluru", "Chikkaballapura", "Shivamogga", "Chikkamagalore"
  ]

  const species_options = [
    "Eucalyptus pellita", "Eucalyptus", "Acacia springvale", "Acacia auriculiformis",
    "Acacia citriodora", "Corymbia", "Casurina junguniana", "Subabool",
    "Marihal Bamboo", "Dowga Bamboo", "Red sanders", "Teak"
  ]

  const load = useCallback(() => {
    setLoading(true)
    api.get('/plantations').then(setPlantations).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      await api.post('/plantations', form)
      setShowCreate(false)
      setForm({ 
        name: '', species: '', year_of_planting: new Date().getFullYear(), total_area_ha: '', 
        village: '', taluk: '', district: '', vidhana_sabha: '', lok_sabha: '',
        division: '', latitude: '', longitude: '', work_type: 'FW'
      })
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  // Determine work type based on financial year (April-March cycle)
  // FW (Fresh Work) = plantation created in current financial year
  // M (Maintenance) = plantation from any previous financial year
  const getWorkType = (yearOfPlanting) => {
    const now = new Date()
    const month = now.getMonth() // 0-11
    const year = now.getFullYear()
    // Financial year starts in April (month 3)
    // If we're in Jan-Mar, we're still in the previous FY
    const currentFYStartYear = month < 3 ? year - 1 : year
    const plantingYear = parseInt(yearOfPlanting)
    // If plantation year equals or is after the start year of current FY, it's Fresh Work
    return plantingYear >= currentFYStartYear ? 'FW' : 'M'
  }

  // Auto-update work_type when year_of_planting changes
  const handleYearChange = (e) => {
    const newYear = e.target.value
    const autoWorkType = getWorkType(newYear)
    setForm(f => ({ ...f, year_of_planting: newYear, work_type: autoWorkType }))
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Plantation</DialogTitle>
                <DialogDescription>Add a new plantation to your range</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Plantation Name</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Varavanagalavi" />
                  </div>
                  <div>
                    <Label>Species</Label>
                    <Select value={form.species} onValueChange={v => setForm(f => ({ ...f, species: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Species" />
                      </SelectTrigger>
                      <SelectContent>
                        {species_options.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Year, Area, Work Type */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Year of Planting</Label>
                    <Input type="number" value={form.year_of_planting} onChange={handleYearChange} />
                  </div>
                  <div>
                    <Label>Area (Hectares)</Label>
                    <Input type="number" step="0.1" value={form.total_area_ha} onChange={e => setForm(f => ({ ...f, total_area_ha: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Work Type</Label>
                    <Select value={form.work_type} onValueChange={v => setForm(f => ({ ...f, work_type: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FW">Fresh Work (FW)</SelectItem>
                        <SelectItem value="M">Maintenance (M)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Location - Village, Taluk, District */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Village Name</Label>
                    <Input value={form.village} onChange={e => setForm(f => ({ ...f, village: e.target.value }))} placeholder="e.g., Varavanagalavi" />
                  </div>
                  <div>
                    <Label>Taluk</Label>
                    <Input value={form.taluk} onChange={e => setForm(f => ({ ...f, taluk: e.target.value }))} placeholder="e.g., Dharwad" />
                  </div>
                  <div>
                    <Label>District</Label>
                    <Input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g., Dharwad" />
                  </div>
                </div>

                {/* Constituencies and Division */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Division</Label>
                    <Select value={form.division} onValueChange={v => setForm(f => ({ ...f, division: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Division" />
                      </SelectTrigger>
                      <SelectContent>
                        {division_options.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Vidhana Sabha</Label>
                    <Select value={form.vidhana_sabha} onValueChange={v => setForm(f => ({ ...f, vidhana_sabha: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Constituency" />
                      </SelectTrigger>
                      <SelectContent>
                        {vidhana_sabha_options.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lok Sabha</Label>
                    <Select value={form.lok_sabha} onValueChange={v => setForm(f => ({ ...f, lok_sabha: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Constituency" />
                      </SelectTrigger>
                      <SelectContent>
                        {lok_sabha_options.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Lat/Long */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Latitude</Label>
                    <Input type="number" step="0.000001" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="e.g., 15.3647" />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <Input type="number" step="0.000001" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="e.g., 75.1239" />
                  </div>
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
                  <div className="flex items-center gap-2">
                    <Badge className={p.work_type === 'FW' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}>
                      {p.work_type === 'FW' ? 'Fresh Work' : 'Maintenance'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{p.species}</Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-emerald-700 transition-colors">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-1">{p.range_name} | {p.division_name || p.division}</p>
                {p.village && <p className="text-xs text-muted-foreground mb-1">{p.village}{p.taluk ? `, ${p.taluk}` : ''}{p.district ? ` (${p.district})` : ''}</p>}
                {(p.vidhana_sabha || p.lok_sabha) && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {p.vidhana_sabha && <span>VS: {p.vidhana_sabha}</span>}
                    {p.lok_sabha && <span className="ml-2">LS: {p.lok_sabha}</span>}
                  </p>
                )}
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

// ===================== FUND INDENT - RFO VIEW (Generate Fund Indent) =====================
function FundIndentRFOView({ user, setView, setSelectedWork }) {
  const [works, setWorks] = useState([])
  const [myIndents, setMyIndents] = useState([])
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('2026-27')
  const [loading, setLoading] = useState(true)
  const [loadingIndents, setLoadingIndents] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('generate')
  
  // Work Preview Modal State
  const [previewWork, setPreviewWork] = useState(null)
  const [previewActivities, setPreviewActivities] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  const fetchWorks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get(`/fund-indent/works?year=${selectedYear}`)
      setWorks(data.works || [])
      setYears(data.years || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [selectedYear])

  const fetchMyIndents = useCallback(async () => {
    setLoadingIndents(true)
    try {
      const data = await api.get('/fund-indent/pending')
      setMyIndents(data.indents || [])
    } catch (e) {
      console.error(e)
    }
    setLoadingIndents(false)
  }, [])

  useEffect(() => {
    fetchWorks()
    fetchMyIndents()
  }, [fetchWorks, fetchMyIndents])

  // Fetch work activities for preview
  const handleViewWork = async (work) => {
    setPreviewWork(work)
    setLoadingPreview(true)
    try {
      const data = await api.get(`/fund-indent/work-items/${work.apo_id}`)
      setPreviewActivities(data.items || [])
    } catch (e) {
      console.error(e)
      setPreviewActivities([])
    }
    setLoadingPreview(false)
  }

  const closePreview = () => {
    setPreviewWork(null)
    setPreviewActivities([])
  }

  const handleProceedToGFI = () => {
    if (previewWork) {
      setSelectedWork(previewWork.apo_id)
      setView('fund-indent-items')
    }
  }

  const statusColors = {
    PENDING_DCF: 'bg-orange-100 text-orange-800',
    PENDING_ED: 'bg-indigo-100 text-indigo-800',
    PENDING_MD: 'bg-rose-100 text-rose-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    FULLY_REJECTED: 'bg-red-100 text-red-800',
  }

  const statusLabels = {
    PENDING_DCF: 'Pending DCF Review',
    PENDING_ED: 'Pending ED Review',
    PENDING_MD: 'Pending MD Approval',
    APPROVED: 'Approved',
    FULLY_REJECTED: 'Rejected',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fund Indent Management</h1>
          <p className="text-muted-foreground">Generate and track fund indents for sanctioned APO works</p>
        </div>
      </div>

      {/* Work Preview Modal */}
      {previewWork && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Work Details
                  </CardTitle>
                  <CardDescription>Review work activities before generating Fund Indent</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={closePreview}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto p-6">
              {/* Work Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-lg p-4">
                  <p className="text-xs text-emerald-600 font-medium">APO ID</p>
                  <p className="text-lg font-bold text-emerald-800">{previewWork.apo_id}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-medium">Plantation</p>
                  <p className="text-lg font-bold text-blue-800">{previewWork.plantation_name}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-purple-600 font-medium">Financial Year</p>
                  <p className="text-lg font-bold text-purple-800">{previewWork.financial_year}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-xs text-amber-600 font-medium">Total Amount</p>
                  <p className="text-lg font-bold text-amber-800">{formatCurrency(previewWork.total_amount)}</p>
                </div>
              </div>

              {/* Activities Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Activities List ({previewActivities.length} items)
                  </h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>SSR No.</TableHead>
                      <TableHead>Activity Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Rate (₹)</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPreview ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : previewActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No activities found
                        </TableCell>
                      </TableRow>
                    ) : previewActivities.map((activity, idx) => (
                      <TableRow key={activity.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{activity.ssr_no || '-'}</TableCell>
                        <TableCell className="font-medium">{activity.activity_name}</TableCell>
                        <TableCell className="text-right">{activity.sanctioned_qty}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{activity.unit || '-'}</TableCell>
                        <TableCell className="text-right">{activity.sanctioned_rate?.toLocaleString('en-IN') || '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(activity.total_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewActivities.length > 0 && (
                  <div className="bg-muted/30 px-4 py-3 border-t flex justify-end">
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground mr-4">Total:</span>
                      <span className="text-xl font-bold text-emerald-700">
                        {formatCurrency(previewActivities.reduce((sum, a) => sum + (a.total_cost || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            {/* Footer with GFI Button */}
            <div className="border-t bg-muted/20 px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select activities to generate Fund Indent on the next screen
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={closePreview}>
                  Cancel
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2" 
                  onClick={handleProceedToGFI}
                  disabled={previewActivities.length === 0}
                >
                  <Send className="w-4 h-4" />
                  Generate Fund Indent (GFI)
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="generate" className="gap-2"><Plus className="w-4 h-4" /> Generate GFI</TabsTrigger>
          <TabsTrigger value="my-indents" className="gap-2"><FileText className="w-4 h-4" /> My Fund Indents ({myIndents.length})</TabsTrigger>
        </TabsList>

        {/* Generate GFI Tab */}
        <TabsContent value="generate" className="space-y-4">
          {/* Year Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium">Financial Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchWorks} variant="outline" className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

          {/* Works Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Works for Fund Indent</CardTitle>
              <CardDescription>Select a work to view details and generate Fund Indent</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>APO ID</TableHead>
                    <TableHead>Work ID</TableHead>
                    <TableHead>Plantation</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" /></TableCell></TableRow>
                  ) : works.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-12">
                      <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                      <h3 className="text-lg font-medium">No Works Available</h3>
                      <p className="text-sm text-muted-foreground">No sanctioned APO works found for {selectedYear}</p>
                    </TableCell></TableRow>
                  ) : works.map((work, idx) => (
                    <TableRow key={work.apo_id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">{work.apo_id}</TableCell>
                      <TableCell className="font-mono text-xs">WRK-{String(idx + 1).padStart(3, '0')}</TableCell>
                      <TableCell className="font-medium">{work.plantation_name}</TableCell>
                      <TableCell>{work.financial_year}</TableCell>
                      <TableCell className="text-right">{work.work_count}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(work.total_amount)}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => handleViewWork(work)}>
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Fund Indents Tab */}
        <TabsContent value="my-indents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">My Generated Fund Indents</CardTitle>
                  <CardDescription>Track the status of your fund indent requests</CardDescription>
                </div>
                <Button onClick={fetchMyIndents} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${loadingIndents ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>EST ID</TableHead>
                    <TableHead>Plantation</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingIndents ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" /></TableCell></TableRow>
                  ) : myIndents.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-12">
                      <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-lg font-medium">No Fund Indents Yet</h3>
                      <p className="text-sm text-muted-foreground">Generate your first fund indent from the "Generate GFI" tab</p>
                    </TableCell></TableRow>
                  ) : myIndents.map(indent => (
                    <TableRow key={indent.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-medium text-emerald-700">{indent.id}</TableCell>
                      <TableCell>{indent.plantation_name}</TableCell>
                      <TableCell>{indent.financial_year}</TableCell>
                      <TableCell className="text-right">{indent.item_count}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(indent.total_amount)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[indent.status] || 'bg-gray-100'}>
                          {statusLabels[indent.status] || indent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(indent.created_at).toLocaleDateString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Approval Chain Legend */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-8">
                <span className="text-sm font-medium text-muted-foreground">Approval Flow:</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-cyan-100 text-cyan-800">RFO (You)</Badge>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                  <Badge className="bg-orange-100 text-orange-800">DCF</Badge>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                  <Badge className="bg-indigo-100 text-indigo-800">ED</Badge>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                  <Badge className="bg-rose-100 text-rose-800">MD</Badge>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                  <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ===================== FUND INDENT - LINE ITEMS VIEW =====================
function FundIndentItemsView({ user, apoId, setView }) {
  const [items, setItems] = useState([])
  const [apoInfo, setApoInfo] = useState({})
  const [selectedItems, setSelectedItems] = useState({})
  const [itemData, setItemData] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [generatedIndent, setGeneratedIndent] = useState(null) // For confirmation page
  const [uploadingItem, setUploadingItem] = useState(null) // Track which item is uploading

  useEffect(() => {
    if (!apoId) return
    setLoading(true)
    api.get(`/fund-indent/work-items/${apoId}`)
      .then(data => {
        setItems(data.items || [])
        setApoInfo(data)
        // Initialize item data
        const initData = {}
        data.items?.forEach(item => {
          initData[item.id] = {
            period_from: '',
            period_to: '',
            cm_date: '',
            cm_by: user.name,
            fnb_book_no: '',
            fnb_page_no: '',
            fnb_pdf_url: '',
            fnb_pdf_name: '',
          }
        })
        setItemData(initData)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [apoId, user.name])

  const handleItemChange = (itemId, field, value) => {
    setItemData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }))
  }

  const handleSelectAll = (checked) => {
    const newSelected = {}
    items.forEach(item => { newSelected[item.id] = checked })
    setSelectedItems(newSelected)
  }

  // Handle FNB PDF file upload
  const handleFileUpload = async (itemId, file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed for FNB upload')
      return
    }
    
    setUploadingItem(itemId)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('item_id', itemId)
      
      const result = await api.uploadFile('/fund-indent/upload-fnb', formData)
      
      // Update item data with the uploaded file URL
      setItemData(prev => ({
        ...prev,
        [itemId]: { 
          ...prev[itemId], 
          fnb_pdf_url: result.file_url,
          fnb_pdf_name: file.name
        }
      }))
    } catch (e) {
      setError('Failed to upload FNB PDF: ' + e.message)
    } finally {
      setUploadingItem(null)
    }
  }

  // Remove uploaded file
  const handleRemoveFile = (itemId) => {
    setItemData(prev => ({
      ...prev,
      [itemId]: { 
        ...prev[itemId], 
        fnb_pdf_url: '',
        fnb_pdf_name: ''
      }
    }))
  }

  const handleGenerate = async () => {
    const selected = items.filter(item => selectedItems[item.id])
    if (selected.length === 0) {
      setError('Please select at least one item')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        apo_id: apoId,
        items: selected.map(item => ({
          id: item.id,
          ...itemData[item.id]
        }))
      }
      await api.post('/fund-indent/generate', payload)
      setView('fund-indent')
    } catch (e) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  const selectedCount = Object.values(selectedItems).filter(Boolean).length
  const totalAmount = items.filter(item => selectedItems[item.id]).reduce((sum, item) => sum + (item.total_cost || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" size="sm" onClick={() => setView('fund-indent')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Works
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Select Line Items</h1>
          <p className="text-muted-foreground">{apoInfo.plantation_name} • {apoInfo.financial_year}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

      {/* Summary Card */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="py-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-6">
              <div>
                <div className="text-xs text-emerald-600 uppercase">Selected Items</div>
                <div className="text-2xl font-bold text-emerald-800">{selectedCount} / {items.length}</div>
              </div>
              <div>
                <div className="text-xs text-emerald-600 uppercase">Total Amount</div>
                <div className="text-2xl font-bold text-emerald-800">{formatCurrency(totalAmount)}</div>
              </div>
            </div>
            <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleGenerate} disabled={submitting || selectedCount === 0}>
              {submitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Send className="w-4 h-4 mr-2" /> Generate Fund Indent (GFI)</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10">
                  <Checkbox checked={selectedCount === items.length && items.length > 0} onCheckedChange={handleSelectAll} />
                </TableHead>
                <TableHead>SSR</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate (₹)</TableHead>
                <TableHead className="text-right">Amt (₹)</TableHead>
                <TableHead>Period From</TableHead>
                <TableHead>Period To</TableHead>
                <TableHead>CM Date</TableHead>
                <TableHead>CM By</TableHead>
                <TableHead>FNB Book</TableHead>
                <TableHead>FNB Page</TableHead>
                <TableHead>FNB PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={13} className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" /></TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className={selectedItems[item.id] ? 'bg-emerald-50/50' : ''}>
                  <TableCell>
                    <Checkbox checked={!!selectedItems[item.id]} onCheckedChange={(v) => setSelectedItems(prev => ({ ...prev, [item.id]: v }))} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.ssr_no}</TableCell>
                  <TableCell className="font-medium text-sm">{item.activity_name}</TableCell>
                  <TableCell className="text-right">{item.sanctioned_qty}</TableCell>
                  <TableCell className="text-right">{item.sanctioned_rate?.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.total_cost)}</TableCell>
                  <TableCell><Input type="date" className="w-32 text-xs" value={itemData[item.id]?.period_from || ''} onChange={e => handleItemChange(item.id, 'period_from', e.target.value)} disabled={!selectedItems[item.id]} /></TableCell>
                  <TableCell><Input type="date" className="w-32 text-xs" value={itemData[item.id]?.period_to || ''} onChange={e => handleItemChange(item.id, 'period_to', e.target.value)} disabled={!selectedItems[item.id]} /></TableCell>
                  <TableCell><Input type="date" className="w-32 text-xs" value={itemData[item.id]?.cm_date || ''} onChange={e => handleItemChange(item.id, 'cm_date', e.target.value)} disabled={!selectedItems[item.id]} /></TableCell>
                  <TableCell><Input className="w-24 text-xs" value={itemData[item.id]?.cm_by || ''} onChange={e => handleItemChange(item.id, 'cm_by', e.target.value)} disabled={!selectedItems[item.id]} /></TableCell>
                  <TableCell><Input className="w-16 text-xs" value={itemData[item.id]?.fnb_book_no || ''} onChange={e => handleItemChange(item.id, 'fnb_book_no', e.target.value)} disabled={!selectedItems[item.id]} /></TableCell>
                  <TableCell><Input className="w-16 text-xs" value={itemData[item.id]?.fnb_page_no || ''} onChange={e => handleItemChange(item.id, 'fnb_page_no', e.target.value)} disabled={!selectedItems[item.id]} /></TableCell>
                  <TableCell>
                    {/* FNB PDF Upload */}
                    {itemData[item.id]?.fnb_pdf_url ? (
                      <div className="flex items-center gap-1">
                        <a 
                          href={itemData[item.id].fnb_pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs"
                          title={itemData[item.id].fnb_pdf_name}
                        >
                          <File className="w-4 h-4" />
                          <span className="max-w-[60px] truncate">{itemData[item.id].fnb_pdf_name || 'PDF'}</span>
                        </a>
                        <button 
                          onClick={() => handleRemoveFile(item.id)}
                          className="text-red-500 hover:text-red-700 ml-1"
                          title="Remove file"
                          disabled={!selectedItems[item.id]}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className={`cursor-pointer flex items-center justify-center ${!selectedItems[item.id] ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(item.id, e.target.files?.[0])}
                          disabled={!selectedItems[item.id] || uploadingItem === item.id}
                        />
                        {uploadingItem === item.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${selectedItems[item.id] ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                            <Upload className="w-3 h-3" />
                            <span>Upload</span>
                          </div>
                        )}
                      </label>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ===================== FUND INDENT - APPROVAL VIEW (DCF/ED/MD) =====================
function FundIndentApprovalView({ user }) {
  const [indents, setIndents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedIndent, setExpandedIndent] = useState(null)
  const [selectedItems, setSelectedItems] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const fetchIndents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/fund-indent/pending')
      setIndents(data.indents || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIndents()
  }, [fetchIndents])

  const handleApprove = async (estId) => {
    const indent = indents.find(i => i.id === estId)
    if (!indent) return

    const approved = indent.items.filter(item => selectedItems[item.id] !== false).map(i => i.id)
    const rejected = indent.items.filter(item => selectedItems[item.id] === false).map(i => i.id)

    setSubmitting(true)
    try {
      await api.post(`/fund-indent/${estId}/approve`, { approved_items: approved, rejected_items: rejected })
      fetchIndents()
      setSelectedItems({})
      setExpandedIndent(null)
    } catch (e) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  const roleHierarchy = {
    DCF: { label: 'Forward to ED', next: 'ED' },
    ED: { label: 'Forward to MD', next: 'MD' },
    MD: { label: 'Final Approval', next: null }
  }
  const currentRole = roleHierarchy[user.role] || { label: 'Approve', next: null }

  const statusColors = {
    PENDING_DCF: 'bg-orange-100 text-orange-800',
    PENDING_ED: 'bg-indigo-100 text-indigo-800',
    PENDING_MD: 'bg-rose-100 text-rose-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approve Fund Indent (AFI)</h1>
          <p className="text-muted-foreground">Review and approve fund indents from {user.role === 'DCF' ? 'RFO' : user.role === 'ED' ? 'DCF' : 'ED'}</p>
        </div>
        <Button onClick={fetchIndents} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Role Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <div className="text-xs text-blue-600 uppercase font-medium">Your Role</div>
              <div className="text-lg font-bold text-blue-900">{user.role} - {user.name}</div>
              <div className="text-xs text-blue-700">Pending Indents: {indents.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

      {/* Indents List */}
      {loading ? (
        <Card><CardContent className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" /></CardContent></Card>
      ) : indents.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">All Clear!</h3>
          <p className="text-muted-foreground">No pending fund indents for approval</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {indents.map(indent => (
            <Card key={indent.id} className={expandedIndent === indent.id ? 'ring-2 ring-emerald-500' : ''}>
              <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedIndent(expandedIndent === indent.id ? null : indent.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {indent.id}
                        <Badge className={statusColors[indent.status] || 'bg-gray-100'}>{indent.status}</Badge>
                      </CardTitle>
                      <CardDescription>{indent.plantation_name} • {indent.financial_year} • {indent.item_count} items • {formatCurrency(indent.total_amount)}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Created by: {indent.created_by_name}</span>
                    {expandedIndent === indent.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </CardHeader>

              {expandedIndent === indent.id && (
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10">Select</TableHead>
                        <TableHead>Particulars</TableHead>
                        <TableHead>SSR</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>FNB</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indent.items.map(item => (
                        <TableRow key={item.id} className={selectedItems[item.id] === false ? 'bg-red-50 opacity-60' : ''}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedItems[item.id] !== false} 
                              onCheckedChange={(v) => setSelectedItems(prev => ({ ...prev, [item.id]: v }))} 
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.activity_name}</TableCell>
                          <TableCell className="font-mono text-xs">{item.ssr_no}</TableCell>
                          <TableCell className="text-right">{item.sanctioned_qty}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.sanctioned_rate)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(item.total_cost)}</TableCell>
                          <TableCell className="text-xs">{item.period_from} - {item.period_to}</TableCell>
                          <TableCell className="text-xs">Bk:{item.fnb_book_no} Pg:{item.fnb_page_no}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => handleApprove(indent.id)} disabled={submitting}>
                      {submitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /></> : <><CheckCircle className="w-4 h-4 mr-2" /></>}
                      {currentRole.label} (AFI)
                    </Button>
                  </div>
                </CardContent>
              )}
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
  const [selectedWork, setSelectedWork] = useState(null)
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
      if (u.role === 'RFO') {
        setView('fund-indent')
      } else if (['DCF', 'ED', 'MD'].includes(u.role)) {
        setView('fund-indent-approve')
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
      // Fund Indent Views
      case 'fund-indent': return <FundIndentRFOView user={user} setView={setView} setSelectedWork={setSelectedWork} />
      case 'fund-indent-items': return selectedWork ? <FundIndentItemsView user={user} apoId={selectedWork} setView={setView} /> : null
      case 'fund-indent-approve': return <FundIndentApprovalView user={user} />
      default: 
        // Default based on role
        if (user.role === 'RFO') return <FundIndentRFOView user={user} setView={setView} setSelectedWork={setSelectedWork} />
        if (['DCF', 'ED', 'MD'].includes(user.role)) return <FundIndentApprovalView user={user} />
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
