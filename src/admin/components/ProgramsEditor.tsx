import { useState } from 'react'
import { useFirestoreDoc } from '../hooks/useFirestoreData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pencil, Plus, Trash2, Upload, Download, ChevronDown, ChevronUp } from 'lucide-react'

interface RequirementCourse {
  code: string
  title: string
  hours: number
  level?: string
}

interface RequirementCategory {
  name: string
  hours: number
  courses: RequirementCourse[]
  note?: string
}

interface Program {
  name: string
  totalHours: number
  maxLowerDivision: number
  description: string
  requirements: Record<string, RequirementCategory>
  overlays?: Record<string, RequirementCategory>
}

type ProgramsDoc = Record<string, Program>

type ProgramKey = 'english' | 'writing' | 'creativeWriting'

const PROGRAM_KEYS: { key: ProgramKey; label: string }[] = [
  { key: 'english', label: 'English' },
  { key: 'writing', label: 'Writing & Rhetoric' },
  { key: 'creativeWriting', label: 'Creative Writing' },
]

export function ProgramsEditor() {
  const { data, loading, error, save } = useFirestoreDoc<ProgramsDoc>(
    'english_config',
    'programs'
  )
  const [programTab, setProgramTab] = useState<ProgramKey>('english')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<{
    key: string
    category: RequirementCategory
    section: 'requirements' | 'overlays'
  } | null>(null)

  if (loading) {
    return <div className="text-muted-foreground py-12 text-center">Loading programs...</div>
  }

  if (error) {
    return <div className="text-destructive py-12 text-center">{error}</div>
  }

  if (!data) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">
          No programs in Firestore yet. Import your existing programs.json.
        </p>
        <Button onClick={handleImport} className="gap-2">
          <Upload className="size-4" />
          Import programs.json
        </Button>
      </div>
    )
  }

  const program = data[programTab]

  function handleExport() {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'programs.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text) as ProgramsDoc
        if (!imported.english || !imported.writing || !imported.creativeWriting) {
          alert('Invalid programs JSON — must contain english, writing, and creativeWriting keys')
          return
        }
        await save(imported)
      } catch {
        alert('Failed to parse JSON file')
      }
    }
    input.click()
  }

  async function handleSaveCategory(
    section: 'requirements' | 'overlays',
    key: string,
    category: RequirementCategory
  ) {
    if (!data) return
    const updated = structuredClone(data)
    const prog = updated[programTab]
    if (section === 'overlays') {
      if (!prog.overlays) prog.overlays = {}
      prog.overlays[key] = category
    } else {
      prog.requirements[key] = category
    }
    await save(updated)
    setEditingCategory(null)
  }

  async function handleDeleteCategory(section: 'requirements' | 'overlays', key: string) {
    if (!data) return
    const updated = structuredClone(data)
    const prog = updated[programTab]
    if (section === 'overlays' && prog.overlays) {
      delete prog.overlays[key]
    } else {
      delete prog.requirements[key]
    }
    await save(updated)
  }

  const renderCategories = (
    section: 'requirements' | 'overlays',
    categories: Record<string, RequirementCategory>
  ) => (
    <div className="space-y-2">
      {Object.entries(categories).map(([key, cat]) => {
        const isExpanded = expandedCategory === `${section}-${key}`
        return (
          <div key={key} className="border rounded-lg">
            <button
              type="button"
              onClick={() =>
                setExpandedCategory(isExpanded ? null : `${section}-${key}`)
              }
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{cat.name}</span>
                <span className="text-xs text-muted-foreground">
                  {cat.hours}h &middot; {cat.courses.length} courses
                </span>
              </div>
              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            {isExpanded && (
              <div className="border-t px-4 py-3 space-y-2">
                {cat.note && (
                  <p className="text-sm text-muted-foreground italic">{cat.note}</p>
                )}
                <div className="text-sm">
                  <table className="w-full">
                    <tbody>
                      {cat.courses.map((c) => (
                        <tr key={c.code} className="border-b last:border-b-0">
                          <td className="py-1 font-mono text-xs">{c.code}</td>
                          <td className="py-1 pl-2">{c.title}</td>
                          <td className="py-1 pl-2 text-muted-foreground w-12">{c.hours}h</td>
                          <td className="py-1 pl-2 text-muted-foreground w-16">
                            {c.level && (
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {c.level}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() =>
                      setEditingCategory({
                        key,
                        category: structuredClone(cat),
                        section,
                      })
                    }
                  >
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCategory(section, key)}
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() =>
          setEditingCategory({
            key: '',
            category: { name: '', hours: 3, courses: [] },
            section,
          })
        }
      >
        <Plus className="size-4" />
        Add Category
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Programs</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <Download className="size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1">
            <Upload className="size-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Program Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {PROGRAM_KEYS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setProgramTab(key)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              programTab === key
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label} ({data[key]?.totalHours ?? 0}h)
          </button>
        ))}
      </div>

      {/* Program Info */}
      {program && (
        <>
          <div className="border rounded-lg p-4 text-sm space-y-1">
            <p><strong>{program.name}</strong> &middot; {program.totalHours}h total &middot; max {program.maxLowerDivision}h lower-division</p>
            <p className="text-muted-foreground">{program.description}</p>
          </div>

          {/* Requirements */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Requirements</h3>
            {renderCategories('requirements', program.requirements)}
          </section>

          {/* Overlays (English only) */}
          {program.overlays && Object.keys(program.overlays).length > 0 && (
            <section className="space-y-3">
              <h3 className="text-lg font-semibold">Overlays</h3>
              {renderCategories('overlays', program.overlays)}
            </section>
          )}
        </>
      )}

      {/* Category Edit Dialog */}
      {editingCategory && (
        <CategoryEditDialog
          categoryKey={editingCategory.key}
          category={editingCategory.category}
          onSave={(key, cat) => handleSaveCategory(editingCategory.section, key, cat)}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </div>
  )
}

function CategoryEditDialog({
  categoryKey,
  category,
  onSave,
  onClose,
}: {
  categoryKey: string
  category: RequirementCategory
  onSave: (key: string, cat: RequirementCategory) => Promise<void>
  onClose: () => void
}) {
  const [key, setKey] = useState(categoryKey)
  const [form, setForm] = useState<RequirementCategory>(structuredClone(category))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!key || !form.name) return
    setSaving(true)
    try {
      await onSave(key, form)
    } finally {
      setSaving(false)
    }
  }

  const addCourse = () => {
    setForm({
      ...form,
      courses: [...form.courses, { code: '', title: '', hours: 3 }],
    })
  }

  const removeCourse = (index: number) => {
    setForm({
      ...form,
      courses: form.courses.filter((_, i) => i !== index),
    })
  }

  const updateCourse = (index: number, field: keyof RequirementCourse, value: string | number) => {
    const courses = [...form.courses]
    courses[index] = { ...courses[index], [field]: value }
    setForm({ ...form, courses })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{categoryKey ? `Edit ${category.name}` : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Key</label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="camelCase"
                disabled={!!categoryKey}
                className="h-10 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Hours</label>
              <Input
                type="number"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: parseInt(e.target.value) || 0 })}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Note (optional)</label>
            <Input
              value={form.note || ''}
              onChange={(e) => setForm({ ...form, note: e.target.value || undefined })}
              placeholder="Additional note..."
              className="h-10 text-sm"
            />
          </div>

          {/* Courses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Courses ({form.courses.length})</label>
              <Button variant="outline" size="sm" onClick={addCourse} className="gap-1">
                <Plus className="size-3" />
                Add
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {form.courses.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={c.code}
                    onChange={(e) => updateCourse(i, 'code', e.target.value.toUpperCase())}
                    placeholder="ENGL 30133"
                    className="h-8 text-xs font-mono w-28 flex-shrink-0"
                  />
                  <Input
                    value={c.title}
                    onChange={(e) => updateCourse(i, 'title', e.target.value)}
                    placeholder="Title"
                    className="h-8 text-xs flex-1"
                  />
                  <Input
                    type="number"
                    value={c.hours}
                    onChange={(e) => updateCourse(i, 'hours', parseInt(e.target.value) || 0)}
                    className="h-8 text-xs w-14 flex-shrink-0"
                  />
                  <select
                    value={c.level || ''}
                    onChange={(e) => updateCourse(i, 'level', e.target.value)}
                    className="h-8 border rounded px-1 text-xs bg-card w-20 flex-shrink-0"
                  >
                    <option value="">upper</option>
                    <option value="lower">lower</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeCourse(i)}
                    className="p-1 rounded hover:bg-destructive/10 flex-shrink-0"
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={saving || !key || !form.name}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
