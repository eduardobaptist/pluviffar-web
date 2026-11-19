import { useEffect, useState } from "react"
import { fmtMmValue } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Gotas de chuva entre a nuvem e o funil: posição x e atraso (s) de cada uma. */
const RAIN = [
  [104, 0],
  [120, 0.55],
  [136, 0.2],
  [152, 0.75],
  [168, 0.35],
  [184, 0.9],
  [198, 0.1],
  [112, 1.05],
  [176, 0.6],
] as const

/** Ciclo do pulso (s) e instante em que o pacote chega ao celular — iguais aos keyframes `.pluvio-*` do index.css. */
const PULSE_MS = 1600
const FIRST_ARRIVAL_MS = 1950
const START_MM = 12.4
const MAX_MM = 16

const BARS = [18, 30, 12, 40, 24, 34]
const DAYS = ["S", "T", "Q", "Q", "S", "S", "D"]

/** Total "de hoje" na tela do celular: soma 0,2 mm a cada pacote que chega (estático com reduced-motion). */
function useTicker() {
  const [mm, setMm] = useState(START_MM)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let interval: number | undefined
    const tick = () => setMm((v) => (v + 0.2 > MAX_MM ? START_MM : Math.round((v + 0.2) * 10) / 10))
    const first = window.setTimeout(() => {
      tick()
      interval = window.setInterval(tick, PULSE_MS)
    }, FIRST_ARRIVAL_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(interval)
    }
  }, [])
  return mm
}

/**
 * Hero da home: o pluviômetro de báscula (ao fundo, à esquerda) recebe chuva, a báscula vira e o
 * registrador envia o pulso, que chega ao celular em destaque — notificação "+0,2 mm", total do dia
 * subindo e barra do gráfico crescendo. Só tokens do design system (dois temas); com
 * `prefers-reduced-motion` fica estático. Keyframes em `index.css` (`.pluvio`).
 */
export function RainGaugeAnimation({ className }: { className?: string }) {
  const mm = useTicker()

  return (
    <div className={cn("pluvio relative mx-auto w-full max-w-[26rem]", className)}>
      <div aria-hidden className="absolute top-[18%] left-[4%] aspect-square w-1/2 rounded-full bg-chart-2/15 blur-3xl" />
      <div aria-hidden className="absolute top-[8%] right-[2%] aspect-square w-3/5 rounded-full bg-success/20 blur-3xl" />
      <svg
        viewBox="52 22 306 304"
        role="img"
        aria-label="Ilustração animada: o pluviômetro de báscula mede a chuva e envia cada medição para o celular"
        className="relative h-auto w-full overflow-visible"
      >
        {/* ---------- pluviômetro (reduzido, ao fundo) ---------- */}
        <g transform="translate(0 64) scale(0.78)">
          <g className="pluvio-cloud">
            <circle cx="112" cy="62" r="20" />
            <circle cx="148" cy="46" r="29" />
            <circle cx="186" cy="58" r="22" />
            <rect x="90" y="58" width="120" height="26" rx="13" />
          </g>
          <g stroke="var(--chart-2)" strokeWidth="2.5" strokeLinecap="round">
            {RAIN.map(([x, delay], i) => (
              <line key={i} className="pluvio-drop" x1={x} y1="88" x2={x - 2} y2="97" style={{ animationDelay: `${delay}s` }} />
            ))}
          </g>

          <line x1="40" y1="300" x2="250" y2="300" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
          <g stroke="var(--success)" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M60 300 q2 -10 -3 -15 M64 300 q0 -12 6 -16 M68 300 q1 -7 5 -9" />
            <path d="M86 300 q1 -6 -2 -9 M90 300 q0 -8 4 -10" />
          </g>

          <rect x="104" y="128" width="92" height="170" rx="8" fill="var(--card)" stroke="var(--muted-foreground)" strokeOpacity="0.55" strokeWidth="2" />
          <path d="M106 131 H194 L156 170 H144 Z" className="pluvio-funnel" />
          <rect x="146" y="168" width="8" height="12" rx="2" className="pluvio-funnel" />
          <rect x="88" y="119" width="124" height="11" rx="4" fill="var(--card)" stroke="var(--muted-foreground)" strokeOpacity="0.55" strokeWidth="2" />

          <rect x="114" y="180" width="72" height="88" rx="6" fill="var(--muted)" stroke="var(--border)" strokeWidth="1.5" />
          <circle className="pluvio-drip" cx="150" cy="186" r="2.6" fill="var(--chart-2)" />
          <g className="pluvio-bucket">
            <path className="pluvio-water-l" d="M149 231 H129 L125 223 H149 Z" />
            <path className="pluvio-water-r" d="M151 231 H171 L175 223 H151 Z" />
            <path d="M120 214 L128 232 H172 L180 214 M150 232 V207" fill="none" stroke="var(--foreground)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
          <path d="M150 234 L143 246 H157 Z" fill="var(--muted-foreground)" />
          <circle cx="150" cy="233" r="2.5" fill="var(--foreground)" />
          <circle className="pluvio-dump-l" cx="127" cy="244" r="2.4" fill="var(--chart-2)" />
          <circle className="pluvio-dump-r" cx="173" cy="244" r="2.4" fill="var(--chart-2)" />

          <rect x="196" y="236" width="28" height="36" rx="5" fill="var(--card)" stroke="var(--muted-foreground)" strokeOpacity="0.55" strokeWidth="2" />
          <circle className="pluvio-led" cx="210" cy="262" r="3.5" fill="var(--success)" />
          <line x1="216" y1="236" x2="216" y2="206" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="216" cy="204" r="3" fill="var(--muted-foreground)" />
          <g fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round">
            <path className="pluvio-wave" d="M224 197 a11 11 0 0 1 0 14" />
            <path className="pluvio-wave pluvio-wave-2" d="M230 191 a19 19 0 0 1 0 26" />
          </g>
        </g>

        {/* ---------- sinal: antena → celular ---------- */}
        <path d="M176 214 Q190 150 222 118" fill="none" stroke="var(--success)" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="2 4" strokeLinecap="round" />
        <circle className="pluvio-packet" r="3.5" fill="var(--success)" />

        {/* ---------- celular (protagonista) ---------- */}
        <ellipse className="pluvio-phone-shadow" cx="284" cy="318" rx="52" ry="5" fill="var(--foreground)" opacity="0.1" />
        <g className="pluvio-phone">
          <rect className="pluvio-phone-frame" x="216" y="38" width="136" height="268" rx="24" />
          <rect x="222" y="44" width="124" height="256" rx="19" fill="var(--background)" />
          <rect className="pluvio-screen-ring" x="222" y="44" width="124" height="256" rx="19" fill="none" stroke="var(--success)" strokeWidth="2" />
          <rect className="pluvio-phone-frame" x="266" y="50" width="36" height="10" rx="5" />

          {/* status bar */}
          <text x="234" y="58" fontSize="7" fontWeight="600" fill="var(--foreground)">
            9:41
          </text>
          <rect x="318" y="52.5" width="14" height="6" rx="1.5" fill="none" stroke="var(--foreground)" strokeOpacity="0.7" />
          <rect x="319.5" y="54" width="9" height="3" rx="0.5" fill="var(--foreground)" opacity="0.7" />

          {/* app */}
          <text x="234" y="84" fontSize="8" fill="var(--muted-foreground)">
            Minha estação
          </text>
          <circle cx="308" cy="81.5" r="2.5" fill="var(--success)" />
          <text x="313" y="84" fontSize="7" fill="var(--muted-foreground)">
            Online
          </text>
          <text x="234" y="104" fontSize="7.5" fill="var(--muted-foreground)">
            Chuva hoje
          </text>
          <text x="233" y="130" fontSize="26" fontWeight="700" letterSpacing="-0.5" fill="var(--foreground)" className="tabular-nums">
            {fmtMmValue(mm)}
            <tspan fontSize="11" fontWeight="500" fill="var(--muted-foreground)" dx="3">
              mm
            </tspan>
          </text>

          <rect x="230" y="144" width="108" height="112" rx="10" fill="var(--card)" stroke="var(--border)" />
          <text x="238" y="160" fontSize="7" fill="var(--muted-foreground)">
            Últimos 7 dias
          </text>
          <g fill="var(--rain)">
            {BARS.map((h, i) => (
              <rect key={i} x={238 + i * 14} y={236 - h} width="9" height={h} rx="2" opacity="0.4" />
            ))}
            <rect className="pluvio-bar" x="322" y="186" width="9" height="50" rx="2" />
          </g>
          <line x1="236" y1="236.5" x2="333" y2="236.5" stroke="var(--border)" />
          {DAYS.map((d, i) => (
            <text key={i} x={242.5 + i * 14} y="248" fontSize="6" textAnchor="middle" fill="var(--muted-foreground)">
              {d}
            </text>
          ))}

          <rect x="230" y="264" width="108" height="24" rx="8" fill="var(--muted)" />
          <circle cx="241" cy="276" r="3" fill="var(--success)" className="pluvio-led" />
          <text x="249" y="279" fontSize="7.5" fill="var(--foreground)">
            Última leitura: agora
          </text>

          {/* notificação */}
          <g className="pluvio-toast">
            <rect x="228" y="64" width="112" height="30" rx="9" fill="var(--card)" stroke="var(--border)" className="pluvio-toast-box" />
            <circle cx="242" cy="79" r="7" fill="var(--primary)" />
            <path d="M242 74.5 q3.2 3.6 3.2 5.6 a3.2 3.2 0 0 1 -6.4 0 q0 -2 3.2 -5.6 z" fill="var(--primary-foreground)" />
            <text x="254" y="76" fontSize="6" fill="var(--muted-foreground)">
              PluvIFFar · agora
            </text>
            <text x="254" y="86" fontSize="7.5" fontWeight="600" fill="var(--foreground)">
              Choveu +0,2 mm
            </text>
          </g>
        </g>
      </svg>
    </div>
  )
}
