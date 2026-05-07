@echo off

set "cwd=%cd%"
for %%a in ("%cwd%") do set "last_dir=%%~nxa"
if /i "%last_dir%"=="scripts" (
    cd ..
)

cd server
rmdir /s /q build
rmdir /s /q dist
pyinstaller --onefile --noconfirm --clean ^
  --name "Mihari backend" ^
  --icon "../assets/icon.ico" ^
  --add-data "libs;libs" ^
  --copy-metadata tortoise-orm ^
  --copy-metadata aerich ^
  --hidden-import=tortoise.backends.sqlite ^
  --hidden-import=aerich ^
  --hidden-import=aerich.ddl ^
  --hidden-import=aerich.ddl.sqlite ^
  --hidden-import=aerich.models ^
  --hidden-import=aerich.inspectdb ^
  --hidden-import=aerich.inspectdb.sqlite ^
  --version-file=../scripts/version.txt ^
  main.py
type nul > dist/update
rmdir /s /q build
cd ../desktop
rmdir /s /q dist
npm run build win
PAUSE