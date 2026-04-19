#!/bin/sh
set -e

echo "Running database seed..."
node dist/scripts/seed.js && echo "Seed complete." || echo "Seed failed — continuing with existing data."

echo "Starting server on port ${PORT:-8080}..."
exec node dist/main
