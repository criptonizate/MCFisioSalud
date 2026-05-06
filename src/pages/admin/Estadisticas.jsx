import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { getAllTurnosForStats } from '../../services/turnos.service'
import { getPacientes } from '../../services/pacientes.service'
import { getObrasSociales } from '../../services/obrasSociales.service'
import { getDisponibilidad } from '../../services/disponibilidad.service'
import { getConfig } from '../../services/config.service'
import {
  TrendingUp, TrendingDown, Users, CheckCircle2, XCircle,
  Clock, DollarSign, Activity, Download, AlertTriangle,
} from 'lucide-react'

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DAYS_ES   = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const COLORS_OS = ['#1565C0','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6']
const CHART_COLORS = {
  completado: '#22c55e', confirmado: '#1565C0',
  pendiente: '#eab308', cancelado: '#ef4444', propuesto: '#a855f7',
}
const PERIODS = [
  { label: '1 mes', value: 1 },
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
]

function horaToMin(str) {
  const [h, m] = (str || '00:00').split(':').map(Number)
  return h * 60 + m
}

function formatPesos(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function computeStats({ allTurnos, periodoTurnos, pacientes, obrasSocialesList, config, disponibilidad, period }) {
  const osMap = Object.fromEntries(obrasSocialesList.map(o => [o.id, o.nombre]))
  const pacMap = Object.fromEntries(pacientes.map(p => [p.id, p]))

  const periodStart = new Date()
  periodStart.setMonth(periodStart.getMonth() - period)

  // ── Métricas base ──
  const byMonth = {}
  const byStatus = { completado: 0, confirmado: 0, pendiente: 0, cancelado: 0, propuesto: 0 }
  const byDay = { Lun: 0, Mar: 0, Mié: 0, Jue: 0, Vie: 0, Sáb: 0 }

  periodoTurnos.forEach(t => {
    if (!t.fecha) return
    const d = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
    const key = `${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
    if (!byMonth[key]) byMonth[key] = { mes: key, completado: 0, confirmado: 0, pendiente: 0, cancelado: 0, _order: d.getFullYear() * 100 + d.getMonth() }
    byMonth[key][t.estado] = (byMonth[key][t.estado] || 0) + 1
    byStatus[t.estado] = (byStatus[t.estado] || 0) + 1
    const dayLabel = DAYS_ES[d.getDay()]
    if (byDay[dayLabel] !== undefined) byDay[dayLabel]++
  })

  const monthlyData = Object.values(byMonth).sort((a, b) => a._order - b._order)
  const pieData = Object.entries(byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v, color: CHART_COLORS[k] }))
  const dayData = Object.entries(byDay).map(([dia, total]) => ({ dia, total }))

  const total = periodoTurnos.length
  const completados = byStatus.completado
  const cancelados = byStatus.cancelado
  const denominator = total - byStatus.pendiente - byStatus.propuesto
  const tasaAsistencia = denominator > 0 ? Math.round((completados / denominator) * 100) : 0

  // ── Horarios pico ──
  const byHora = {}
  periodoTurnos.filter(t => t.estado !== 'cancelado').forEach(t => {
    if (t.horaInicio) byHora[t.horaInicio] = (byHora[t.horaInicio] || 0) + 1
  })
  const horaData = Object.entries(byHora)
    .map(([hora, total]) => ({ hora, total }))
    .sort((a, b) => a.hora.localeCompare(b.hora))

  // ── Obras sociales breakdown ──
  const byOS = {}
  periodoTurnos.filter(t => t.estado === 'completado').forEach(t => {
    const p = pacMap[t.userId]
    const osId = p?.obraSocialId
    const osNombre = osId ? (osMap[osId] || 'Otra') : 'Particular'
    byOS[osNombre] = (byOS[osNombre] || 0) + 1
  })
  const osData = Object.entries(byOS)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // ── Nuevos vs recurrentes ──
  const earliestByPatient = {}
  allTurnos.forEach(t => {
    const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
    if (!earliestByPatient[t.userId] || fd < earliestByPatient[t.userId]) {
      earliestByPatient[t.userId] = fd
    }
  })
  const patientsInPeriod = new Set(periodoTurnos.filter(t => t.estado !== 'cancelado').map(t => t.userId))
  let nuevos = 0, recurrentes = 0
  patientsInPeriod.forEach(uid => {
    const earliest = earliestByPatient[uid]
    if (earliest && earliest >= periodStart) nuevos++
    else recurrentes++
  })

  // ── Ocupación del consultorio ──
  let capacidadSemanal = 0
  const durMin = config?.duracionSesionMin || 30
  Object.values(disponibilidad).forEach(d => {
    if (d?.activo && d?.franjas?.length) {
      d.franjas.forEach(f => {
        const numSlots = Math.floor((horaToMin(f.fin) - horaToMin(f.inicio)) / durMin)
        capacidadSemanal += numSlots * (f.capacidad || 1)
      })
    }
  })
  const semanasEnPeriodo = (period * 30.44) / 7
  const capacidadTotal = Math.round(capacidadSemanal * semanasEnPeriodo)
  const porcOcupacion = capacidadTotal > 0 ? Math.min(100, Math.round((completados / capacidadTotal) * 100)) : 0

  // ── Ingresos estimados ──
  const precio = config?.precioPorSesion || 0
  const ingresoEstimado = completados * precio
  const perdidaCancelaciones = cancelados * precio

  // ── Tendencia mes a mes ──
  const lastMonth = monthlyData[monthlyData.length - 1]
  const prevMonth = monthlyData[monthlyData.length - 2]
  const tendencia = prevMonth && lastMonth && prevMonth.completado > 0
    ? Math.round(((lastMonth.completado - prevMonth.completado) / prevMonth.completado) * 100)
    : null

  // ── Pacientes que no completaron tratamiento ──
  const abandonos = pacientes.filter(p =>
    p.clinica?.sesionesIndicadas > 0 &&
    (p.clinica?.sesionesCompletadas || 0) < p.clinica?.sesionesIndicadas
  ).sort((a, b) => {
    const restanteA = a.clinica.sesionesIndicadas - (a.clinica.sesionesCompletadas || 0)
    const restanteB = b.clinica.sesionesIndicadas - (b.clinica.sesionesCompletadas || 0)
    return restanteB - restanteA
  })

  return {
    monthlyData, pieData, dayData, byStatus, total, completados, cancelados, tasaAsistencia,
    horaData, osData, nuevos, recurrentes,
    porcOcupacion, capacidadTotal,
    ingresoEstimado, perdidaCancelaciones,
    tendencia, lastMonth, prevMonth,
    abandonos,
  }
}

function MetricCard({ icon: Icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:   'bg-blue-50 text-[#1565C0]',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
          <p className="text-xs text-gray-500 truncate">{label}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold shrink-0 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </CardBody>
    </Card>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function exportarCSV(turnos, pacMap, osMap) {
  const header = ['Fecha', 'Horario', 'Paciente', 'DNI', 'Obra Social', 'Estado', 'Notas admin']
  const rows = turnos.map(t => {
    const p = pacMap[t.userId]
    const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
    const osId = p?.obraSocialId
    return [
      fd.toLocaleDateString('es-AR'),
      t.horaInicio,
      `${p?.nombre || ''} ${p?.apellido || ''}`.trim(),
      p?.dni || '',
      osId ? (osMap[osId] || '') : 'Particular',
      t.estado,
      (t.notasAdmin || '').replace(/,/g, ';'),
    ]
  })
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `turnos-fisiosalud-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Estadisticas() {
  const [period, setPeriod] = useState(3)
  const [stats, setStats] = useState(null)
  const [pacientes, setPacientes] = useState([])
  const [allTurnos, setAllTurnos] = useState([])
  const [osMap, setOsMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [historico, pacientesList, obrasSocialesList, config, disponibilidad] = await Promise.all([
        getAllTurnosForStats(12),
        getPacientes(),
        getObrasSociales(),
        getConfig(),
        getDisponibilidad().catch(() => ({})),
      ])

      const periodStart = new Date()
      periodStart.setMonth(periodStart.getMonth() - period)
      const periodoTurnos = historico.filter(t => {
        const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
        return fd >= periodStart
      })

      const osMapLocal = Object.fromEntries(obrasSocialesList.map(o => [o.id, o.nombre]))
      setOsMap(osMapLocal)
      setPacientes(pacientesList)
      setAllTurnos(historico)

      setStats(computeStats({
        allTurnos: historico,
        periodoTurnos,
        pacientes: pacientesList,
        obrasSocialesList,
        config,
        disponibilidad,
        period,
      }))
      setLoading(false)
    }
    load()
  }, [period])

  const pacMap = Object.fromEntries(pacientes.map(p => [p.id, p]))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Estadísticas</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {!loading && (
            <button
              onClick={() => exportarCSV(allTurnos.filter(t => {
                const periodStart = new Date(); periodStart.setMonth(periodStart.getMonth() - period)
                const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
                return fd >= periodStart
              }), pacMap, osMap)}
              className="flex items-center gap-1.5 text-sm text-[#1565C0] hover:underline border border-[#1565C0] rounded-lg px-3 py-1.5"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner className="h-64" /> : (
        <>
          {/* ── Métricas principales ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard icon={TrendingUp}   label="Total turnos"       value={stats.total}              color="blue"   trend={stats.tendencia} />
            <MetricCard icon={CheckCircle2} label="Completados"        value={stats.completados}         color="green"  sub={`${stats.tasaAsistencia}% asistencia`} />
            <MetricCard icon={XCircle}      label="Cancelados"         value={stats.cancelados}          color="red"    />
            <MetricCard icon={Users}        label="Pacientes activos"  value={patientsInPeriod(allTurnos, period)} color="purple" sub={`${stats.nuevos} nuevos`} />
          </div>

          {/* ── Ingresos estimados ── */}
          {(allTurnos.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricCard icon={DollarSign}    label="Ingresos estimados"    value={stats.ingresoEstimado > 0 ? formatPesos(stats.ingresoEstimado) : '—'} color="green" sub={stats.ingresoEstimado === 0 ? 'Configurá precio en Ajustes' : ''} />
              <MetricCard icon={XCircle}       label="Perdido por cancelaciones" value={stats.perdidaCancelaciones > 0 ? formatPesos(stats.perdidaCancelaciones) : '—'} color="red" />
              <MetricCard icon={Activity}      label="Ocupación del consultorio" value={`${stats.porcOcupacion}%`} color="blue" sub={`${stats.completados} de ~${stats.capacidadTotal} cupos`} />
            </div>
          )}

          {/* ── Nuevos vs Recurrentes ── */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardBody className="text-center py-5">
                <p className="text-3xl font-bold text-[#1565C0]">{stats.nuevos}</p>
                <p className="text-sm text-gray-500 mt-1">Pacientes nuevos</p>
                <p className="text-xs text-gray-400">Primera sesión en este período</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-5">
                <p className="text-3xl font-bold text-green-600">{stats.recurrentes}</p>
                <p className="text-sm text-gray-500 mt-1">Pacientes recurrentes</p>
                <p className="text-xs text-gray-400">Ya habían venido antes</p>
              </CardBody>
            </Card>
          </div>

          {/* ── Gráfico turnos por mes + Por estado ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><h2 className="font-semibold text-gray-700">Turnos por mes</h2></CardHeader>
              <CardBody>
                {stats.monthlyData.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin datos en este período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={stats.monthlyData} barSize={14} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="completado" stackId="a" fill={CHART_COLORS.completado} name="Completado" />
                      <Bar dataKey="confirmado" stackId="a" fill={CHART_COLORS.confirmado} name="Confirmado" />
                      <Bar dataKey="pendiente"  stackId="a" fill={CHART_COLORS.pendiente}  name="Pendiente" />
                      <Bar dataKey="cancelado"  stackId="a" fill={CHART_COLORS.cancelado}  name="Cancelado" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="font-semibold text-gray-700">Por estado</h2></CardHeader>
              <CardBody>
                {stats.pieData.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={stats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                          {stats.pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {stats.pieData.map(d => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                            <span className="text-gray-600">{d.name}</span>
                          </div>
                          <span className="font-semibold text-gray-700">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ── Horarios pico + Días de semana ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><h2 className="font-semibold text-gray-700">Horarios más demandados</h2></CardHeader>
              <CardBody>
                {stats.horaData.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.horaData} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" fill="#1565C0" name="Turnos" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="font-semibold text-gray-700">Turnos por día de la semana</h2></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.dayData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#22c55e" name="Turnos" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>

          {/* ── Obras sociales ── */}
          {stats.osData.length > 0 && (
            <Card>
              <CardHeader><h2 className="font-semibold text-gray-700">Cobertura médica de pacientes atendidos</h2></CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.osData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} paddingAngle={2}>
                        {stats.osData.map((_, i) => <Cell key={i} fill={COLORS_OS[i % COLORS_OS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {stats.osData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS_OS[i % COLORS_OS.length] }} />
                        <span className="text-sm text-gray-700 flex-1 truncate">{d.name}</span>
                        <span className="font-bold text-sm text-gray-800">{d.value}</span>
                        <span className="text-xs text-gray-400">({Math.round(d.value / stats.completados * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ── Pacientes con tratamiento incompleto ── */}
          {stats.abandonos.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h2 className="font-semibold text-gray-700">Tratamientos incompletos</h2>
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{stats.abandonos.length}</span>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-xs text-gray-400 mb-3">Pacientes con sesiones indicadas que no completaron el tratamiento.</p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {stats.abandonos.map(p => {
                    const completadas = p.clinica?.sesionesCompletadas || 0
                    const indicadas = p.clinica?.sesionesIndicadas || 0
                    const pct = Math.round((completadas / indicadas) * 100)
                    return (
                      <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#1565C0] font-bold text-xs shrink-0">
                          {p.nombre?.[0]}{p.apellido?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.nombre} {p.apellido}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#1565C0] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 shrink-0">{completadas}/{indicadas} ses.</span>
                          </div>
                        </div>
                        <span className="text-xs text-amber-600 font-medium shrink-0">Faltan {indicadas - completadas}</span>
                      </div>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* ── Resumen del período ── */}
          <Card>
            <CardHeader><h2 className="font-semibold text-gray-700">Resumen del período</h2></CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: 'Total de turnos', value: stats.total },
                  { label: 'Completados', value: stats.completados, color: 'text-green-600' },
                  { label: 'Cancelados', value: stats.cancelados, color: 'text-red-500' },
                  { label: 'Pendientes de confirmar', value: stats.byStatus.pendiente, color: 'text-yellow-600' },
                  { label: 'Tasa de asistencia', value: `${stats.tasaAsistencia}%`, color: 'text-[#1565C0]' },
                  { label: 'Ocupación del consultorio', value: `${stats.porcOcupacion}%`, color: 'text-[#1565C0]' },
                  { label: 'Pacientes nuevos', value: stats.nuevos, color: 'text-purple-600' },
                  { label: 'Pacientes recurrentes', value: stats.recurrentes },
                  ...(stats.ingresoEstimado > 0 ? [
                    { label: 'Ingreso estimado', value: formatPesos(stats.ingresoEstimado), color: 'text-green-600' },
                    { label: 'Perdido por cancelaciones', value: formatPesos(stats.perdidaCancelaciones), color: 'text-red-500' },
                  ] : []),
                ].map(({ label, value, color = 'text-gray-800' }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className={`font-semibold text-sm ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}

function patientsInPeriod(allTurnos, period) {
  const periodStart = new Date()
  periodStart.setMonth(periodStart.getMonth() - period)
  const set = new Set(
    allTurnos
      .filter(t => {
        const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
        return fd >= periodStart && t.estado !== 'cancelado'
      })
      .map(t => t.userId)
  )
  return set.size
}
