#!/usr/bin/env python3
# Скрипт для конвертации растрового изображения в SVG

import sys
import requests
from PIL import Image
import io
import numpy as np
import base64

def download_image(url):
    """Загрузка изображения по URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert('RGB')
    except Exception as e:
        print(f'Ошибка при загрузке изображения: {str(e)}', file=sys.stderr)
        sys.exit(1)

def simple_trace(image, threshold=128):
    """Простая трассировка границ изображения"""
    # Преобразуем изображение в оттенки серого
    img_gray = image.convert('L')
    width, height = img_gray.size
    
    # Преобразуем в массив NumPy и применяем пороговое значение
    img_array = np.array(img_gray)
    binary = img_array < threshold
    
    # Получаем контуры (упрощенная версия)
    # Этот алгоритм очень простой и не заменяет полноценную трассировку potrace
    paths = []
    
    # Сканируем изображение для поиска контуров
    for y in range(1, height - 1):
        for x in range(1, width - 1):
            if binary[y, x]:
                # Проверяем границы
                if not binary[y-1, x] or not binary[y+1, x] or not binary[y, x-1] or not binary[y, x+1]:
                    paths.append((x, y))
    
    return paths, width, height

def create_simple_svg(image_url):
    """Создает простой SVG с исходным изображением и элементами трассировки"""
    try:
        # Загружаем изображение
        image = download_image(image_url)
        width, height = image.size
        
        # Создаем простую трассировку
        paths, img_width, img_height = simple_trace(image)
        
        # Начинаем генерировать SVG
        svg_lines = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
            '<defs>',
            '  <filter id="posterize">',
            '    <feComponentTransfer>',
            '      <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />',
            '      <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1" />',
            '      <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1" />',
            '    </feComponentTransfer>',
            '  </filter>',
            '</defs>'
        ]
        
        # Добавляем исходное изображение с фильтром
        svg_lines.append(f'<image href="{image_url}" width="{width}" height="{height}" filter="url(#posterize)" />')
        
        # Добавляем трассировку в виде точек (для демонстрации)
        svg_lines.append('<g fill="none" stroke="rgba(255, 75, 43, 0.5)" stroke-width="1">')
        for i, (x, y) in enumerate(paths[:1000]):  # Ограничиваем количество точек для производительности
            if i % 10 == 0:  # Берем каждую 10-ю точку для уменьшения размера SVG
                svg_lines.append(f'  <circle cx="{x}" cy="{y}" r="1" />')
        svg_lines.append('</g>')
        
        # Добавляем водяной знак BOOOMERANGS
        svg_lines.append(f'<rect x="0" y="{height-50}" width="{width}" height="50" fill="rgba(0,0,0,0.7)" />')
        svg_lines.append(f'<text x="{width/2}" y="{height-20}" font-family="Arial" font-size="24" text-anchor="middle" fill="#FF4B2B" font-weight="bold">BOOOMERANGS</text>')
        
        # Закрываем SVG
        svg_lines.append('</svg>')
        
        return '\n'.join(svg_lines)
    except Exception as e:
        print(f'Ошибка при создании SVG: {str(e)}', file=sys.stderr)
        sys.exit(1)

def main():
    """Основная функция"""
    if len(sys.argv) != 2:
        print('Использование: python raster2svg.py <url_изображения>', file=sys.stderr)
        sys.exit(1)
    
    # Получаем URL изображения из параметров
    image_url = sys.argv[1]
    
    # Создаем SVG
    svg = create_simple_svg(image_url)
    
    # Выводим результат
    print(svg)

if __name__ == '__main__':
    main()