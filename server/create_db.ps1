# create_db.ps1
# 사용법: PowerShell에서 관리자 권한으로 실행하세요.
# 실행: powershell -ExecutionPolicy Bypass -File .\create_db.ps1

$psqlDefault = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'

# psql 경로가 없으면 Program Files 내에서 검색
if (-Not (Test-Path $psqlDefault)) {
  $found = Get-ChildItem 'C:\Program Files\PostgreSQL' -Recurse -Filter psql.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  if ($found) { $psqlDefault = $found }
}

if (-Not (Test-Path $psqlDefault)) {
  Write-Error "psql 실행 파일을 찾을 수 없습니다. Postgres 설치 경로를 확인하세요."
  exit 1
}

Write-Host "사용할 psql: $psqlDefault"

# 입력값 (기본값 사용)
$superUser = Read-Host "슈퍼유저 이름을 입력하세요 (기본: postgres)"
if ([string]::IsNullOrWhiteSpace($superUser)) { $superUser = 'postgres' }

# 생성할 계정과 비밀번호 (이미 알려주신 값 사용)
$newUser = 'tmdrudfuf'
$newPass = 'Lds6597000*'
$dbName = 'ai_study_assistant'

# SQL: 역할이 없으면 생성, DB 생성(이미 있으면 오류 발생 가능하지만 처리)
$sql = @"
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$newUser') THEN
    CREATE ROLE $newUser WITH LOGIN PASSWORD '$newPass';
  END IF;
END
$$;
-- Create database if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '$dbName') THEN
    PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE $dbName WITH OWNER = $newUser');
  END IF;
END
$$;
GRANT ALL PRIVILEGES ON DATABASE $dbName TO $newUser;
"@

# 일부 시스템에 dblink가 없을 수 있으므로 시도하는 방식 변경: 간단히 CREATE DATABASE (실패해도 계속)
$sqlSimple = "CREATE DATABASE $dbName WITH OWNER = $newUser; GRANT ALL PRIVILEGES ON DATABASE $dbName TO $newUser;"

Write-Host "Postgres 슈퍼유저($superUser) 비밀번호를 입력하면 한 번만 묻습니다."

# 실행 (단일 명령으로 처리해서 비밀번호는 한 번만 물음)
try {
  & $psqlDefault -U $superUser -h 127.0.0.1 -p 5432 -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$newUser') THEN CREATE ROLE $newUser WITH LOGIN PASSWORD '$newPass'; END IF; END $$;" ;
  # Create DB (this may fail if permissions/owner issues)
  & $psqlDefault -U $superUser -h 127.0.0.1 -p 5432 -c "$sqlSimple"
  Write-Host "사용자 및 데이터베이스 생성 명령을 실행했습니다."
} catch {
  Write-Error "psql 실행 중 오류: $_"
  exit 1
}

# 마이그레이션 실행
Write-Host "이제 마이그레이션을 실행합니다 (server 폴더)."
Push-Location ..\
if (Test-Path "server\migrate.js") {
  Push-Location server
  try {
    node migrate.js
    Write-Host "마이그레이션 완료 시도 완료."
  } catch {
    Write-Error "마이그레이션 실행 중 오류: $_"
  } finally {
    Pop-Location
  }
} else {
  Write-Warning "server/migrate.js를 찾을 수 없습니다. 수동으로 마이그레이션을 실행하세요."
}
Pop-Location

Write-Host "완료. 이제 'npm run server'로 백엔드를 시작하세요."