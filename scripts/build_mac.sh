#!/bin/bash

cwd=$(pwd)
last_dir=$(basename "$cwd")
if [ "$last_dir" = "scripts" ]; then
    cd ..
fi

cd server
rm -rf build
rm -rf dist
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt 
pyinstaller --onefile --noconfirm --clean \
  --name "Mihari backend" \
  --icon "../assets/icon.icns" \
  --add-data "libs:libs" \
  --copy-metadata tortoise-orm \
  --hidden-import=tortoise.backends.sqlite \
  --osx-bundle-identifier "online.mahirou.mihari.backend" \
  main.py
touch dist/update
rm -rf build
cd ../desktop
rm -rf dist
npm ci
npm run build
