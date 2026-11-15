import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/layout/logo"

export function AboutPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <Logo className="[&_img]:h-16" />
      <h1 className="text-4xl font-bold tracking-[-0.02em]">Sobre o PluvIFFar</h1>
      <p className="text-lg text-muted-foreground">
        Projeto de extensão do Instituto Federal Farroupilha que instala pluviômetros de baixo custo em propriedades rurais e disponibiliza os registros aos
        produtores e à comunidade.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Como os dados chegam</CardTitle>
          <CardDescription className="font-mono text-xs">Pluviômetro ESP8266 → ESP-NOW → Gateway ESP8266 → Wi-Fi/MQTT → Servidor → Portal</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Cada pluviômetro envia uma leitura a cada intervalo configurado. Quando faltam leituras, o acumulado é mostrado como <strong>parcial</strong> e os
          intervalos sem pacote aparecem como <strong>sem dados</strong> — a ausência de mensagem nunca vira “zero chuva”.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Privacidade</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Só aparecem aqui as estações que o produtor marcou como públicas, com nome, localização e chuva. Dados do produtor e identificadores de hardware nunca
          são expostos.
        </CardContent>
      </Card>
    </div>
  )
}
