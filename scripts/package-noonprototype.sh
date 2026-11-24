#!/bin/sh
# Build and zip the prototype for www.noonprototype.com (Dockerfile at the top level of the zip).
set -e
cd "$(dirname "$0")/.."
npm run build
rm -rf .deploy noon-web-pdp-deploy.zip
mkdir -p .deploy
cp deploy/Dockerfile deploy/nginx.conf.template .deploy/
cp -R dist .deploy/dist
(cd .deploy && zip -qr ../noon-web-pdp-deploy.zip . -x '.DS_Store' '*/.DS_Store')
rm -rf .deploy
echo "→ noon-web-pdp-deploy.zip ($(du -h noon-web-pdp-deploy.zip | cut -f1))"
