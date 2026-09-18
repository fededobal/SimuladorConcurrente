#!/usr/bin/env sh
# Activa los hooks versionados en .githooks/. Se corre una vez por clon.
cd "$(dirname "$0")/.." || exit 1
chmod +x .githooks/*
git config core.hooksPath .githooks
echo "Hooks activados (.githooks). Para desactivarlos: git config --unset core.hooksPath"
