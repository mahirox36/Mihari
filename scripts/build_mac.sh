#!/bin/bash
cd ../server
rm -rf build
m -rf dist
pyinstaller --onefile --noconfirm --clean \
  --name "Mihari backend" \
  --icon "../assets/icon.ico" \
  --add-data "libs:libs" \
  --copy-metadata tortoise-orm \
  --hidden-import=tortoise.backends.sqlite \
  --osx-bundle-identifier "online.mahirou.mihari.backend" \
  main.py
rm -rf build
cd ../desktop
rm -rf dist
npm run build
