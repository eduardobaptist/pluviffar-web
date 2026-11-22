import { Link, useLocation } from "react-router"
import { ArrowRight, BellRing, CloudRainWind, EyeOff, Radio, Smartphone } from "lucide-react"
import { useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { QueryError } from "@/components/common/query-error"
import { RainGaugeAnimation } from "@/components/home/rain-gauge-animation"
import { StationCarousel } from "@/components/home/station-carousel"
import { StationMap, type MapPoint } from "@/components/station/station-map"
import { useAuth } from "@/hooks/use-auth"
import { useFetch } from "@/hooks/use-fetch"
import { useGeolocation } from "@/hooks/use-geolocation"
import { publicApi } from "@/lib/api/endpoints"
import { fmt24h, mm24h } from "@/lib/format"

/** Âncora da seção "Como funciona" (link "Sobre" do cabeçalho e `/sobre` apontam para cá). */
const HOW_IT_WORKS_ID = "como-funciona"

/** Palavra em destaque no título: marca-texto em faixa baixa (tokens, legível nos dois temas). */
function Highlight({ children, tone }: { children: React.ReactNode; tone: "field" | "home" }) {
  return (
    <span
      className={
        tone === "field"
          ? "box-decoration-clone bg-linear-to-t from-rain-2 from-40% to-transparent to-40% -mx-0.5 px-1"
          : "box-decoration-clone bg-linear-to-t from-chart-2/35 from-40% to-transparent to-40% -mx-0.5 px-1"
      }
    >
      {children}
    </span>
  )
}

const STEPS = [
  {
    icon: CloudRainWind,
    title: "O pluviômetro mede sozinho",
    text: "A chuva cai no funil e enche uma pequena báscula. Cada vez que ela vira, o registrador conta uma fração de milímetro — sem ninguém precisar ir ao campo ler o copo.",
  },
  {
    icon: Radio,
    title: "A medição viaja até o Pluviffar",
    text: "O pluviômetro envia as leituras por rádio (ESP-NOW) para um gateway na sede da propriedade, que repassa tudo pela internet ao servidor do PluvIFFar.",
  },
  {
    icon: Smartphone,
    title: "Você vê em qualquer dispositivo",
    text: "Totais de hoje, 7 e 30 dias, gráfico, calendário de chuva e exportação para planilha. O produtor acompanha as suas estações; as públicas ficam abertas para todos aqui no site.",
  },
] as const

function HowItWorks() {
  const { me } = useAuth()
  return (
    <section id={HOW_IT_WORKS_ID} aria-labelledby="como-funciona-title" className="scroll-mt-14 border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 md:px-8 md:py-20">
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-sm font-medium text-primary">Como funciona</p>
          <h2 id="como-funciona-title" className="text-3xl font-bold tracking-[-0.02em] text-balance md:text-4xl">
            Do campo para o seu celular, a cada milímetro
          </h2>
          <p className="text-lg text-pretty text-muted-foreground">
            O PluvIFFar é um projeto de extensão do Instituto Federal Farroupilha que instala pluviômetros automáticos de baixo custo em propriedades rurais e
            disponibiliza os registros aos produtores e à comunidade.
          </p>
        </div>

        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.1fr] md:gap-14">
          <RainGaugeAnimation className="max-w-[20rem] sm:max-w-[23rem] md:max-w-[26rem]" />
          <ol className="flex flex-col gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-primary shadow-card">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                  {i < STEPS.length - 1 && <span aria-hidden className="mt-2 w-px flex-1 bg-border" />}
                </div>
                <div className="flex flex-col gap-1 pb-1">
                  <p className="text-xs font-medium text-muted-foreground">Passo {i + 1}</p>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-pretty text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EyeOff className="size-4 text-muted-foreground" aria-hidden /> Privacidade
              </CardTitle>
              <CardDescription className="text-pretty">
                Só aparecem aqui as estações que o produtor marcou como públicas, com nome, localização e chuva.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-primary text-primary-foreground ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="size-4" aria-hidden /> Tem uma estação?
              </CardTitle>
              <CardDescription className="text-pretty text-primary-foreground/85">
                Entre com a conta criada pela equipe do projeto para ver leituras, status do equipamento e exportar o histórico completo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link to={me ? "/painel" : "/entrar"}>
                  {me ? "Ir para minha área" : "Entrar"} <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

/** Rola até a âncora da URL (ex.: `/#como-funciona`) — também ao clicar de novo no mesmo link (muda `key`). */
function useScrollToHash() {
  const { hash, key } = useLocation()
  useEffect(() => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // Sem âncora (ex.: "Início" estando em /#como-funciona): volta ao topo.
    if (!hash) {
      window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" })
      return
    }
    const el = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (!el) return
    // Espera um quadro para o layout (mapa/carrossel) assentar antes de medir.
    const id = requestAnimationFrame(() => el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }))
    return () => cancelAnimationFrame(id)
  }, [hash, key])
}

export function HomePage() {
  const q = useFetch(() => publicApi.list(), [], { intervalMs: 5 * 60_000 })
  const geo = useGeolocation()
  useScrollToHash()
  const points = useMemo<MapPoint[]>(
    () => (q.data ?? []).map((s) => ({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude, info: [`24 h: ${fmt24h(s.last24hMm, s.lastReadingAt)}`], href: "public", mm: mm24h(s.last24hMm, s.lastReadingAt) })),
    [q.data],
  )

  return (
    <>
      <section className="overflow-hidden border-b bg-muted/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1fr_1.05fr] md:gap-12 md:px-8 md:py-16 lg:py-20">
          <div className="flex flex-col gap-5">
            <p className="text-sm font-medium text-muted-foreground">Instituto Federal Farroupilha</p>
            <h1 className="text-4xl leading-[1.15] font-bold tracking-[-0.02em] sm:text-5xl md:text-[2.75rem] lg:text-5xl">
              Chuva medida no <Highlight tone="field">campo</Highlight>,<br className="hidden lg:block" /> sem sair de <Highlight tone="home">casa</Highlight>.
            </h1>
            <p className="max-w-lg text-lg text-pretty text-muted-foreground">
              Veja <strong className="font-semibold text-foreground">quanto choveu</strong> nas estações da rede perto de você, medido por pluviômetros
              automáticos e atualizado a cada leitura.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="lg">
                <Link to="/mapa">
                  Abrir o mapa <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={{ hash: HOW_IT_WORKS_ID }}>Como funciona</Link>
              </Button>
            </div>
          </div>
          {q.error ? (
            <QueryError error={q.error} onRetry={q.reload} />
          ) : (
            <StationCarousel stations={q.data} geo={geo} onRetry={geo.retry} className="mx-auto max-w-lg md:max-w-none" />
          )}
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:px-8 md:pb-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Mapa de estações públicas</h2>
          <Button asChild variant="link" className="px-0">
            <Link to="/mapa">Tela cheia →</Link>
          </Button>
        </div>
        {q.error ? <QueryError error={q.error} onRetry={q.reload} /> : !q.data ? <Skeleton className="h-[420px] w-full rounded-xl" /> : <StationMap points={points} />}
      </section>

      <HowItWorks />
    </>
  )
}
