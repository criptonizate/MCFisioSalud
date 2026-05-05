import { useEffect, useState } from 'react'
import { getDisponibilidad, getBloqueos } from '../services/disponibilidad.service'
import { getConfig } from '../services/config.service'

export function useDisponibilidad() {
  const [disponibilidad, setDisponibilidad] = useState({})
  const [bloqueos, setBloqueos] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [disp, bloq, cfg] = await Promise.all([getDisponibilidad(), getBloqueos(), getConfig()])
    setDisponibilidad(disp)
    setBloqueos(bloq)
    setConfig(cfg)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { disponibilidad, bloqueos, config, loading, reload: load }
}
