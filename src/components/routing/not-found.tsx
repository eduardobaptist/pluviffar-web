import { Component, type ErrorInfo, type ReactNode } from "react"
import { Link } from "react-router"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { QueryError } from "@/components/common/query-error"

export function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>Página não encontrada</EmptyTitle>
          <EmptyDescription>O endereço acessado não existe ou foi removido.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

/** Erro inesperado de renderização. O erro é limpo quando `resetKey` muda (ex.: ao navegar). */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: unknown }> {
  override state: { error: unknown } = { error: null }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  override componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl p-6">
          <QueryError error={this.state.error} onRetry={() => this.setState({ error: null })} title="Algo deu errado" />
        </div>
      )
    }
    return this.props.children
  }
}
