# Настройка Python окружения для BOOOMERANGS

Для работы Python G4F провайдеров необходимо установить следующие зависимости:

```bash
pip install flask==2.3.3
pip install flask-cors==4.0.0
pip install g4f==0.1.9.0
pip install potrace==0.2.3
pip install Pillow==10.1.0
pip install numpy==1.26.0
pip install requests==2.31.0
pip install python-dotenv==1.0.0
```

## Важные примечания

1. **Версия G4F**: В проекте используется версия g4f 0.1.9.0. Более новые версии могут иметь несовместимые изменения.

2. **Порты**: 
   - Python G4F сервер работает на порту 5004
   - Flask Streaming сервер работает на порту 5001
   - Основной Express сервер работает на порту 5000

3. **Конфликты портов**: Если возникают ошибки "Address already in use", проверьте и освободите соответствующие порты:
   ```bash
   lsof -i :5004
   lsof -i :5001
   # Завершить процесс с PID
   kill -9 [PID]
   ```

4. **Проверка работы G4F**:
   ```bash
   curl -X POST -H "Content-Type: application/json" -d '{"message":"test"}' http://localhost:5004/python/chat
   ```

5. **Обновление провайдеров**: Список провайдеров настраивается в файле `server/g4f_python_provider.py`