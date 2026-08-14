'use client'

import { useState } from 'react'
import { useAuthStore, type UserRole } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Eye, Users, Scale, Crown, MapPin, LogIn, ChevronDown, ChevronUp, User, Lock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface SiteOption {
  id: string
  name: string
  code: string
}

const demoCredentials: { role: UserRole; icon: typeof Shield; label: string; username: string; password: string; desc: string }[] = [
  { role: 'ADMIN', icon: Crown, label: 'Administrator', username: 'admin', password: 'admin@123', desc: 'Full system access' },
  { role: 'SAFETY_OFFICER', icon: Shield, label: 'Safety Officer', username: 'rajesh.patil', password: 'safety@123', desc: 'Safety & compliance' },
  { role: 'PMC', icon: Eye, label: 'PMC', username: 'anil.deshmukh', password: 'pmc@123', desc: 'Project monitoring' },
  { role: 'HR_COORDINATOR', icon: Users, label: 'HR Coordinator', username: 'meera.joshi', password: 'hr@123', desc: 'HR & payroll' },
  { role: 'LEGAL_ADVISOR', icon: Scale, label: 'Legal Advisor', username: 'vikram.sharma', password: 'legal@123', desc: 'Legal compliance' },
]

export function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [sites, setSites] = useState<SiteOption[]>([])
  const [sitesLoading, setSitesLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const login = useAuthStore(s => s.login)

  const fetchSites = () => {
    setSitesLoading(true)
    fetch('/api/sites?limit=100')
      .then(r => r.ok ? r.json() : [])
      .then((data: SiteOption[]) => {
        setSites(data)
        if (data.length > 0) {
          setSelectedSiteId(data[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setSitesLoading(false))
  }

  const handleDemoSelect = (demo: typeof demoCredentials[number]) => {
    setSelectedRole(demo.role)
    setUsername(demo.username)
    setPassword(demo.password)
    if (demo.role === 'PMC' && sites.length === 0) {
      fetchSites()
    }
  }

  const handleLogin = () => {
    const role = selectedRole || 'SAFETY_OFFICER'
    const names: Record<UserRole, string> = {
      ADMIN: 'Admin',
      SAFETY_OFFICER: 'Rajesh Patil',
      PMC: 'Anil Deshmukh',
      HR_COORDINATOR: 'Meera Joshi',
      LEGAL_ADVISOR: 'Vikram Sharma',
    }
    const contractorMap: Record<UserRole, { id: string; name: string; siteId?: string }> = {
      ADMIN: { id: 'all', name: 'All Contractors' },
      SAFETY_OFFICER: { id: 'demo', name: 'Clove Constructions Pvt. Ltd.' },
      PMC: { id: 'all', name: 'All Contractors', siteId: selectedSiteId || undefined },
      HR_COORDINATOR: { id: 'demo', name: 'Clove Constructions Pvt. Ltd.' },
      LEGAL_ADVISOR: { id: 'all', name: 'All Contractors' },
    }
    const c = contractorMap[role]
    login(names[role], role, c.id, c.name, c.siteId)
  }

  const pmcSelected = selectedRole === 'PMC'
  const canLogin = username.trim().length > 0 && password.trim().length > 0 && selectedRole !== null

  return (
    <div className="relative min-h-screen flex items-stretch overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/login-bg.jpg)' }}
      />
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />

      {/* Right-aligned content */}
      <div className="relative z-10 ml-auto flex flex-col items-center justify-center gap-5 p-6 lg:p-12 lg:pr-16 w-full max-w-sm">
        {/* Logo on top */}
        <Image
          src="/buildozer-login-logo.png"
          alt="Buildozer Logo"
          width={360}
          height={360}
          className="rounded-2xl"
          priority
        />

        {/* Login card */}
        <Card className="w-full bg-white/80 backdrop-blur-sm border-white/50">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base">Sign In</CardTitle>
            <CardDescription className="text-xs">Enter your credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium">Username</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>

            {/* Demo Credentials Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowDemo(d => !d)}
            >
              {showDemo ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
              Demo Credentials
            </Button>

            {/* Demo Credentials List */}
            {showDemo && (
              <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                {demoCredentials.map((demo) => {
                  const Icon = demo.icon
                  const isSelected = selectedRole === demo.role
                  return (
                    <button
                      key={demo.role}
                      onClick={() => handleDemoSelect(demo)}
                      className={cn(
                        'w-full text-left p-2 rounded-lg border-2 transition-all duration-200',
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/10'
                          : 'border-transparent bg-muted/50 hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'rounded-md p-1.5',
                          isSelected ? 'bg-teal-100 dark:bg-teal-900/30' : 'bg-background'
                        )}>
                          <Icon className={cn(
                            'h-3.5 w-3.5',
                            isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'
                          )} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'font-semibold text-xs leading-tight',
                            isSelected ? 'text-teal-700 dark:text-teal-300' : ''
                          )}>{demo.label}</p>
                          <p className="text-[10px] text-muted-foreground">{demo.desc}</p>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] text-teal-600 font-medium shrink-0">✓</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* PMC Site Selector */}
            {pmcSelected && (
              <div className="p-2.5 rounded-lg border border-teal-200 bg-teal-50/30 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-teal-600" />
                  <Label className="text-[11px] font-medium text-teal-700">Select Site</Label>
                </div>
                {sitesLoading ? (
                  <Skeleton className="h-8 w-full rounded-md" />
                ) : sites.length > 0 ? (
                  <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map(site => (
                        <SelectItem key={site.id} value={site.id} className="text-xs">
                          {site.name} ({site.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No sites available</p>
                )}
              </div>
            )}

            {/* Login button */}
            <Button className="w-full h-9 mt-1" disabled={!canLogin} onClick={handleLogin}>
              <LogIn className="h-3.5 w-3.5 mr-1.5" />
              Log in
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
