import { useEffect, useState } from 'react'
import { getConfig, updateConfig } from '../services/config.service'

export function useConfig() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getConfig().then(c => { setConfig(c); setLoading(false) })
  }, [])

  async function save(data) {
    await updateConfig(data)
    setConfig(prev => ({ ...prev, ...data }))
  }

  return { config, loading, save }
}
