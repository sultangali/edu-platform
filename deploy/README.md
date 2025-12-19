# EduPlatform Deployment Guide

## Сервер: 34.88.163.32 (Google Cloud VPS)

## Быстрый деплой

### Шаг 1: Подключитесь к серверу
```bash
ssh username@34.88.163.32
```

### Шаг 2: Скопируйте проект на сервер
```bash
# С локальной машины (используйте один из способов):

# Способ 1: Используя скрипт upload-to-server.sh
cd /path/to/edu-platform/deploy
./upload-to-server.sh

# Способ 2: Используя git clone (если проект в репозитории)
ssh username@34.88.163.32
sudo mkdir -p /var/www/edu-platform
sudo chown -R $USER:$USER /var/www/edu-platform
git clone <your-repo-url> /var/www/edu-platform

# Способ 3: Используя scp/rsync
scp -r /path/to/edu-platform/* username@34.88.163.32:/var/www/edu-platform/
```

### Шаг 3: Запустите скрипт установки системы
```bash
ssh username@34.88.163.32
cd /var/www/edu-platform/deploy
chmod +x full-deploy.sh setup-app.sh check-files.sh
./full-deploy.sh
```

### Шаг 3.1: Проверьте наличие файлов (опционально)
```bash
cd /var/www/edu-platform/deploy
./check-files.sh
```

### Шаг 4: Настройте переменные окружения
```bash
# Скопируйте примеры
cp /var/www/edu-platform/deploy/server.env.example /var/www/edu-platform/server/.env
cp /var/www/edu-platform/deploy/client.env.example /var/www/edu-platform/client/.env

# Отредактируйте server/.env
nano /var/www/edu-platform/server/.env
```

**Обязательно измените:**
- `JWT_SECRET` - сгенерируйте случайную строку
- `SMTP_USER` и `SMTP_PASS` - для отправки email
- `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` - для Google OAuth
- `GEMINI_API_KEY` - для AI функций

### Шаг 5: Запустите приложение
```bash
cd /var/www/edu-platform/deploy
./setup-app.sh
```

**Важно:** Скрипты автоматически настроят права доступа к директории `uploads`:
- Пользователь имеет права на запись файлов
- Nginx (www-data) имеет права на чтение файлов
- Все файлы и директории создаются с правильными разрешениями

## Полезные команды

### PM2
```bash
pm2 status              # Статус приложения
pm2 logs edu-platform   # Просмотр логов
pm2 restart edu-platform # Перезапуск
pm2 monit               # Мониторинг
```

### Nginx
```bash
sudo nginx -t                  # Проверка конфигурации
sudo systemctl reload nginx    # Перезагрузка
sudo systemctl status nginx    # Статус
```

### MongoDB
```bash
sudo systemctl status mongod   # Статус
mongosh                        # Подключение к MongoDB
```

## Обновление приложения

```bash
cd /var/www/edu-platform

# Обновите файлы (git pull или scp)
git pull origin main

# Пересоберите клиент
cd client && npm install && npm run build

# Обновите зависимости сервера
cd ../server && npm install --production

# Перезапустите приложение
pm2 restart edu-platform
```

## Структура файлов на сервере

```
/var/www/edu-platform/
├── client/
│   ├── dist/           # Собранный React (после npm run build)
│   ├── src/
│   └── package.json
├── server/
│   ├── .env            # Переменные окружения (создать вручную!)
│   ├── uploads/        # Загруженные файлы
│   └── package.json
├── deploy/
│   ├── full-deploy.sh
│   ├── setup-app.sh
│   └── *.env.example
└── ecosystem.config.cjs
```

## Troubleshooting

### Приложение не запускается
```bash
pm2 logs edu-platform --lines 100
```

### Nginx возвращает 502 Bad Gateway
```bash
# Проверьте, что Node.js сервер запущен
pm2 status

# Проверьте логи Nginx
sudo tail -f /var/log/nginx/error.log
```

### Ошибки доступа к файлам uploads
```bash
# Проверьте права доступа
ls -la /var/www/edu-platform/server/uploads

# Убедитесь, что пользователь в группе www-data
groups $USER

# Переустановите права (из директории проекта)
cd /var/www/edu-platform/server
sudo chown -R $USER:www-data uploads
sudo find uploads -type d -exec chmod 775 {} \;
sudo find uploads -type f -exec chmod 664 {} \;
sudo chmod g+s uploads
sudo find uploads -type d -exec chmod g+s {} \;
```

### MongoDB не запускается
```bash
sudo systemctl status mongod
sudo journalctl -u mongod
```

## Настройка HTTPS (SSL/TLS)

### Вариант 1: Let's Encrypt (рекомендуется, требует домен)

```bash
# У вас должен быть домен, указывающий на ваш сервер
cd /var/www/edu-platform/deploy
sudo ./setup-ssl.sh yourdomain.com your@email.com
```

**Требования:**
- Домен должен указывать на ваш сервер (A запись в DNS)
- Порт 80 должен быть открыт (для проверки)
- Порт 443 должен быть открыт (для HTTPS)

### Вариант 2: Self-Signed (для IP адреса, НЕ рекомендуется)

```bash
# Только для тестирования! Браузеры покажут предупреждение
cd /var/www/edu-platform/deploy
sudo ./setup-ssl-with-ip.sh [IP_ADDRESS]
```

**⚠️ Внимание:** Self-signed сертификаты небезопасны для продакшена. Браузеры будут показывать предупреждения.

## Безопасность

1. Измените `JWT_SECRET` на длинную случайную строку
2. Настройте firewall (ufw)
3. Регулярно обновляйте пакеты: `sudo apt update && sudo apt upgrade`
4. Рассмотрите использование MongoDB Atlas для продакшена
5. Используйте HTTPS (Let's Encrypt с доменом)

