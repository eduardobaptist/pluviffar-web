import { useCallback, useEffect, useRef, useState, type DependencyList } from "react"

export interface FetchState<T> {
  /** Último resultado bem-sucedido (`undefined` até a primeira resposta). */
  data: T | undefined
  error: unknown
  /** Há uma requisição em andamento (inclusive recarregamentos com `data` já preenchido). */
  loading: boolean
  /** Refaz a requisição mantendo os dados atuais na tela enquanto carrega. */
  reload: () => void
  /** Atualiza os dados localmente (ex.: depois de salvar um formulário). */
  setData: (data: T) => void
}

export interface FetchOptions {
  /** Mantém os dados anteriores quando as dependências mudam (filtros/paginação: a tabela não "pisca"). */
  keepPrevious?: boolean
  /** Recarrega periodicamente (ms) enquanto a aba está visível. */
  intervalMs?: number
}

function sameDeps(a: DependencyList | null, b: DependencyList): boolean {
  return !!a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
}

/**
 * Requisição simples com `useEffect`: sem cache, refaz sempre que `deps` muda.
 * Passe `null` em `fn` para não buscar nada (ex.: nenhuma estação selecionada).
 * Respostas de efeitos antigos são descartadas via `AbortController`.
 */
export function useFetch<T>(fn: ((signal: AbortSignal) => Promise<T>) | null, deps: DependencyList, opts: FetchOptions = {}): FetchState<T> {
  const enabled = fn !== null
  const allDeps = [...deps, enabled]
  // `deps` de quando `data` foi obtido: se mudaram, `data` é de outra consulta (ex.: outra estação).
  const [result, setResult] = useState<{ data: T | undefined; deps: DependencyList | null }>({ data: undefined, deps: null })
  const [failure, setFailure] = useState<{ error: unknown; deps: DependencyList | null }>({ error: null, deps: null })
  const [loading, setLoading] = useState(enabled)
  const [tick, setTick] = useState(0)

  // `fn` costuma ser uma arrow nova a cada render; o efeito depende de `deps`, não dela.
  const fnRef = useRef(fn)
  fnRef.current = fn
  const depsRef = useRef(allDeps)
  depsRef.current = allDeps

  useEffect(() => {
    const run = fnRef.current
    if (!run) {
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    setLoading(true)
    setFailure({ error: null, deps: null })
    run(ctrl.signal).then(
      (data) => {
        if (ctrl.signal.aborted) return
        setResult({ data, deps: allDeps })
        setLoading(false)
      },
      (e: unknown) => {
        if (ctrl.signal.aborted) return
        setFailure({ error: e, deps: allDeps })
        setLoading(false)
      },
    )
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...allDeps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!opts.intervalMs || !enabled) return
    const id = setInterval(() => {
      if (document.visibilityState === "visible") reload()
    }, opts.intervalMs)
    return () => clearInterval(id)
  }, [opts.intervalMs, enabled, reload])

  const current = sameDeps(result.deps, allDeps)
  const failed = sameDeps(failure.deps, allDeps)
  const setData = useCallback(
    (data: T) => setResult({ data, deps: depsRef.current }),
    [],
  )

  return {
    data: current || opts.keepPrevious ? result.data : undefined,
    error: failed ? failure.error : null,
    loading: loading || (enabled && !current && !failed),
    reload,
    setData,
  }
}
