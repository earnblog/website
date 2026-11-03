# 临界博客:换 PayPal 收款账户(也用于第一次开通 PayPal 收款)。
# 双击 换PayPal.bat,或:
#   powershell -File tools\swap_paypal.ps1 [-ClientId X -Secret Y -Operator "Name"] [-DryRun] [-Yes]
# 和 tinyfilelab 用同一个 PayPal 账户时,填同一对 Client ID / Secret 即可。
param(
  [string]$ClientId = "",
  [string]$Secret = "",
  [string]$Operator = "",
  [switch]$DryRun,
  [switch]$Yes
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root    = Split-Path -Parent $PSScriptRoot
$Config  = Join-Path $Root "src\config.mjs"
$Site    = "https://fncuthdert.com"
$LogFile = Join-Path $Root "换PayPal-日志.txt"
$Stamp   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$env:CLOUDFLARE_ACCOUNT_ID = "11bb79d183a456eb17025a2f74957ee4"

function Log($msg) { Write-Host $msg; Add-Content -Path $LogFile -Value "[$Stamp] $msg" -Encoding UTF8 }
function Fail($msg) {
  Log "失败: $msg"
  Write-Host ""
  Write-Host "中途失败就把这个窗口截图发给 Claude。" -ForegroundColor Yellow
  exit 1
}
function Ask($label, $default) {
  if ($default) { $v = Read-Host "$label (回车 = $default)"; if (-not $v) { $v = $default } } else { $v = Read-Host $label }
  return $v.Trim()
}

Write-Host ""
Write-Host "=== 临界博客 换 PayPal 账户 ===" -ForegroundColor Cyan
Write-Host "需要:PayPal 开发者后台 Live 应用的 Client ID 和 Secret(和 tinyfilelab 用同一个账户就填同一对)。"
Write-Host "脚本会:验证凭据 -> 写进 Cloudflare secrets -> 改页脚运营者名 -> 推送触发重新部署 -> 自测会员计划和下单。"
Write-Host ""

$cfgText = Get-Content -Raw -Encoding UTF8 $Config
$curOp = ""
if ($cfgText -match "operator:\s*'([^']*)'") { $curOp = $Matches[1] }
Write-Host "现在页脚和条款里的运营者: $curOp"

if (-not $ClientId) { $ClientId = Ask "新的 Client ID" "" }
if (-not $Secret)   { $Secret   = Ask "新的 Secret" "" }
if (-not $Operator) { $Operator = Ask "运营者名称(PayPal 账户上的名字,写进条款和页脚)" $curOp }
if ($ClientId.Length -lt 40 -or $Secret.Length -lt 40) { Fail "Client ID 或 Secret 长度不对,PayPal 的都是 80 位左右。检查有没有粘漏。" }
if ($ClientId -match '[^\x20-\x7E]' -or $Secret -match '[^\x20-\x7E]') { Fail "Client ID 或 Secret 里有不可见字符,重新从 PayPal 页面复制。" }
if ($Operator -match "'") { Fail "运营者名称里不能有单引号。" }

Write-Host ""
Write-Host "将要执行:" -ForegroundColor Cyan
Write-Host "  Client ID : $($ClientId.Substring(0,12))..."
Write-Host "  运营者    : $curOp  ->  $Operator"
if ($DryRun) { Write-Host "  (DryRun:只验证凭据和订阅权限,不写 secret、不改文件、不部署)" -ForegroundColor Yellow }
if (-not $Yes) {
  $go = Read-Host "确认继续?(y/N)"
  if ($go -ne "y" -and $go -ne "Y") { Write-Host "已取消。"; exit 0 }
}
Log "开始换 PayPal: 运营者 $curOp -> $Operator, Client ID $($ClientId.Substring(0,12))..."

# ---- 1. 验证凭据 + 订阅权限 ----
Write-Host "[1/5] 验证凭据..." -ForegroundColor Cyan
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${ClientId}:${Secret}"))
try {
  $tok = Invoke-RestMethod -Method Post -Uri "https://api-m.paypal.com/v1/oauth2/token" `
    -Headers @{ Authorization = "Basic $basic" } -Body "grant_type=client_credentials" `
    -ContentType "application/x-www-form-urlencoded"
} catch {
  $detail = ""; if ($_.ErrorDetails) { $detail = $_.ErrorDetails.Message }
  Fail "PayPal 不认这对凭据。$detail  常见原因:复制到了 Sandbox 的而不是 Live 的;或者 Secret 已被重置。"
}
Log "凭据有效, app_id=$($tok.app_id)"
# 会员是按月订阅,要用到 Subscriptions 接口:先读一次计划列表,确认这个应用有权限
try {
  $null = Invoke-RestMethod -Uri "https://api-m.paypal.com/v1/billing/plans?page_size=1" -Headers @{ Authorization = "Bearer $($tok.access_token)" }
  Log "订阅接口可用"
} catch {
  $detail = ""; if ($_.ErrorDetails) { $detail = $_.ErrorDetails.Message }
  Fail "这个 PayPal 应用没有订阅(Subscriptions)权限: $detail  去 PayPal 开发者后台 -> 这个 Live 应用 -> Features,把 Subscriptions 勾上再重跑。"
}
if ($DryRun) { Log "DryRun 完成,线上没动。"; exit 0 }

# Cloudflare 认证走 wrangler OAuth(movocardnow 账号);没登录就先跑一次 npx wrangler login

# ---- 2. Pages secrets ----
Write-Host "[2/5] 写入 Cloudflare secrets..." -ForegroundColor Cyan
$obj = [ordered]@{ PAYPAL_CLIENT_ID = $ClientId; PAYPAL_SECRET = $Secret; PAYPAL_ENV = "live" }
# npx 遇到 wrangler 新版本会停下来问"要不要安装",输出被收起来看不见就会一直卡住,所以命令都带 --yes
$tmp = Join-Path $env:TEMP ("linjie-secrets-" + [Guid]::NewGuid().ToString("N") + ".json")
# 不能带 BOM:BOM 进了 secret,Worker 里 btoa 会报 Latin1 错
[IO.File]::WriteAllText($tmp, ($obj | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
try {
  $out = & cmd /c "npx.cmd --yes wrangler pages secret bulk `"$tmp`" --project-name=website 2>&1" | Out-String
} finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
if ($out -notmatch "(?i)success") { Write-Host $out; Fail "写 secret 没成功。如果提示未登录,先在命令行跑一次: npx wrangler login" }
Log "Cloudflare secrets 已写入(3 个)"

# ---- 3. 运营者名 ----
Write-Host "[3/5] 改运营者名..." -ForegroundColor Cyan
if ($Operator -ne $curOp) {
  $cfgText = $cfgText -replace "operator:\s*'[^']*'", ("operator: '" + $Operator + "'")
  [IO.File]::WriteAllText($Config, $cfgText, (New-Object Text.UTF8Encoding($false)))
  Log "运营者已改为 $Operator"
} else { Log "运营者没变" }

# ---- 4. 推送(secrets 只对新部署生效;博客是 GitHub 推送自动部署) ----
Write-Host "[4/5] 推送触发部署..." -ForegroundColor Cyan
Push-Location $Root
# git 把正常进度("From https://…")写到 stderr,PowerShell 5.1 在 Stop 模式下会把它当成错误中断脚本:
# 这一段临时改成 Continue,只看 git 的退出码判断成败
$ErrorActionPreference = "Continue"
try {
  & git add src/config.mjs | Out-Null
  & git commit -m "换 PayPal 收款账户(运营者 $Operator)" --allow-empty | Out-Null
  # 每日发文的云端任务也在往 GitHub 推,先把它的新文章拉下来再推,否则会被拒
  & git pull --rebase --autostash origin main 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { Fail "git pull 失败(可能有冲突),找 Claude" }
  & git push origin main 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { Fail "git push 失败" }
} finally { Pop-Location; $ErrorActionPreference = "Stop" }
Log "已推送,等 Cloudflare 构建(约 1-2 分钟)"

# ---- 5. 自测 ----
Write-Host "[5/5] 等部署完成并自测..." -ForegroundColor Cyan
$cfg = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 10
  try { $cfg = Invoke-RestMethod "$Site/api/pp/config?t=$(Get-Random)" } catch { continue }
  if ($cfg.open -and $cfg.clientId -eq $ClientId) { break }
}
if (-not $cfg -or $cfg.clientId -ne $ClientId) { Fail "5 分钟了线上还不是新账号。打开 $Site/api/pp/config 看看,还不对就找 Claude" }
$missing = @($cfg.tiers | Where-Object { -not $_.planId })
if ($missing.Count -gt 0) { Fail "会员计划没建出来: $($cfg | ConvertTo-Json -Depth 4)" }
Log "会员计划: $(($cfg.tiers | ForEach-Object { "$($_.id) `$$($_.price) = $($_.planId)" }) -join '; ')"
try {
  $o = Invoke-RestMethod -Method Post -Uri "$Site/api/pp/order" -Body '{"kind":"tip","amount":1}' -ContentType "application/json"
  Log "自测建单成功: 订单 $($o.id)(未付款,PayPal 会自动作废)"
} catch {
  $detail = ""; if ($_.ErrorDetails) { $detail = $_.ErrorDetails.Message }
  Fail "网站能打开但建单失败: $detail"
}

Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Green
Write-Host "PayPal 应用: $($tok.app_id)"
Write-Host "运营者    : $Operator"
Write-Host "日志      : $LogFile"
Write-Host "最后自己打开 $Site/subscribe/ 看三档下面是不是都有 PayPal 订阅按钮,不用真付。"
Log "完成"
