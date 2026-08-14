import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/dashboard/recent-activity?type=photos|new-entry|medical|training|incident|all
// Returns a unified ActivityItem[] array used by the dashboard's "Recent Activity" panel.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') || 'photos').toLowerCase()

    type ActivityItem = {
      id: string
      kind: 'photo' | 'entry' | 'medical' | 'training' | 'incident'
      title: string
      subtitle: string
      location?: string
      timestamp: string
      photo?: string | null
      meta?: Record<string, string>
    }

    const items: ActivityItem[] = []

    if (type === 'photos' || type === 'all') {
      // Workers with profile photos
      const workersWithPhotos = await db.worker.findMany({
        where: { profilePhotoPath: { not: null } },
        take: 25,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          employeeNumber: true,
          profilePhotoPath: true,
          createdAt: true,
          contractor: { select: { name: true } },
          site: { select: { name: true } },
        },
      })
      for (const w of workersWithPhotos) {
        if (w.profilePhotoPath) {
          items.push({
            id: `wphoto-${w.id}`,
            kind: 'photo',
            title: w.fullName,
            subtitle: 'Worker profile photo',
            location: [w.contractor?.name, w.site?.name].filter(Boolean).join(' • ') || '—',
            timestamp: w.createdAt.toISOString(),
            photo: w.profilePhotoPath,
            meta: { EmpNo: w.employeeNumber },
          })
        }
      }
      // Medical photos
      const medicalPhotos = await db.medicalRecord.findMany({
        where: { photos: { not: null } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          examinationType: true,
          result: true,
          examinationDate: true,
          photos: true,
          createdAt: true,
          worker: {
            select: { id: true, fullName: true, employeeNumber: true, contractor: { select: { name: true } }, site: { select: { name: true } } },
          },
        },
      })
      for (const m of medicalPhotos) {
        let photos: string[] = []
        try { photos = m.photos ? JSON.parse(m.photos) : [] } catch { photos = [] }
        if (photos.length > 0) {
          items.push({
            id: `mphoto-${m.id}`,
            kind: 'photo',
            title: m.worker.fullName,
            subtitle: `Medical exam • ${m.examinationType}`,
            location: [m.worker.contractor?.name, m.worker.site?.name].filter(Boolean).join(' • ') || '—',
            timestamp: m.createdAt.toISOString(),
            photo: photos[0],
            meta: { Result: m.result, EmpNo: m.worker.employeeNumber },
          })
        }
      }
      // Incident photos
      const incidentPhotos = await db.incident.findMany({
        where: { photos: { not: null } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          incidentNumber: true,
          incidentType: true,
          date: true,
          photos: true,
          createdAt: true,
          site: { select: { name: true } },
          contractor: { select: { name: true } },
        },
      })
      for (const inc of incidentPhotos) {
        let photos: string[] = []
        try { photos = inc.photos ? JSON.parse(inc.photos) : [] } catch { photos = [] }
        if (photos.length > 0) {
          items.push({
            id: `iphoto-${inc.id}`,
            kind: 'photo',
            title: inc.incidentNumber,
            subtitle: `Incident • ${inc.incidentType}`,
            location: [inc.contractor?.name, inc.site?.name].filter(Boolean).join(' • ') || '—',
            timestamp: inc.createdAt.toISOString(),
            photo: photos[0],
            meta: { Type: inc.incidentType },
          })
        }
      }
    }

    if (type === 'new-entry' || type === 'all') {
      const recentWorkers = await db.worker.findMany({
        take: 25,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          employeeNumber: true,
          designation: { select: { name: true } },
          contractor: { select: { name: true } },
          site: { select: { name: true } },
          createdAt: true,
          profilePhotoPath: true,
        },
      })
      for (const w of recentWorkers) {
        items.push({
          id: `entry-${w.id}`,
          kind: 'entry',
          title: w.fullName,
          subtitle: `New worker • ${w.designation?.name ?? '—'}`,
          location: [w.contractor?.name, w.site?.name].filter(Boolean).join(' • ') || '—',
          timestamp: w.createdAt.toISOString(),
          photo: w.profilePhotoPath ?? null,
          meta: { EmpNo: w.employeeNumber },
        })
      }
    }

    if (type === 'medical' || type === 'all') {
      const recentMedical = await db.medicalRecord.findMany({
        take: 25,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          examinationType: true,
          result: true,
          examinationDate: true,
          createdAt: true,
          worker: {
            select: { id: true, fullName: true, employeeNumber: true, contractor: { select: { name: true } }, site: { select: { name: true } } },
          },
        },
      })
      for (const m of recentMedical) {
        items.push({
          id: `med-${m.id}`,
          kind: 'medical',
          title: m.worker.fullName,
          subtitle: `Medical • ${m.examinationType}`,
          location: [m.worker.contractor?.name, m.worker.site?.name].filter(Boolean).join(' • ') || '—',
          timestamp: m.createdAt.toISOString(),
          photo: null,
          meta: { Result: m.result, EmpNo: m.worker.employeeNumber },
        })
      }
    }

    if (type === 'training' || type === 'all') {
      const recentTraining = await db.trainingRecord.findMany({
        take: 25,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          trainingTitle: true,
          trainingType: true,
          status: true,
          dateConducted: true,
          createdAt: true,
          worker: {
            select: { id: true, fullName: true, employeeNumber: true, contractor: { select: { name: true } }, site: { select: { name: true } } },
          },
        },
      })
      for (const t of recentTraining) {
        items.push({
          id: `trn-${t.id}`,
          kind: 'training',
          title: t.worker.fullName,
          subtitle: `Training • ${t.trainingTitle}`,
          location: [t.worker.contractor?.name, t.worker.site?.name].filter(Boolean).join(' • ') || '—',
          timestamp: t.createdAt.toISOString(),
          photo: null,
          meta: { Status: t.status, Type: t.trainingType },
        })
      }
    }

    if (type === 'incident' || type === 'all') {
      const recentIncidents = await db.incident.findMany({
        take: 25,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          incidentNumber: true,
          incidentType: true,
          severity: true,
          status: true,
          date: true,
          createdAt: true,
          site: { select: { name: true } },
          contractor: { select: { name: true } },
        },
      })
      for (const inc of recentIncidents) {
        items.push({
          id: `inc-${inc.id}`,
          kind: 'incident',
          title: inc.incidentNumber,
          subtitle: `Incident • ${inc.incidentType}`,
          location: [inc.contractor?.name, inc.site?.name].filter(Boolean).join(' • ') || '—',
          timestamp: inc.createdAt.toISOString(),
          photo: null,
          meta: { Severity: inc.severity, Status: inc.status },
        })
      }
    }

    // Sort by timestamp desc
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Ensure at least 25 items exist for demo purposes
    if (items.length < 25) {
      const needed = 25 - items.length
      const kinds = type === 'all' ? ['photo', 'entry', 'medical', 'training', 'incident'] : [type === 'photos' ? 'photo' : type === 'new-entry' ? 'entry' : type]
      
      const firstNames = ['Rajesh', 'Sunita', 'Mohammed', 'Amit', 'Priya', 'Suresh', 'Anita', 'Rahul', 'Sneha', 'Vikram']
      const lastNames = ['Kumar', 'Devi', 'Ali', 'Singh', 'Patel', 'Sharma', 'Reddy', 'Verma', 'Das', 'Rao']
      const contractors = ['L&T Construction', 'Tata Projects', 'Afcons', 'NCC', 'GMR']
      
      for (let i = 0; i < needed; i++) {
        const kind = kinds[Math.floor(Math.random() * kinds.length)] as any
        const title = kind === 'incident' ? `INC-00${Math.floor(Math.random() * 90) + 10}` : `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
        const subtitle = kind === 'photo' ? 'Worker profile photo' : kind === 'entry' ? 'New worker registration' : kind === 'medical' ? 'Medical exam • Routine' : kind === 'training' ? 'Training • Safety' : 'Incident • Minor'
        
        items.push({
          id: `demo-${kind}-${Date.now()}-${i}`,
          kind: kind,
          title,
          subtitle,
          location: `${contractors[Math.floor(Math.random() * contractors.length)]} • Site ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
          timestamp: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
          photo: null,
          meta: { Demo: 'true' },
        })
      }
    }

    return NextResponse.json({ items, count: items.length })
  } catch (error) {
    console.error('GET /api/dashboard/recent-activity error:', error)
    return NextResponse.json({ error: 'Failed to fetch recent activity' }, { status: 500 })
  }
}
