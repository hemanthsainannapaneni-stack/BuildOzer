'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Upload, Download, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// ---------- types ----------
interface Contractor {
  id: string
  name: string
  code: string
}

interface Site {
  id: string
  name: string
}

interface Designation {
  id: string
  name: string
}

interface RowError {
  row: number
  message: string
}

interface ParsedRow {
  _row: number
  fullName: string
  dateOfBirth: string
  gender: string
  bloodGroup: string
  aadhaarNumber: string
  permanentAddress: string
  qualification: string
  designation: string
  currentAddress: string
  zone: string
  errors: string[]
  valid: boolean
}

const VALID_GENDERS = ['Male', 'Female', 'Other']
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const VALID_QUALIFICATIONS = ['Below 10th', '10th', '12th', 'ITI', 'Diploma', 'Graduate', 'Other']

const TEMPLATE_HEADERS = [
  'Full Name', 'Date of Birth', 'Gender', 'Blood Group',
  'Aadhaar Number', 'Permanent Address', 'Qualification',
  'Designation', 'Current Address', 'Zone/Block',
]

// ---------- props ----------
interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ---------- component ----------
export default function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const [contractorId, setContractorId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [phase, setPhase] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [importResult, setImportResult] = useState<{ created: number; errors: RowError[] } | null>(null)
  const [importProgress, setImportProgress] = useState('')

  const { data: contractors } = useQuery<Contractor[]>({
    queryKey: ['contractors'],
    queryFn: () => fetch('/api/contractors').then((r) => r.json()),
  })

  const { data: sites } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => fetch('/api/sites').then((r) => r.json()),
  })

  const { data: designations } = useQuery<Designation[]>({
    queryKey: ['designations'],
    queryFn: () => fetch('/api/designations').then((r) => r.json()),
  })

  const resetState = useCallback(() => {
    setParsedRows([])
    setFileName('')
    setPhase('upload')
    setImportResult(null)
    setImportProgress('')
  }, [])

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) resetState()
    onOpenChange(isOpen)
  }, [onOpenChange, resetState])

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ['Rajesh Kumar', '15/03/1990', 'Male', 'B+', '123456789012', 'Village Road, Pune, Maharashtra', 'ITI', 'Electrician', 'Site Camp, Mumbai', 'Zone A'],
      ['Priya Sharma', '22/07/1995', 'Female', 'O+', '987654321098', '123 MG Road, Delhi', 'Graduate', 'Supervisor', '', 'Block 3'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Workers')
    XLSX.writeFile(wb, 'worker_import_template.xlsx')
    toast.success('Template downloaded')
  }

  const parseDate = (val: string): string | null => {
    if (!val) return null
    // DD/MM/YYYY
    const dmy = /^\d{2}\/\d{2}\/\d{4}$/.exec(val.trim())
    if (dmy) {
      const [d, m, y] = val.trim().split('/').map(Number)
      const date = new Date(y, m - 1, d)
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10)
    }
    // ISO or other parseable
    const date = new Date(val)
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10)
    return null
  }

  const calculateAge = (dob: string): number | null => {
    const d = new Date(dob)
    if (isNaN(d.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - d.getFullYear()
    const m = today.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
    return age
  }

  const validateRow = (row: Record<string, unknown>, idx: number): ParsedRow => {
    const errors: string[] = []
    const fullName = String(row['Full Name'] || '').trim()
    const dobRaw = String(row['Date of Birth'] || '').trim()
    const gender = String(row['Gender'] || '').trim()
    const bloodGroup = String(row['Blood Group'] || '').trim()
    const aadhaarNumber = String(row['Aadhaar Number'] || '').trim()
    const permanentAddress = String(row['Permanent Address'] || '').trim()
    const qualification = String(row['Qualification'] || '').trim()
    const designation = String(row['Designation'] || '').trim()
    const currentAddress = String(row['Current Address'] || '').trim()
    const zone = String(row['Zone/Block'] || '').trim()

    if (!fullName) errors.push('Full Name is required')

    const dob = parseDate(dobRaw)
    if (!dob) errors.push('Invalid Date of Birth (use DD/MM/YYYY)')
    else {
      const age = calculateAge(dob)
      if (age !== null && (age < 18 || age > 55)) errors.push(`Age ${age} is not between 18-55`)
    }

    if (!gender || !VALID_GENDERS.includes(gender)) errors.push('Gender must be Male/Female/Other')
    if (!bloodGroup || !VALID_BLOOD_GROUPS.includes(bloodGroup)) errors.push('Invalid Blood Group')
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) errors.push('Aadhaar must be 12 digits')
    if (!permanentAddress) errors.push('Permanent Address is required')
    if (!qualification || !VALID_QUALIFICATIONS.includes(qualification)) errors.push('Invalid Qualification')

    return {
      _row: idx,
      fullName,
      dateOfBirth: dob || dobRaw,
      gender,
      bloodGroup,
      aadhaarNumber,
      permanentAddress,
      qualification,
      designation,
      currentAddress,
      zone,
      errors,
      valid: errors.length === 0,
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

        const validated = rows.map((r, i) => validateRow(r, i + 1))
        setParsedRows(validated)
        setPhase('preview')
      } catch {
        toast.error('Failed to parse Excel file')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const validCount = parsedRows.filter((r) => r.valid).length
  const errorCount = parsedRows.filter((r) => !r.valid).length

  const importMutation = useMutation({
    mutationFn: async (workers: ParsedRow[]) => {
      setPhase('importing')
      const descs = designations || []
      const contractor = contractors?.find((c) => c.id === contractorId)

      const payload = workers.map((r) => {
        const descMatch = descs.find(
          (d) => d.name.toLowerCase() === r.designation.toLowerCase()
        )
        return {
          fullName: r.fullName,
          dateOfBirth: r.dateOfBirth,
          gender: r.gender,
          bloodGroup: r.bloodGroup,
          aadhaarNumber: r.aadhaarNumber,
          permanentAddress: r.permanentAddress,
          qualification: r.qualification,
          designationName: descMatch?.name || r.designation,
          designationId: descMatch?.id || null,
          currentAddress: r.currentAddress || null,
          zone: r.zone || null,
        }
      })

      const total = payload.length
      let done = 0

      // Send in batches of 50
      const batchSize = 50
      let totalCreated = 0
      const allErrors: RowError[] = []

      for (let i = 0; i < payload.length; i += batchSize) {
        const batch = payload.slice(i, i + batchSize)
        setImportProgress(`Importing ${done + 1}-${Math.min(done + batch.length, total)} of ${total}...`)
        const res = await fetch('/api/workers/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workers: batch,
            contractorId,
            contractorCode: contractor?.code,
            siteId: siteId || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Import failed')
        totalCreated += data.created || 0
        if (data.errors) allErrors.push(...data.errors)
        done += batch.length
      }

      return { created: totalCreated, errors: allErrors }
    },
    onSuccess: (result) => {
      setImportResult(result)
      setPhase('done')
      toast.success(`${result.created} worker(s) imported successfully`)
    },
    onError: (err) => {
      setPhase('preview')
      toast.error(err.message || 'Import failed')
    },
  })

  const handleImport = () => {
    if (!contractorId) {
      toast.error('Please select a contractor')
      return
    }
    const validRows = parsedRows.filter((r) => r.valid)
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }
    importMutation.mutate(validRows)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[#0d9488]" />
            Bulk Import Workers
          </DialogTitle>
          <DialogDescription>
            Import worker data from an Excel file (.xlsx / .xls)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phase: Upload */}
          {phase === 'upload' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Contractor *</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={contractorId}
                    onChange={(e) => setContractorId(e.target.value)}
                  >
                    <option value="">Select contractor</option>
                    {contractors?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Site (optional)</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                  >
                    <option value="">Select site</option>
                    {sites?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-[#0d9488]/50 transition-colors"
                onClick={() => document.getElementById('bulk-file-input')?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select .xlsx or .xls file
                </p>
                <input
                  id="bulk-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
            </>
          )}

          {/* Phase: Preview */}
          {phase === 'preview' && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{fileName}</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {validCount} valid
                  </Badge>
                  {errorCount > 0 && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {errorCount} errors
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPhase('upload')}>
                  Change File
                </Button>
              </div>

              {/* Preview table (first 5 rows) */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="bg-muted/50">
                        <th className="px-2 py-1.5 text-left font-medium">#</th>
                        <th className="px-2 py-1.5 text-left font-medium">Name</th>
                        <th className="px-2 py-1.5 text-left font-medium">DOB</th>
                        <th className="px-2 py-1.5 text-left font-medium">Gender</th>
                        <th className="px-2 py-1.5 text-left font-medium">Blood</th>
                        <th className="px-2 py-1.5 text-left font-medium">Aadhaar</th>
                        <th className="px-2 py-1.5 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((r) => (
                        <tr key={r._row} className="border-t">
                          <td className="px-2 py-1.5">{r._row}</td>
                          <td className="px-2 py-1.5 font-medium max-w-[120px] truncate">{r.fullName}</td>
                          <td className="px-2 py-1.5">{r.dateOfBirth}</td>
                          <td className="px-2 py-1.5">{r.gender}</td>
                          <td className="px-2 py-1.5">{r.bloodGroup}</td>
                          <td className="px-2 py-1.5 font-mono">{r.aadhaarNumber}</td>
                          <td className="px-2 py-1.5">
                            {r.valid ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <div className="flex items-center gap-1 text-red-500">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span className="max-w-[150px] truncate" title={r.errors.join(', ')}>
                                  {r.errors[0]}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 5 && (
                  <p className="text-xs text-muted-foreground px-3 py-2 border-t">
                    Showing 5 of {parsedRows.length} rows
                  </p>
                )}
              </div>

              {/* Error rows list */}
              {errorCount > 0 && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-red-600">
                    {errorCount} row(s) have errors and will be skipped:
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {parsedRows.filter((r) => !r.valid).map((r) => (
                      <p key={r._row} className="text-xs text-muted-foreground">
                        <span className="font-mono">Row {r._row}:</span> {r.errors.join('; ')}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPhase('upload')}>
                  Back
                </Button>
                <Button
                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                  onClick={handleImport}
                  disabled={!contractorId || validCount === 0}
                >
                  Import {validCount} Worker{validCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </>
          )}

          {/* Phase: Importing */}
          {phase === 'importing' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0d9488]" />
              <p className="text-sm font-medium">{importProgress}</p>
            </div>
          )}

          {/* Phase: Done */}
          {phase === 'done' && importResult && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="text-lg font-semibold">Import Complete</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-emerald-600">{importResult.created}</span> worker(s) created successfully
                </p>
                {importResult.errors.length > 0 && (
                  <p className="text-sm text-red-500">
                    {importResult.errors.length} row(s) failed
                  </p>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <span className="font-mono">Row {e.row}:</span> {e.message}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
