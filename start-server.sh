#!/bin/bash

echo "Запуск BOOOMERANGS сервера с системой чекпоинтов..."

# Устанавливаем переменные окружения
export NODE_ENV=development
export PORT=5000

# Переходим в директорию проекта
cd /home/runner/workspace

# Запускаем сервер
exec npx tsx server/index.ts