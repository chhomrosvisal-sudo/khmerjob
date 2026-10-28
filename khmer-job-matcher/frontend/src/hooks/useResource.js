import { useCallback, useEffect, useState } from 'react'

// Aborting old requests prevents a slower filter response from replacing new results.
export function useResource(api, path, revision = 0) {
  const [record, setRecord] = useState(null)
  const [retry, setRetry] = useState(0)
  const reload = useCallback(() => setRetry(value => value + 1), [])
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    api(path, { signal: controller.signal }).then(
      data => { if (!controller.signal.aborted) setRecord({ path, revision, retry, data }) },
      error => { if (!controller.signal.aborted) setRecord({ path, revision, retry, error: error.message }) },
    )
    return () => controller.abort()
  }, [api, path, revision, retry])
  const current = record?.path === path && record?.revision === revision && record?.retry === retry
  return { data: current ? record.data : null, error: current ? record.error : '', loading: Boolean(path) && !current, reload }
}
