#!/bin/bash

cwd=$(pwd)
last_dir=$(basename "$cwd")
if [ "$last_dir" = "scripts" ]; then
    cd ..
fi

cd server
rm -rf build
rm -rf dist
pyinstaller --onefile --noconfirm --clean \
  --name "Mihari backend" \
  --add-data "libs:libs" \
  --copy-metadata tortoise-orm \
  --hidden-import=tortoise.backends.sqlite \
  main.py
touch dist/update
rm -rf build
cd ../desktop
rm -rf dist
npm run build
