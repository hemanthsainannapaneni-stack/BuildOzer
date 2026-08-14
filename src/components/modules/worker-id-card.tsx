'use client'

import React from 'react'

// ---------- types ----------
interface WorkerCardData {
  id: string
  profilePhotoPath: string | null
  employeeNumber: string
  fullName: string
  dateOfBirth: string
  age: number
  gender: string
  aadhaarNumber: string
  permanentAddress: string
  bloodGroup: string
  qualification: string
  zone: string | null
  designation: { id: string; name: string; category: string }
  contractor: { id: string; name: string; code: string }
  site: { id: string; name: string; code: string } | null
  emergencyContacts: {
    id: string
    name: string
    relationship: string
    phone: string
    isPrimary: boolean
  }[]
}

// ---------- helpers ----------
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function maskAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length < 4) return 'XXXX-XXXX-XXXX'
  const last4 = aadhaar.slice(-4)
  return `XXXX-XXXX-XXXX-${last4}`
}

const primaryContact = (worker: WorkerCardData) =>
  worker.emergencyContacts.find((ec) => ec.isPrimary) || worker.emergencyContacts[0]

// ---------- component ----------
export default function WorkerIdCard({ worker }: { worker: WorkerCardData }) {
  const ec = primaryContact(worker)
  const initials = getInitials(worker.fullName)

  // Compute a reasonable validity date: 1 year from now
  const validUntil = new Date()
  validUntil.setFullYear(validUntil.getFullYear() + 1)
  const validUntilStr = validUntil.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <>
      {/* Print-specific CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          .id-card-print-area,
          .id-card-print-area * {
            visibility: visible !important;
          }
          .id-card-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
          }
          .id-card-container {
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      ` }} />

      <div className="id-card-print-area flex justify-center">
        <div
          className="id-card-container"
          style={{
            width: '340px',
            height: '540px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            fontFamily: 'Inter, system-ui, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Teal gradient strip */}
          <div
            style={{
              height: '8px',
              background: 'linear-gradient(90deg, #0d9488, #14b8a6, #0d9488)',
              flexShrink: 0,
            }}
          />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px 6px',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0d9488', letterSpacing: '-0.5px' }}>
              Buildozer
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', textAlign: 'right', maxWidth: '100px' }}>
              {worker.contractor.name}
            </div>
          </div>

          {/* Photo + Info section */}
          <div style={{ display: 'flex', padding: '12px 16px', gap: '14px' }}>
            {/* Photo */}
            <div style={{ flexShrink: 0 }}>
              {worker.profilePhotoPath && worker.profilePhotoPath.startsWith('data:') ? (
                <img
                  src={worker.profilePhotoPath}
                  alt={worker.fullName}
                  style={{
                    width: '100px',
                    height: '120px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '3px solid #0d9488',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100px',
                    height: '120px',
                    borderRadius: '8px',
                    backgroundColor: '#0d9488',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #0d9488',
                  }}
                >
                  <span style={{ color: '#ffffff', fontSize: '32px', fontWeight: 700 }}>
                    {initials}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, fontFamily: 'monospace', marginBottom: '2px' }}>
                {worker.employeeNumber}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, marginBottom: '4px' }}>
                {worker.fullName}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '2px' }}>
                {worker.designation.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  +
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {worker.bloodGroup}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                Valid Until: <span style={{ fontWeight: 600 }}>{validUntilStr}</span>
              </div>
            </div>
          </div>

          {/* Details table */}
          <div style={{ padding: '0 16px', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 8px 6px 0', color: '#64748b', fontWeight: 500, width: '40%' }}>Date of Birth</td>
                  <td style={{ padding: '6px 0', color: '#0f172a', fontWeight: 500 }}>{formatDate(worker.dateOfBirth)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 8px 6px 0', color: '#64748b', fontWeight: 500 }}>Gender</td>
                  <td style={{ padding: '6px 0', color: '#0f172a', fontWeight: 500 }}>{worker.gender}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 8px 6px 0', color: '#64748b', fontWeight: 500 }}>Aadhaar No.</td>
                  <td style={{ padding: '6px 0', color: '#0f172a', fontWeight: 500, fontFamily: 'monospace', fontSize: '11px' }}>{maskAadhaar(worker.aadhaarNumber)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 8px 6px 0', color: '#64748b', fontWeight: 500 }}>Site / Zone</td>
                  <td style={{ padding: '6px 0', color: '#0f172a', fontWeight: 500 }}>{worker.site?.name || '—'}{worker.zone ? ` / ${worker.zone}` : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 'auto',
              borderTop: '1px solid #e2e8f0',
              padding: '8px 16px 10px',
              backgroundColor: '#f8fafc',
            }}
          >
            {ec && (
              <div style={{ fontSize: '10px', color: '#475569', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Emergency:</span> {ec.name} — {ec.phone}
              </div>
            )}
            <div style={{ fontSize: '8px', color: '#94a3b8', lineHeight: 1.4 }}>
              This card is property of {worker.contractor.name}. Must be returned on separation.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
