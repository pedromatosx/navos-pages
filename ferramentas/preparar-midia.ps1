# Prepara a mídia da landing a partir do kit de gravações reais do app.
# Uso (PowerShell):  .\ferramentas\preparar-midia.ps1
# Requer ffmpeg no PATH. Nada aqui gera tela: só reduz, corta e extrai quadros das gravações.
param(
  [string]$Kit = "C:\Dev\NavOS\video-kit",
  [switch]$SoQuadros  # pula a recodificação dos vídeos
)
$ErrorActionPreference = "Stop"
$saida = Join-Path (Split-Path $PSScriptRoot -Parent) "midia"
New-Item -ItemType Directory -Force $saida, "$saida\tutorial" | Out-Null

# Clipes: 780 px de largura, 60 fps, quadro-chave a cada 0,5 s (os trechos em laço precisam saltar rápido).
$clipes = "01-abertura", "02-busca", "03-rota", "04-aulas", "05-abas", "06-claro"
if (-not $SoQuadros) {
  foreach ($c in $clipes) {
    ffmpeg -v error -y -i "$Kit\clipes\$c.mp4" -vf "scale=780:-2:flags=lanczos" -c:v libx264 -preset slow -crf 21 `
      -profile:v high -pix_fmt yuv420p -g 30 -movflags +faststart -an "$saida\$c.mp4"
  }
  # A rota em tamanho cheio: é a que enche a tela antes de recuar para dentro do aparelho.
  ffmpeg -v error -y -i "$Kit\clipes\03-rota.mp4" -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p `
    -g 30 -movflags +faststart -an "$saida\03-rota-hd.mp4"
}

# Capas e quadros parados, tirados dos próprios clipes.
$quadros = @(
  @{ clipe = "01-abertura"; t = 10.5; nome = "01-abertura" },
  @{ clipe = "02-busca";    t = 0.2;  nome = "02-busca" },
  @{ clipe = "03-rota";     t = 0.2;  nome = "03-rota" },
  @{ clipe = "04-aulas";    t = 0.2;  nome = "04-aulas" },
  @{ clipe = "05-abas";     t = 0.2;  nome = "05-abas" },
  @{ clipe = "06-claro";    t = 0.2;  nome = "06-claro" },
  @{ clipe = "05-abas";     t = 2.4;  nome = "05-radar" },
  @{ clipe = "05-abas";     t = 5.5;  nome = "05-academico" },
  @{ clipe = "03-rota";     t = 3.0;  nome = "tema-escuro" },
  @{ clipe = "06-claro";    t = 3.0;  nome = "tema-claro" }
)
foreach ($q in $quadros) {
  ffmpeg -v error -y -ss $q.t -i "$Kit\clipes\$($q.clipe).mp4" -frames:v 1 -vf "scale=780:-2:flags=lanczos" `
    -c:v libwebp -q:v 90 -compression_level 6 "$saida\$($q.nome).webp"
}

# Tutorial: as capturas da versão atual do app, nos dois temas.
foreach ($tema in "dark", "light") {
  foreach ($n in 1..6) {
    # Sem perda: é texto de interface, e o arquivo continua pequeno. (No ffmpeg, "-quality" não vale para o libwebp.)
    ffmpeg -v error -y -i "$Kit\tutorial\passo-$n-$tema.png" -c:v libwebp -lossless 1 -compression_level 6 "$saida\tutorial\passo-$n-$tema.webp"
  }
}

Get-ChildItem $saida -Recurse -File | Sort-Object FullName |
  ForEach-Object { "{0,9:N0} KB  {1}" -f ($_.Length / 1KB), $_.FullName.Substring($saida.Length + 1) }
