import { useEffect, useState } from 'react'
import { Search, Plus, Trash2, ChevronRight, Edit2, FileText, RefreshCw, Printer } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import {
  getPacientes, updatePacienteClinica, updateUserData,
  crearPacienteManual, eliminarPaciente,
} from '../../services/pacientes.service'
import {
  getObrasSociales, crearObraSocial, actualizarObraSocial, eliminarObraSocial,
} from '../../services/obrasSociales.service'
import { getTurnosByPaciente, proponerReprogramacion, getSlotsByFecha } from '../../services/turnos.service'
import { useDisponibilidad } from '../../hooks/useDisponibilidad'
import { formatFecha, addMinutes } from '../../utils'

const TABS = ['Pacientes', 'Obras Sociales']

function OsSelect({ value, onChange, obrasSociales }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Obra Social</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] bg-white"
      >
        <option value="">Sin obra social / Particular</option>
        {obrasSociales.map(os => (
          <option key={os.id} value={os.id}>{os.nombre}</option>
        ))}
      </select>
    </div>
  )
}

const EMPTY_FORM = {
  nombre: '', apellido: '', dni: '', telefono: '', email: '',
  fechaNacimiento: '', obraSocialId: '',
  diagnostico: '', sesionesIndicadas: 0, sesionesCompletadas: 0, notas: '',
}

export default function Pacientes() {
  const toast = useToast()
  const { disponibilidad, bloqueos: dispBloqueos, config } = useDisponibilidad()
  const [activeTab, setActiveTab] = useState(0)

  // Pacientes
  const [pacientes, setPacientes] = useState([])
  const [filtrado, setFiltrado] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [turnos, setTurnos] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState(EMPTY_FORM)
  const [creatingLoading, setCreatingLoading] = useState(false)

  // Reprogramar turno desde historial
  const [reprogramarTurno, setReprogramarTurno] = useState(null)
  const [reprFecha, setReprFecha] = useState('')
  const [reprSlots, setReprSlots] = useState([])
  const [reprSlotsLoading, setReprSlotsLoading] = useState(false)
  const [reprHora, setReprHora] = useState('')
  const [savingRepr, setSavingRepr] = useState(false)

  // Obras Sociales
  const [obrasSociales, setObrasSociales] = useState([])
  const [osLoading, setOsLoading] = useState(false)
  const [newOs, setNewOs] = useState('')
  const [addingOs, setAddingOs] = useState(false)
  const [editingOs, setEditingOs] = useState(null)
  const [savingOs, setSavingOs] = useState(false)
  const [deletingOs, setDeletingOs] = useState(null)

  async function loadPacientes() {
    setLoading(true)
    const ps = await getPacientes()
    setPacientes(ps)
    setFiltrado(ps)
    setLoading(false)
  }

  async function loadOS() {
    setOsLoading(true)
    const os = await getObrasSociales()
    setObrasSociales(os)
    setOsLoading(false)
  }

  useEffect(() => { loadPacientes(); loadOS() }, [])

  useEffect(() => {
    if (!search.trim()) { setFiltrado(pacientes); return }
    const t = search.toLowerCase()
    setFiltrado(pacientes.filter(p =>
      p.nombre?.toLowerCase().includes(t) ||
      p.apellido?.toLowerCase().includes(t) ||
      p.dni?.includes(t) ||
      p.email?.toLowerCase().includes(t)
    ))
  }, [search, pacientes])

  async function openPaciente(p) {
    setSelected(p)
    setConfirmDelete(false)
    setForm({
      nombre: p.nombre || '',
      apellido: p.apellido || '',
      dni: p.dni || '',
      telefono: p.telefono || '',
      email: p.email || '',
      fechaNacimiento: p.fechaNacimiento || '',
      obraSocialId: p.obraSocialId || '',
      diagnostico: p.clinica?.diagnostico || '',
      sesionesIndicadas: p.clinica?.sesionesIndicadas || 0,
      sesionesCompletadas: p.clinica?.sesionesCompletadas || 0,
      notas: p.clinica?.notas || '',
    })
    const ts = await getTurnosByPaciente(p.id)
    setTurnos(ts)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all([
        updateUserData(selected.id, {
          nombre: form.nombre, apellido: form.apellido, dni: form.dni,
          telefono: form.telefono, fechaNacimiento: form.fechaNacimiento,
          obraSocialId: form.obraSocialId,
        }),
        updatePacienteClinica(selected.id, {
          diagnostico: form.diagnostico,
          sesionesIndicadas: form.sesionesIndicadas,
          sesionesCompletadas: form.sesionesCompletadas,
          notas: form.notas,
        }),
      ])
      toast({ message: 'Paciente actualizado', type: 'success' })
      setSelected(null)
      loadPacientes()
    } catch {
      toast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await eliminarPaciente(selected.id)
      toast({ message: 'Paciente eliminado', type: 'success' })
      setSelected(null)
      loadPacientes()
    } catch {
      toast({ message: 'Error al eliminar', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  async function handleCreate() {
    setCreatingLoading(true)
    try {
      await crearPacienteManual(newForm)
      toast({ message: 'Paciente creado', type: 'success' })
      setCreating(false)
      setNewForm(EMPTY_FORM)
      loadPacientes()
    } catch {
      toast({ message: 'Error al crear', type: 'error' })
    } finally {
      setCreatingLoading(false)
    }
  }

  async function handleAddOs() {
    if (!newOs.trim()) return
    setAddingOs(true)
    try {
      await crearObraSocial(newOs)
      toast({ message: 'Obra social agregada', type: 'success' })
      setNewOs('')
      loadOS()
    } catch {
      toast({ message: 'Error al agregar', type: 'error' })
    } finally {
      setAddingOs(false)
    }
  }

  async function handleSaveOs() {
    if (!editingOs) return
    setSavingOs(true)
    try {
      await actualizarObraSocial(editingOs.id, { nombre: editingOs.nombre })
      toast({ message: 'Guardado', type: 'success' })
      setEditingOs(null)
      loadOS()
    } catch {
      toast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSavingOs(false)
    }
  }

  async function handleDeleteOs(id) {
    setDeletingOs(id)
    try {
      await eliminarObraSocial(id)
      toast({ message: 'Eliminada', type: 'success' })
      loadOS()
    } catch {
      toast({ message: 'Error al eliminar', type: 'error' })
    } finally {
      setDeletingOs(null)
    }
  }

  // Cargar slots disponibles al cambiar fecha de reprogramación
  useEffect(() => {
    if (!reprFecha || !config || !Object.keys(disponibilidad).length) return
    setReprSlotsLoading(true)
    setReprHora('')
    getSlotsByFecha(reprFecha, disponibilidad, config.duracionSesionMin || 30, dispBloqueos)
      .then(s => { setReprSlots(s); setReprSlotsLoading(false) })
  }, [reprFecha, disponibilidad, config, dispBloqueos])

  async function handleReprogramar() {
    if (!reprFecha || !reprHora || !reprogramarTurno) return
    setSavingRepr(true)
    try {
      const horaFin = addMinutes(reprHora, config?.duracionSesionMin || 30)
      await proponerReprogramacion(reprogramarTurno.id, {
        userId: reprogramarTurno.userId,
        pacienteId: reprogramarTurno.pacienteId || reprogramarTurno.userId,
        fecha: reprFecha,
        horaInicio: reprHora,
        horaFin,
      })
      toast({ message: 'Propuesta enviada al paciente', type: 'success' })
      setReprogramarTurno(null)
      setReprFecha(''); setReprHora(''); setReprSlots([])
      // Refrescar turnos del paciente
      if (selected) {
        const ts = await getTurnosByPaciente(selected.id)
        setTurnos(ts)
      }
    } catch {
      toast({ message: 'Error al enviar propuesta', type: 'error' })
    } finally {
      setSavingRepr(false)
    }
  }

  function imprimirFicha(paciente, turnos, osMap) {
    const osNombre = paciente.obraSocialId ? (osMap[paciente.obraSocialId] || 'Otra') : 'Particular'
    const rows = turnos.slice(0, 20).map(t => {
      const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
      const estadoColor = { completado:'#dcfce7', confirmado:'#dbeafe', pendiente:'#fef9c3', cancelado:'#fee2e2', propuesto:'#f3e8ff' }
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:8px 12px">${fd.toLocaleDateString('es-AR')}</td>
        <td style="padding:8px 12px">${t.horaInicio}</td>
        <td style="padding:8px 12px"><span style="background:${estadoColor[t.estado]||'#f1f5f9'};padding:2px 8px;border-radius:99px;font-size:11px">${t.estado}</span></td>
        <td style="padding:8px 12px;color:#64748b;font-size:12px">${t.notasEvolucion || t.notasAdmin || '—'}</td>
      </tr>`
    }).join('')
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Ficha — ${paciente.nombre} ${paciente.apellido}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:32px}
    .header{display:flex;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1565C0}
    h1{font-size:20px;color:#1565C0;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
    .campo p:first-child{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
    .campo p:last-child{font-size:14px;font-weight:600;color:#1e293b}
    .section-title{font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;margin:16px 0 8px}
    .diagnostico{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;color:#374151;line-height:1.5}
    table{width:100%;border-collapse:collapse}th{padding:8px 12px;text-align:left;background:#1565C0;color:white;font-size:12px}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
    @media print{body{padding:16px}}</style></head><body>
    <div class="header">
      <div><h1>FisioSalud — Ficha del Paciente</h1><p style="font-size:12px;color:#64748b;margin-top:4px">Lic. Miguel Carrizo · Rehabilitación Traumatológica y Deportiva</p></div>
      <div style="text-align:right;font-size:12px;color:#64748b">Generado el ${new Date().toLocaleDateString('es-AR')}</div>
    </div>
    <div class="grid">
      <div class="campo"><p>Nombre completo</p><p>${paciente.nombre} ${paciente.apellido}</p></div>
      <div class="campo"><p>DNI</p><p>${paciente.dni || '—'}</p></div>
      <div class="campo"><p>Teléfono</p><p>${paciente.telefono || '—'}</p></div>
      <div class="campo"><p>Email</p><p>${paciente.email || '—'}</p></div>
      <div class="campo"><p>Fecha de nacimiento</p><p>${paciente.fechaNacimiento || '—'}</p></div>
      <div class="campo"><p>Obra Social</p><p>${osNombre}</p></div>
    </div>
    <div class="section-title">Datos clínicos</div>
    <div class="grid">
      <div class="campo"><p>Sesiones indicadas</p><p>${paciente.clinica?.sesionesIndicadas || 0}</p></div>
      <div class="campo"><p>Sesiones completadas</p><p>${paciente.clinica?.sesionesCompletadas || 0}</p></div>
    </div>
    ${paciente.clinica?.diagnostico ? `<div class="section-title">Diagnóstico</div><div class="diagnostico">${paciente.clinica.diagnostico}</div>` : ''}
    ${paciente.clinica?.notas ? `<div class="section-title">Notas clínicas</div><div class="diagnostico">${paciente.clinica.notas}</div>` : ''}
    <div class="section-title">Historial de turnos (últimos ${Math.min(turnos.length, 20)})</div>
    <table><thead><tr><th>Fecha</th><th>Horario</th><th>Estado</th><th>Notas</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8">Sin turnos registrados</td></tr>'}</tbody></table>
    <div class="footer">FisioSalud · Avellaneda 112, La Rioja · 3804362882</div>
    </body></html>`
    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(html); win.document.close()
    setTimeout(() => win.print(), 600)
  }

  const osMap = Object.fromEntries(obrasSociales.map(o => [o.id, o.nombre]))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
        {activeTab === 0 && (
          <Button size="sm" onClick={() => { setCreating(true); setNewForm(EMPTY_FORM) }}>
            <Plus className="w-4 h-4" /> Nuevo
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === i ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Pacientes */}
      {activeTab === 0 && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              placeholder="Buscar por nombre, DNI o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? <Spinner className="h-48" /> : (
            <Card>
              {filtrado.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">
                  {search ? 'Sin resultados' : 'No hay pacientes registrados'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filtrado.map(p => (
                    <button
                      key={p.id}
                      onClick={() => openPaciente(p)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {p.fotoUrl ? (
                          <img src={p.fotoUrl} alt="" className="w-10 h-10 rounded-full border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#1565C0] font-semibold text-sm shrink-0">
                            {p.nombre?.[0]}{p.apellido?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{p.nombre} {p.apellido}</p>
                          <p className="text-xs text-gray-400">{p.dni ? `DNI: ${p.dni} · ` : ''}{p.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.obraSocialId && osMap[p.obraSocialId] && (
                          <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full hidden sm:block">
                            {osMap[p.obraSocialId]}
                          </span>
                        )}
                        {p.clinica?.sesionesIndicadas > 0 && (
                          <span className="text-xs text-gray-400 hidden sm:block">
                            {p.clinica.sesionesCompletadas}/{p.clinica.sesionesIndicadas} ses.
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Tab: Obras Sociales */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <Card>
            <div className="p-4 flex gap-3">
              <input
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                placeholder="Nombre de la obra social..."
                value={newOs}
                onChange={e => setNewOs(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddOs()}
              />
              <Button size="sm" onClick={handleAddOs} loading={addingOs} disabled={!newOs.trim()}>
                <Plus className="w-4 h-4" /> Agregar
              </Button>
            </div>
          </Card>

          {osLoading ? <Spinner className="h-24" /> : (
            <Card>
              {obrasSociales.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">
                  No hay obras sociales cargadas
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {obrasSociales.map(os => (
                    <div key={os.id} className="flex items-center gap-3 px-5 py-3">
                      {editingOs?.id === os.id ? (
                        <>
                          <input
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                            value={editingOs.nombre}
                            onChange={e => setEditingOs(o => ({ ...o, nombre: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleSaveOs()}
                            autoFocus
                          />
                          <Button size="sm" onClick={handleSaveOs} loading={savingOs}>Guardar</Button>
                          <button onClick={() => setEditingOs(null)} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium text-gray-700">{os.nombre}</span>
                          <button
                            onClick={() => setEditingOs({ id: os.id, nombre: os.nombre })}
                            className="p-1.5 text-gray-400 hover:text-[#1565C0] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOs(os.id)}
                            disabled={deletingOs === os.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Edit patient modal */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setConfirmDelete(false) }}
        title={`${selected?.nombre} ${selected?.apellido}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos personales</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nombre" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                  <Input label="Apellido" value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="DNI" value={form.dni} onChange={e => setForm(p => ({ ...p, dni: e.target.value }))} />
                  <Input label="Teléfono" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} />
                </div>
                <Input label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={e => setForm(p => ({ ...p, fechaNacimiento: e.target.value }))} />
                <OsSelect value={form.obraSocialId} onChange={e => setForm(p => ({ ...p, obraSocialId: e.target.value }))} obrasSociales={obrasSociales} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos clínicos</h4>
              <div className="space-y-3">
                <Textarea label="Diagnóstico" value={form.diagnostico} onChange={e => setForm(p => ({ ...p, diagnostico: e.target.value }))} placeholder="Diagnóstico..." />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Sesiones indicadas" type="number" min="0" value={form.sesionesIndicadas} onChange={e => setForm(p => ({ ...p, sesionesIndicadas: parseInt(e.target.value) || 0 }))} />
                  <Input label="Sesiones completadas" type="number" min="0" value={form.sesionesCompletadas} onChange={e => setForm(p => ({ ...p, sesionesCompletadas: parseInt(e.target.value) || 0 }))} />
                </div>
                <Textarea label="Notas internas" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Notas adicionales..." />
                {selected.clinica?.pedidoMedicoUrl && (
                  <a href={selected.clinica.pedidoMedicoUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#1565C0] hover:underline">
                    <FileText className="w-4 h-4" /> Ver pedido médico
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Historial de turnos</h4>
              {turnos.length === 0 ? (
                <p className="text-sm text-gray-400">Sin turnos registrados</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {turnos.map(t => (
                    <div key={t.id} className="text-sm bg-gray-50 rounded-lg px-4 py-2 gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium">
                            {t.fecha ? formatFecha(t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)) : ''}
                          </span>
                          <span className="text-gray-400 ml-2">{t.horaInicio}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge estado={t.estado} />
                          {t.estado !== 'propuesto' && (
                            <button
                              onClick={() => {
                                setReprogramarTurno(t)
                                setReprFecha(''); setReprHora(''); setReprSlots([])
                              }}
                              className="flex items-center gap-1 text-xs text-[#1565C0] hover:underline font-medium shrink-0"
                            >
                              <RefreshCw className="w-3 h-3" /> Reprogramar
                            </button>
                          )}
                        </div>
                      </div>
                      {t.notasEvolucion && (
                        <p className="text-xs text-gray-500 italic mt-1 pl-0.5">📋 {t.notasEvolucion}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-400 hover:text-red-600 hover:underline">
                    Eliminar paciente
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-500 font-medium">¿Confirmar?</span>
                    <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>Sí, eliminar</Button>
                    <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => imprimirFicha(selected, turnos, osMap)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1565C0] border border-gray-200 hover:border-[#1565C0] rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Imprimir ficha
                </button>
                <Button onClick={handleSave} loading={saving}>Guardar cambios</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal reprogramar turno desde historial */}
      <Modal
        open={!!reprogramarTurno}
        onClose={() => { setReprogramarTurno(null); setReprFecha(''); setReprHora(''); setReprSlots([]) }}
        title="Proponer nuevo turno"
        size="md"
      >
        {reprogramarTurno && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
              <p className="font-medium">{selected?.nombre} {selected?.apellido}</p>
              <p className="text-blue-600 text-xs mt-0.5">
                Turno original:{' '}
                {reprogramarTurno.fecha
                  ? formatFecha(reprogramarTurno.fecha?.toDate ? reprogramarTurno.fecha.toDate() : new Date(reprogramarTurno.fecha))
                  : '—'}{' '}
                · {reprogramarTurno.horaInicio}hs — <Badge estado={reprogramarTurno.estado} />
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva fecha</label>
              <input
                type="date"
                value={reprFecha}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setReprFecha(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            {reprFecha && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Nuevo horario</p>
                {reprSlotsLoading ? (
                  <Spinner className="h-16" />
                ) : reprSlots.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg">
                    Sin cupos disponibles para esta fecha
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {reprSlots.map(slot => (
                      <button
                        key={slot.hora}
                        onClick={() => setReprHora(slot.hora)}
                        className={`py-2 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-0.5
                          ${reprHora === slot.hora
                            ? 'bg-[#1565C0] border-[#1565C0] text-white'
                            : 'border-gray-200 text-gray-700 hover:border-[#1565C0] hover:text-[#1565C0]'}`}
                      >
                        <span>{slot.hora}</span>
                        {slot.capacidad > 1 && (
                          <span className={`text-[10px] font-normal ${reprHora === slot.hora ? 'text-blue-100' : 'text-gray-400'}`}>
                            {slot.disponibles} lugar{slot.disponibles !== 1 ? 'es' : ''}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {reprFecha && reprHora && (
              <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-2 text-sm text-green-800">
                Propuesta: <strong>{reprFecha}</strong> a las <strong>{reprHora}hs</strong>
                {config?.duracionSesionMin && (
                  <span className="text-green-600 text-xs ml-1">
                    (hasta {addMinutes(reprHora, config.duracionSesionMin)})
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400">
              El paciente recibirá la propuesta en "Mis Turnos" y podrá aceptarla o rechazarla.
            </p>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleReprogramar}
                loading={savingRepr}
                disabled={!reprFecha || !reprHora}
              >
                <RefreshCw className="w-4 h-4" /> Enviar propuesta
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setReprogramarTurno(null); setReprFecha(''); setReprHora(''); setReprSlots([]) }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create patient modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo paciente" size="md">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            Los pacientes creados manualmente no tendrán acceso al portal hasta registrarse con Google.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={newForm.nombre} onChange={e => setNewForm(p => ({ ...p, nombre: e.target.value }))} />
            <Input label="Apellido *" value={newForm.apellido} onChange={e => setNewForm(p => ({ ...p, apellido: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="DNI" value={newForm.dni} onChange={e => setNewForm(p => ({ ...p, dni: e.target.value }))} />
            <Input label="Teléfono" value={newForm.telefono} onChange={e => setNewForm(p => ({ ...p, telefono: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={newForm.email} onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="Fecha de nacimiento" type="date" value={newForm.fechaNacimiento} onChange={e => setNewForm(p => ({ ...p, fechaNacimiento: e.target.value }))} />
          <OsSelect value={newForm.obraSocialId} onChange={e => setNewForm(p => ({ ...p, obraSocialId: e.target.value }))} obrasSociales={obrasSociales} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={creatingLoading} disabled={!newForm.nombre.trim()}>
              Crear paciente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
