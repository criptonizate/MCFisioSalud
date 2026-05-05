import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { getAllTurnosForStats } from '../../services/turnos.service'
import { getPacientes } from '../../services/pacientes.service'
import { TrendingUp, Users, CheckCircle2, XCircle, Clock } from 'lucide-react'

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DAYS_ES   = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const CHART_COLORS = { completado:'#22c55e', confirmado:'#1565C0', pendiente:'#eab308', cancelado:'#ef4444', propuesto:'#a855f7' }
const PERIODS = [{ label: '1 mes', value: 1 }, { label: '3 meses', value: 3 }, { label: '6 meses', value: 6 }, { label: '12 meses', value: 12 }]

function computeStats(turnos) {
  const byMonth = {}
  const byStatus = { completado: 0, confirmado: 0, pendiente: 0, cancelado: 0, propuesto: 0 }
  const byDay = { Lun: 0, Mar: 0, Mié: 0, Jue: 0, Vie: 0, Sáb: 0 }

  turnos.forEach(t => {
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

  const total = turnos.length
  const completados = byStatus.completado
  const cancelados  = byStatus.cancelado
  const denominator = total - byStatus.pendiente - byStatus.propuesto
  const tasaAsistencia = denominator > 0 ? Math.round((completados / denominator) * 100) : 0

  return { monthlyData, pieData, dayData, byStatus, total, completados, cancelados, tasaAsistencia }
}

function MetricCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = { blue: 'bg-blue-50 text-[#1565C0]', green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600', yellow: 'bg-yellow-50 text-yellow-600', purple: 'bg-purple-50 text-purple-600' }
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
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

export default function Estadisticas() {
  const [period, setPeriod] = useState(3)
  const [stats, setStats] = useState(null)
  const [totalPacientes, setTotalPacientes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [turnos, pacientes] = await Promise.all([
        getAllTurnosForStats(period),
        getPacientes(),
      ])
      setStats(computeStats(turnos))
      setTotalPacientes(pacientes.length)
      setLoading(false)
    }
    load()
  }, [period])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Estadísticas</h1>
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
      </div>

      {loading ? <Spinner className="h-64" /> : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard icon={TrendingUp}   label="Total turnos"    value={stats.total}           color="blue"   />
            <MetricCard icon={CheckCircle2} label="Completados"     value={stats.completados}      color="green"  sub={`${stats.tasaAsistencia}% asistencia`} />
            <MetricCard icon={XCircle}      label="Cancelados"      value={stats.cancelados}       color="red"    />
            <MetricCard icon={Clock}        label="Pendientes"      value={stats.byStatus.pendiente} color="yellow" />
            <MetricCard icon={Users}        label="Pacientes"       value={totalPacientes}         color="purple" />
          </div>

          {/* Charts row 1 */}
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
                      <Bar dataKey="completado" stackId="a" fill={CHART_COLORS.completado} name="Completado" radius={[0,0,0,0]} />
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

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><h2 className="font-semibold text-gray-700">Turnos por día de la semana</h2></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.dayData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#1565C0" name="Turnos" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

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
                    { label: 'Pacientes registrados', value: totalPacientes },
                  ].map(({ label, value, color = 'text-gray-800' }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className={`font-semibold text-sm ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
