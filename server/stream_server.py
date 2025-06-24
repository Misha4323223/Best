"""
Стриминговый сервер для BOOOMERANGS
Обеспечивает потоковую передачу ответов от моделей G4F
"""
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import g4f
import json
import time
import random
import traceback

# Основные провайдеры с поддержкой потоковой передачи
# Используем более гибкий подход с getattr вместо прямого доступа
# для избежания ошибок AttributeError
def get_provider(name):
    try:
        return getattr(g4f.Provider, name)
    except AttributeError:
        print(f"Провайдер {name} не найден в g4f")
        return None

providers = {}
# Добавляем провайдеры в приоритетном порядке - Qwen_Qwen_2_72B первым
for name in ["Qwen_Qwen_2_72B", "Qwen_Qwen_2_5_Max", "Qwen_Qwen_2_5", "Qwen_Qwen_2_5M", "FreeGpt", "Liaobots", "HuggingChat", "DeepInfra", "You", "Gemini", "Phind", "Anthropic", "Blackbox", "ChatGpt"]:
    provider = get_provider(name)
    if provider:
        providers[name] = provider
        print(f"Успешно загружен провайдер: {name}")
    else:
        print(f"Не удалось загрузить провайдер: {name}")

# Пытаемся найти провайдеры Llama и другие перспективные модели
llama_providers = []
gpt_providers = []  # Для провайдеров GPT
all_provider_names = []
try:
    all_provider_names = [name for name in dir(g4f.Provider) if not name.startswith('_')]
    print(f"Всего найдено провайдеров: {len(all_provider_names)}")
except Exception as e:
    print(f"Ошибка при получении списка провайдеров: {str(e)}")
    all_provider_names = []

# Ищем провайдеры с llama в названии
for name in all_provider_names:
    if "llama" in name.lower():
        print(f"Найден потенциальный Llama провайдер: {name}")
        provider = get_provider(name)
        if provider:
            providers[name] = provider
            llama_providers.append(name)
            print(f"🦙 Успешно загружен Llama провайдер: {name}")
            
# Ищем GPT провайдеры специально
gpt_potential_providers = [
    "DeepAI", "AiChats", "Poe", "AIChatOnline", "GigaChat", "GPTalk", 
    "ChatGpt", "Chatgpt4Online", "OpenaiChat", "GPROChat", "FreeChatgpt", 
    "You", "MyShell", "FreeGpt", "Gemini", "Bing", "OpenaiAPI",
    "DeepInfra", "GptGo"
]

for name in gpt_potential_providers:
    if name not in providers and name in all_provider_names:
        provider = get_provider(name)
        if provider:
            providers[name] = provider
            gpt_providers.append(name)
            print(f"🔥 Успешно загружен потенциальный GPT провайдер: {name}")
            
# Проверяем основные провайдеры, которые могут предоставить GPT-3.5
priority_gpt_providers = ["DeepInfra", "You", "Gemini", "ChatGpt"]
for name in priority_gpt_providers:
    if name in providers:
        # Пробуем проверить, поддерживает ли данный провайдер GPT-3.5 Turbo
        print(f"⚡ Проверка поддержки GPT-3.5 Turbo у провайдера {name}...")
        
# Ищем Llama 3 специально
for name in ["HuggingFace", "HuggingSpace", "HuggingChat", "Ollama", "Replicate"]:
    if name not in providers and name in all_provider_names:
        provider = get_provider(name)
        if provider:
            providers[name] = provider
            print(f"✅ Успешно загружен дополнительный провайдер для моделей Llama: {name}")
            
# Добавляем в список потенциальных провайдеров с Llama
if "HuggingChat" in providers:
    llama_providers.append("HuggingChat")
if "Ollama" in providers:
    llama_providers.append("Ollama")

# Проверяем доступность Claude через Anthropic
anthropic_available = "Anthropic" in providers
llama_available = len(llama_providers) > 0

if llama_available:
    print(f"✅ Провайдеры Llama доступны: {', '.join(llama_providers)}")
else:
    print("❌ Провайдеры Llama не найдены или недоступны")
if anthropic_available:
    print("✅ Провайдер Anthropic (Claude) доступен для использования!")
else:
    print("❌ Провайдер Anthropic (Claude) недоступен или требует API ключ")

# Организуем провайдеры в группы по надежности
provider_groups = {
    'primary': ['Qwen_Qwen_2_5_Max', 'Qwen_Qwen_3', 'You', 'DeepInfra'],
    'secondary': ['Gemini', 'GeminiPro', 'Phind', 'ChatGpt'],
    'fallback': ['You', 'DeepInfra', 'GPTalk', 'FreeGpt', 'GptGo']
}

# Добавляем группу для GPT-3.5
gpt_providers_group = ['DeepInfra', 'You', 'ChatGpt', 'GPTalk', 'FreeGpt', 'GptGo']

# Добавляем Claude в группы, если доступен
if anthropic_available:
    provider_groups['primary'].insert(0, 'Anthropic')  # Добавляем в начало списка primary
    
# Добавляем Llama в группы, если доступны
if llama_available:
    for llama_provider in llama_providers:
        # Добавляем Llama провайдеров в начало primary группы
        provider_groups['primary'].insert(0, llama_provider)
        print(f"🦙 Добавлен Llama провайдер {llama_provider} в primary группу")

app = Flask(__name__)
CORS(app)

def get_demo_response(message):
    """Генерирует демо-ответ для случаев, когда API недоступен"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ['привет', 'здравствуй', 'hello', 'hi']):
        return "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?"
    elif any(word in message_lower for word in ['как дела', 'как ты', 'how are you']):
        return "У меня всё отлично, спасибо что спросили! Как ваши дела?"
    elif any(word in message_lower for word in ['изображен', 'картин', 'image', 'picture']):
        return "Вы можете создать изображение, перейдя на вкладку \"Генератор изображений\". Просто опишите, что хотите увидеть!"
    elif 'бот' in message_lower:
        return "Да, я бот-ассистент BOOOMERANGS. Я использую различные AI модели для ответов на ваши вопросы без необходимости платных API ключей."
    elif any(word in message_lower for word in ['booomerangs', 'буумеранг']):
        return "BOOOMERANGS - это бесплатный мультимодальный AI-сервис для общения и создания изображений без необходимости платных API ключей."
    
    # Если не нашли ключевых слов, используем случайный ответ    
    random_responses = [
        "BOOOMERANGS использует различные AI-провайдеры, чтобы предоставлять ответы даже без платных API ключей. Наша система автоматически выбирает лучший доступный провайдер в каждый момент времени.",
        "BOOOMERANGS позволяет не только общаться с AI, но и генерировать изображения по текстовому описанию, а также конвертировать их в векторный формат SVG.",
        "BOOOMERANGS стремится сделать технологии искусственного интеллекта доступными для всех. Наше приложение работает прямо в браузере и оптимизировано для использования на мобильных устройствах."
    ]
        
    return random.choice(random_responses)

@app.route('/stream', methods=['POST'])
def stream_chat():
    """Потоковый вывод ответов от G4F моделей с поддержкой стриминга"""
    if request.method != 'POST':
        return Response('Метод не поддерживается', status=405)
    
    try:
        data = request.get_json()
        message = data.get('message', '')
        provider_name = data.get('provider', 'Qwen_Qwen_2_72B')
        timeout = data.get('timeout', 50000) / 1000  # Переводим миллисекунды в секунды (увеличено до 50 сек)
        
        if not message:
            return Response('Не указано сообщение', status=400)
            
        # Обработка специальных команд для тестирования провайдеров
        if message.lower().startswith('test-claude:'):
            message = message[11:].strip()  # Удаляем префикс
            provider_name = 'Anthropic'
            print(f"🔵 Специальный запрос: тестирование Claude с сообщением: '{message}'")
        elif message.lower().startswith('test-provider:'):
            parts = message[13:].strip().split(':', 1)
            if len(parts) == 2:
                provider_name = parts[0].strip()
                message = parts[1].strip()
                print(f"🔵 Специальный запрос: тестирование провайдера {provider_name} с сообщением: '{message}'")
        
        print(f"Получен запрос стриминга: '{message}' от провайдера {provider_name}")
        
        # Подготавливаем диалог с системным промптом
        messages = [
            {"role": "system", "content": "Вы AI-ассистент BOOOMERANGS. Отвечайте по-русски, если вопрос на русском. Давайте краткие и полезные ответы."},
            {"role": "user", "content": message}
        ]
        
        def stream_generator():
            """Генератор для стриминга ответов"""
            # Используем локальные переменные внутри генератора
            current_provider = provider_name
            start_time = time.time()
            yielded_anything = False
            
            # Отправляем событие начала стриминга
            print(f"Начинаем стриминг от провайдера {current_provider}")
            yield f"event: start\ndata: {json.dumps({'provider': current_provider})}\n\n"
            
            try:
                # Исправляем имя провайдера, если нужно
                if current_provider == "Qwen_Max":
                    current_provider = "Qwen_Qwen_2_5_Max"
                
                # Попробуем сначала использовать запрошенный провайдер
                if current_provider in providers:
                    try:
                        provider = providers[current_provider]
                        print(f"Пробуем использовать провайдера {current_provider}")
                        
                        # Пробуем получить ответ от провайдера
                        try:
                            print(f"🔍 Настройка параметров для {current_provider}")
                            model = "gpt-3.5-turbo"
                            
                            # Специальная обработка для разных провайдеров
                            if current_provider == "Anthropic":
                                print(f"⭐ Запрос к Claude через провайдер Anthropic")
                                # Проверяем, требуется ли API-ключ
                                try:
                                    # Попытка использовать без ключа - это проверка требуется ли ключ вообще
                                    response_stream = g4f.ChatCompletion.create(
                                        model="claude-3-opus-20240229",
                                        messages=messages,
                                        provider=provider,
                                        stream=True,
                                        timeout=timeout
                                    )
                                    print("✅ Provider Anthropic не требует API ключа!")
                                except Exception as claude_error:
                                    error_str = str(claude_error)
                                    print(f"❌ Ошибка Claude: {error_str}")
                                    if "api_key" in error_str.lower() or "apikey" in error_str.lower() or "key" in error_str.lower() or "token" in error_str.lower():
                                        print("⚠️ Claude требует действительный API-ключ")
                                        # Возбуждаем исключение, чтобы перейти к следующему провайдеру
                                        raise Exception("Claude требует API-ключ")
                                    else:
                                        print("⚠️ Другая ошибка при запросе к Claude")
                                        raise
                            elif current_provider == "You":
                                # Проверка запроса пользователя - если он просит GPT-3.5, мы попробуем использовать его
                                if "gpt" in message.lower() or "test-gpt" in message.lower():
                                    print(f"⭐ Запрос к You.com с моделью GPT")
                                    # Удаляем префикс test-gpt: из сообщения, если он присутствует
                                    if message.lower().startswith("test-gpt:"):
                                        original_message = message
                                        message = message[9:].strip()
                                        # Обновляем сообщение в диалоге
                                        for m in messages:
                                            if m['role'] == 'user' and m['content'] == original_message:
                                                m['content'] = message
                                        print(f"🔄 Обновили сообщение без префикса: {message}")
                                    try:
                                        model_to_use = "gpt-4o-mini"  # You поддерживает GPT-4o mini
                                        print(f"🔄 Используем модель {model_to_use} для провайдера You")
                                        response_stream = g4f.ChatCompletion.create(
                                            model=model_to_use,
                                            messages=messages,
                                            provider=provider,
                                            stream=True,
                                            timeout=timeout
                                        )
                                        print("✅ Provider You успешно отправил запрос к GPT!")
                                    except Exception as gpt_error:
                                        error_str = str(gpt_error)
                                        print(f"❌ Ошибка You с моделью GPT: {error_str}")
                                        
                                        # Сначала пробуем другую GPT модель
                                        try:
                                            fallback_model = "gpt-4-turbo"
                                            print(f"🔄 Пробуем другую GPT модель {fallback_model}")
                                            response_stream = g4f.ChatCompletion.create(
                                                model=fallback_model,
                                                messages=messages,
                                                provider=provider,
                                                stream=True,
                                                timeout=timeout
                                            )
                                            print(f"✅ Provider You успешно использовал модель {fallback_model}!")
                                        except Exception:
                                            # Если не получилось с GPT, пробуем Llama
                                            try:
                                                llama_model = "llama-3"
                                                print(f"🔄 Переключаемся на Llama модель {llama_model}")
                                                response_stream = g4f.ChatCompletion.create(
                                                    model=llama_model,
                                                    messages=messages,
                                                    provider=provider,
                                                    stream=True,
                                                    timeout=timeout
                                                )
                                                print(f"✅ Provider You успешно переключился на {llama_model}!")
                                            except Exception as fallback_error:
                                                print(f"❌ Ошибка при использовании Llama: {str(fallback_error)}")
                                                raise
                                else:
                                    # Стандартный запрос через Llama 3
                                    print(f"⭐ Запрос к You.com (с поддержкой Llama 3)")
                                    try:
                                        model_to_use = "llama-3"  # Используем llama-3 вместо gpt-3.5-turbo
                                        print(f"🔄 Используем модель {model_to_use} для провайдера You")
                                        response_stream = g4f.ChatCompletion.create(
                                            model=model_to_use,
                                            messages=messages,
                                            provider=provider,
                                            stream=True,
                                            timeout=timeout
                                        )
                                        print("✅ Provider You успешно отправил запрос к Llama 3!")
                                    except Exception as you_error:
                                        error_str = str(you_error)
                                        print(f"❌ Ошибка You с моделью llama-3: {error_str}")
                                        # Пробуем другую модель
                                        try:
                                            fallback_model = "claude-3-haiku"  # Альтернативная модель
                                            print(f"🔄 Пробуем альтернативную модель {fallback_model}")
                                            response_stream = g4f.ChatCompletion.create(
                                                model=fallback_model,
                                                messages=messages,
                                                provider=provider,
                                                stream=True,
                                                timeout=timeout
                                            )
                                            print(f"✅ Provider You успешно использовал модель {fallback_model}!")
                                        except Exception as fallback_error:
                                            print(f"❌ Ошибка при использовании резервной модели: {str(fallback_error)}")
                                            raise
                            elif current_provider in gpt_providers_group:
                                # Провайдеры, которые могут работать с GPT
                                print(f"⭐ Запрос к провайдеру {current_provider} с поддержкой GPT")
                                try:
                                    # Выбираем модель в зависимости от провайдера
                                    gpt_model_to_use = "gpt-3.5-turbo"
                                    if current_provider == "ChatGpt":
                                        gpt_model_to_use = "gpt-3.5-turbo"
                                    elif current_provider == "GPTalk":
                                        gpt_model_to_use = "gpt-3.5-turbo"
                                    elif current_provider == "You":
                                        # You поддерживает более новые модели GPT
                                        gpt_model_to_use = "gpt-4o-mini"
                                    
                                    print(f"🔄 Используем модель {gpt_model_to_use} для провайдера {current_provider}")
                                    response_stream = g4f.ChatCompletion.create(
                                        model=gpt_model_to_use,
                                        messages=messages,
                                        provider=provider,
                                        stream=True,
                                        timeout=timeout
                                    )
                                    print(f"✅ Provider {current_provider} успешно отправил запрос!")
                                except Exception as gpt_error:
                                    error_str = str(gpt_error)
                                    print(f"❌ Ошибка {current_provider}: {error_str}")
                                    raise
                            else:
                                # Для всех остальных провайдеров используем стандартный запрос
                                # с корректировкой модели в зависимости от провайдера
                                model_to_use = model
                                if current_provider in ["Qwen_Qwen_2_5_Max", "Qwen_Qwen_3"]:
                                    model_to_use = model  # Используем стандартную модель для Qwen
                                
                                response_stream = g4f.ChatCompletion.create(
                                    model=model_to_use,
                                    messages=messages,
                                    provider=provider,
                                    stream=True,
                                    timeout=timeout
                                )
                            
                            print(f"Получен поток от провайдера {current_provider}")
                            response_text = ''
                            chunk_count = 0
                            
                            # Пробуем получить первый чанк с таймаутом
                            got_first_chunk = False
                            
                            for chunk in response_stream:
                                chunk_count += 1
                                if isinstance(chunk, str):
                                    response_text += chunk
                                    print(f"Чанк {chunk_count} от {current_provider}: {chunk[:30]}...")
                                    yield f"event: chunk\ndata: {json.dumps({'text': chunk, 'provider': current_provider})}\n\n"
                                    yielded_anything = True
                                    got_first_chunk = True
                                    
                            # Если получили хотя бы один чанк, отправляем завершающее событие
                            if got_first_chunk:
                                elapsed = time.time() - start_time
                                print(f"Стриминг от {current_provider} завершен успешно")
                                yield f"event: complete\ndata: {json.dumps({'text': response_text, 'provider': current_provider, 'elapsed': elapsed})}\n\n"
                                return
                                
                        except Exception as e:
                            print(f"Ошибка при работе с провайдером {current_provider}: {str(e)}")
                    
                    except Exception as provider_error:
                        print(f"Ошибка при инициализации провайдера {current_provider}: {str(provider_error)}")
                else:
                    print(f"Провайдер {current_provider} не найден в списке доступных")
                
                # Если не получилось использовать основной провайдер, попробуем другие группы
                for group_name in ['primary', 'secondary', 'fallback']:
                    print(f"Пробуем группу провайдеров: {group_name}")
                    
                    for backup_provider in provider_groups[group_name]:
                        if backup_provider == current_provider or backup_provider not in providers:
                            continue
                            
                        try:
                            provider = providers[backup_provider]
                            print(f"Пробуем резервный провайдер {backup_provider}")
                            
                            yield f"event: update\ndata: {json.dumps({'text': f'Переключаемся на {backup_provider}...', 'provider': backup_provider})}\n\n"
                            
                            try:
                                response_stream = g4f.ChatCompletion.create(
                                    model="gpt-3.5-turbo",
                                    messages=messages,
                                    provider=provider,
                                    stream=True,
                                    timeout=timeout
                                )
                                
                                response_text = ''
                                chunk_count = 0
                                got_any_chunks = False
                                
                                for chunk in response_stream:
                                    chunk_count += 1
                                    if isinstance(chunk, str):
                                        response_text += chunk
                                        print(f"Резервный чанк {chunk_count} от {backup_provider}: {chunk[:30]}...")
                                        yield f"event: chunk\ndata: {json.dumps({'text': chunk, 'provider': backup_provider})}\n\n"
                                        yielded_anything = True
                                        got_any_chunks = True
                                
                                if got_any_chunks:
                                    elapsed = time.time() - start_time
                                    print(f"Стриминг от резервного провайдера {backup_provider} завершен успешно")
                                    yield f"event: complete\ndata: {json.dumps({'text': response_text, 'provider': backup_provider, 'elapsed': elapsed})}\n\n"
                                    return
                                    
                            except Exception as e:
                                print(f"Ошибка при работе с резервным провайдером {backup_provider}: {str(e)}")
                                
                        except Exception as provider_error:
                            print(f"Ошибка при инициализации резервного провайдера {backup_provider}: {str(provider_error)}")
                
                # Если все провайдеры не сработали, используем демо-ответ
                print("Все провайдеры не работают, используем демо-ответ")
                demo_response = get_demo_response(message)
                
                yield f"event: update\ndata: {json.dumps({'text': 'Используем демо-режим...', 'provider': 'BOOOMERANGS-Demo'})}\n\n"
                
                # Имитируем стриминг для демо-ответа
                words = demo_response.split()
                chunk_size = max(1, len(words) // 5)  # Разбиваем на 5 частей
                
                for i in range(0, len(words), chunk_size):
                    chunk = ' '.join(words[i:i+chunk_size])
                    yield f"event: chunk\ndata: {json.dumps({'text': chunk + ' ', 'provider': 'BOOOMERANGS-Demo'})}\n\n"
                    time.sleep(0.1)  # Небольшая задержка для имитации печати
                
                # Отправляем полный ответ в конце
                elapsed = time.time() - start_time
                yield f"event: complete\ndata: {json.dumps({'text': demo_response, 'provider': 'BOOOMERANGS-Demo', 'elapsed': elapsed})}\n\n"
            
            except Exception as e:
                print(f"Критическая ошибка в генераторе стриминга: {str(e)}")
                traceback.print_exc()
                
                # В случае общей ошибки, отправляем сообщение об ошибке
                demo_response = "Извините, произошла ошибка при обработке запроса. Попробуйте еще раз."
                
                yield f"event: update\ndata: {json.dumps({'text': 'Ошибка соединения...', 'provider': 'BOOOMERANGS-Demo'})}\n\n"
                yield f"event: chunk\ndata: {json.dumps({'text': demo_response, 'provider': 'BOOOMERANGS-Demo'})}\n\n"
                
                # Отправляем завершающее событие
                elapsed = time.time() - start_time
                yield f"event: complete\ndata: {json.dumps({'text': demo_response, 'provider': 'BOOOMERANGS-Demo', 'elapsed': elapsed})}\n\n"
        
        # Возвращаем потоковый ответ
        return Response(stream_generator(), content_type='text/event-stream')
        
    except Exception as e:
        print(f"Критическая ошибка в обработчике запроса: {str(e)}")
        traceback.print_exc()
        return Response('Внутренняя ошибка сервера', status=500)

# Простой тестовый маршрут
@app.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "ok", "message": "Flask-сервер стриминга работает"})

# Маршрут для тестирования провайдеров
@app.route('/test-provider/<provider_name>', methods=['GET'])
def test_provider(provider_name):
    if provider_name not in providers:
        return jsonify({"status": "error", "message": f"Провайдер {provider_name} не найден"})
    
    provider = providers[provider_name]
    try:
        # Проверяем, требует ли провайдер API-ключ
        # Используем минимальный запрос для проверки
        response = g4f.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say just one word: Test"}],
            provider=provider,
            timeout=5  # Короткий таймаут
        )
        
        return jsonify({
            "status": "ok", 
            "message": f"Провайдер {provider_name} доступен", 
            "requires_api_key": False,
            "response": str(response)[:100]  # Только начало ответа
        })
    except Exception as e:
        error_str = str(e)
        requires_api_key = any(key in error_str.lower() for key in ["api_key", "apikey", "key", "token"])
        
        return jsonify({
            "status": "error",
            "message": f"Ошибка при проверке провайдера {provider_name}",
            "error": error_str,
            "requires_api_key": requires_api_key
        })

# Функция для запуска сервера
if __name__ == '__main__':
    print("Запуск стримингового сервера на порту 5001...")
    app.run(host='0.0.0.0', port=5004, debug=True, threaded=True)
