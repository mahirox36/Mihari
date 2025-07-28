cd ../server
rmdir /s /q build
rmdir /s /q dist
pyinstaller --onefile --noconfirm --clean ^
  --name "Mihari backend" ^
  --icon "../assets/icon.ico" ^
  --add-data "libs;libs" ^
  --copy-metadata tortoise-orm ^
  --hidden-import=tortoise.backends.sqlite ^
  --version-file=version.txt ^
  main.py
rmdir /s /q build
cd ../desktop
rmdir /s /q dist
npm run build