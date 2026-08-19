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

// ---------- printing ----------
/** Card box in CSS px — the printed page is sized to match exactly. */
export const CARD_WIDTH = 340
export const CARD_HEIGHT = 540

/**
 * Prints just the ID card, on a page cut to the card's own size.
 *
 * The card is rendered into an offscreen iframe rather than printed from the
 * page: printing the live document drags along the dialog it sits in, and the
 * card ends up floating in the middle of an A4 sheet. Every style on the card
 * is inline, so cloning its markup reproduces it exactly with no stylesheet.
 */
export function printWorkerIdCard(node: HTMLElement | null) {
  if (!node) return

  const title = node.dataset.printTitle || 'Worker ID Card'

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  })
  document.body.appendChild(iframe)

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }

  const doc = iframe.contentDocument
  if (!doc) {
    cleanup()
    return
  }

  // `margin: 0` on a page cut to the card is also what makes browsers drop the
  // default header/footer (date, page title, URL, page number).
  const css = `
    @page { size: ${CARD_WIDTH}px ${CARD_HEIGHT}px; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${CARD_WIDTH}px;
      height: ${CARD_HEIGHT}px;
      overflow: hidden;
      background: #ffffff;
      font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Keep the gradient strip, photo border and footer tint in the output. */
    body * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* The shadow is screen affordance, not part of the card. */
    .id-card-container {
      box-shadow: none !important;
      border-radius: 0 !important;
      width: ${CARD_WIDTH}px !important;
      height: ${CARD_HEIGHT}px !important;
    }
  `

  doc.open()
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>` +
      `<style>${css}</style></head><body>${node.outerHTML}</body></html>`,
  )
  doc.close()

  const run = async () => {
    const win = iframe.contentWindow
    if (!win) {
      cleanup()
      return
    }
    // The profile photo is a data: URI but still needs a tick to decode.
    await Promise.all(
      Array.from(doc.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.onload = () => resolve(null)
              img.onerror = () => resolve(null)
            }),
      ),
    )
    win.focus()
    win.print()
    // Chrome's print dialog is modal on the iframe; tear down once it returns.
    setTimeout(cleanup, 1000)
  }

  if (doc.readyState === 'complete') run()
  else iframe.onload = run
}

// ---------- component ----------
export default function WorkerIdCard({
  worker,
  ref,
}: {
  worker: WorkerCardData
  /** Points at the card box itself — pass to `printWorkerIdCard` to print it. */
  ref?: React.Ref<HTMLDivElement>
}) {
  const ec = primaryContact(worker)
  const initials = getInitials(worker.fullName)

  // Compute a reasonable validity date: 1 year from now
  const validUntil = new Date()
  validUntil.setFullYear(validUntil.getFullYear() + 1)
  const validUntilStr = validUntil.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div className="id-card-print-area flex justify-center">
        <div
          ref={ref}
          className="id-card-container"
          data-print-title={`${worker.employeeNumber} - ${worker.fullName}`}
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`,
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
  )
}
