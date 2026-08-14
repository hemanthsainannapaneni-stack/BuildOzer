import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/compliance?siteId=xxx — fetch compliance data for a specific site
// GET /api/compliance — fetch aggregated compliance data across all sites
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      // Return aggregated compliance data across ALL sites
      const [facilities, securityItems, medInfraItems] = await Promise.all([
        db.siteFacility.findMany({ orderBy: { item: 'asc' } }),
        db.siteSecurityItem.findMany({ orderBy: { item: 'asc' } }),
        db.medInfraItem.findMany({ orderBy: { item: 'asc' } }),
      ])

      // Aggregate: group by item name, compute majority status
      const aggregate = <T extends { item: string; status: string; siteId: string }>(items: T[]) => {
        const map = new Map<string, { item: string; compliant: number; nonCompliant: number; pending: number; total: number; lastInspectionDate: string | null; inspector: string | null }>()
        for (const i of items) {
          const existing = map.get(i.item)
          if (existing) {
            if (i.status === 'Compliant') existing.compliant++
            else if (i.status === 'NonCompliant') existing.nonCompliant++
            else existing.pending++
            existing.total++
          } else {
            map.set(i.item, {
              item: i.item,
              compliant: i.status === 'Compliant' ? 1 : 0,
              nonCompliant: i.status === 'NonCompliant' ? 1 : 0,
              pending: i.status === 'Pending' ? 1 : 0,
              total: 1,
              lastInspectionDate: i.lastInspectionDate,
              inspector: i.inspector,
            })
          }
        }
        return Array.from(map.values()).map((v) => {
          // Majority status
          let status = 'Pending'
          if (v.compliant >= v.nonCompliant && v.compliant >= v.pending) status = 'Compliant'
          else if (v.nonCompliant > v.compliant && v.nonCompliant >= v.pending) status = 'NonCompliant'
          return {
            id: `agg-${v.item}`,
            siteId: '__all__',
            item: v.item,
            status,
            lastInspectionDate: v.lastInspectionDate,
            inspector: v.inspector,
            remarks: null,
            photos: null,
            records: null,
            usageDetails: null,
            // Extra aggregate fields
            totalSites: v.total,
            compliantSites: v.compliant,
            nonCompliantSites: v.nonCompliant,
            pendingSites: v.pending,
          } as any
        })
      }

      const totals = {
        facilities: { total: facilities.length, compliant: facilities.filter((i) => i.status === 'Compliant').length },
        security: { total: securityItems.length, compliant: securityItems.filter((i) => i.status === 'Compliant').length },
        medInfra: { total: medInfraItems.length, compliant: medInfraItems.filter((i) => i.status === 'Compliant').length },
      }
      return NextResponse.json({
        facilities: aggregate(facilities),
        securityItems: aggregate(securityItems),
        medInfraItems: aggregate(medInfraItems),
        totals,
        aggregated: true,
      })
    }

    const facilities = await db.siteFacility.findMany({
      where: { siteId },
      orderBy: { item: 'asc' },
    })
    const securityItems = await db.siteSecurityItem.findMany({
      where: { siteId },
      orderBy: { item: 'asc' },
    })
    const medInfraItems = await db.medInfraItem.findMany({
      where: { siteId },
      orderBy: { item: 'asc' },
    })

    return NextResponse.json({ facilities, securityItems, medInfraItems, aggregated: false })
  } catch (error) {
    console.error('GET /api/compliance error:', error)
    return NextResponse.json({ error: 'Failed to fetch compliance data' }, { status: 500 })
  }
}

// POST /api/compliance — create new item or add inspection record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, type, siteId, item, status: itemStatus, remarks, inspector, details, compliancePct, lastInspectionDate, record, itemId, photos, usageDetails } = body

    // Action: 'addRecord' appends an inspection record to an existing item
    if (action === 'addRecord' && itemId) {
      const modelMap: Record<string, 'siteFacility' | 'siteSecurityItem' | 'medInfraItem'> = {
        facility: 'siteFacility',
        security: 'siteSecurityItem',
        medinfra: 'medInfraItem',
      }
      const modelKey = modelMap[type]
      if (!modelKey) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

      const existing = await (db[modelKey] as any).findUnique({ where: { id: itemId } })
      if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

      const existingRecords = existing.records ? JSON.parse(existing.records) : []
      existingRecords.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: record?.date || new Date().toISOString().split('T')[0],
        inspector: record?.inspector || '',
        status: record?.status || 'Compliant',
        remarks: record?.remarks || '',
        photosCount: record?.photosCount || 0,
        createdAt: new Date().toISOString(),
      })

      const result = await (db[modelKey] as any).update({
        where: { id: itemId },
        data: {
          status: itemStatus || existing.status,
          lastInspectionDate: new Date(),
          inspector: record?.inspector || existing.inspector,
          remarks: record?.remarks || existing.remarks,
          records: JSON.stringify(existingRecords),
        },
      })
      return NextResponse.json({ data: result }, { status: 201 })
    }

    // Action: 'create' creates a new compliance item
    if (!type || !siteId || !item) {
      return NextResponse.json({ error: 'type, siteId, and item are required' }, { status: 400 })
    }

    const site = await db.site.findUnique({ where: { id: siteId } })
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    let result

    if (type === 'facility') {
      result = await db.siteFacility.create({
        data: {
          siteId, item,
          status: itemStatus || 'Compliant',
          lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate) : null,
          inspector: inspector || null,
          remarks: remarks || null,
          photos: photos ? JSON.stringify(photos) : null,
          records: null,
          usageDetails: usageDetails ? JSON.stringify(usageDetails) : null,
        },
      })
    } else if (type === 'security') {
      result = await db.siteSecurityItem.create({
        data: {
          siteId, item,
          status: itemStatus || 'Compliant',
          compliancePct: compliancePct ?? 100,
          lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate) : null,
          inspector: inspector || null,
          remarks: remarks || null,
          photos: photos ? JSON.stringify(photos) : null,
          records: null,
          usageDetails: usageDetails ? JSON.stringify(usageDetails) : null,
        },
      })
    } else if (type === 'medinfra') {
      result = await db.medInfraItem.create({
        data: {
          siteId, item,
          status: itemStatus || 'Compliant',
          details: details || null,
          lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate) : null,
          inspector: inspector || null,
          remarks: remarks || null,
          photos: photos ? JSON.stringify(photos) : null,
          records: null,
          usageDetails: usageDetails ? JSON.stringify(usageDetails) : null,
        },
      })
    } else {
      return NextResponse.json({ error: 'type must be facility, security, or medinfra' }, { status: 400 })
    }

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    console.error('POST /api/compliance error:', error)
    return NextResponse.json({ error: 'Failed to create compliance item' }, { status: 500 })
  }
}

// PUT /api/compliance — update existing item (status, photos, usage details)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, type, status: itemStatus, photos, usageDetails, remarks, inspector } = body

    if (!id || !type) {
      return NextResponse.json({ error: 'id and type are required' }, { status: 400 })
    }

    const modelMap: Record<string, 'siteFacility' | 'siteSecurityItem' | 'medInfraItem'> = {
      facility: 'siteFacility',
      security: 'siteSecurityItem',
      medinfra: 'medInfraItem',
    }
    const modelKey = modelMap[type]
    if (!modelKey) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

    const updateData: Record<string, unknown> = {}
    if (itemStatus !== undefined) updateData.status = itemStatus
    if (photos !== undefined) updateData.photos = JSON.stringify(photos)
    if (usageDetails !== undefined) updateData.usageDetails = JSON.stringify(usageDetails)
    if (remarks !== undefined) updateData.remarks = remarks
    if (inspector !== undefined) updateData.inspector = inspector

    const result = await (db[modelKey] as any).update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('PUT /api/compliance error:', error)
    return NextResponse.json({ error: 'Failed to update compliance item' }, { status: 500 })
  }
}
