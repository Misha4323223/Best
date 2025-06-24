# Резервная копия кода перед исправлением превью

## Дата: 18 июня 2025

### Файл: server/vectorizer-chat-integration.cjs (строки 93-129)
```javascript
// Создаем превью SVG для чата (оптимизировано для больших файлов)
let svgPreview = '';
if (vectorizerResult.data.svgContent && vectorizerResult.data.svgContent.includes('<svg')) {
  // Для больших SVG (>500KB) создаем упрощенное превью
  const svgSize = vectorizerResult.data.svgContent.length;
  let previewSvg;
  
  if (svgSize > 500 * 1024) {
    // Создаем упрощенное превью для больших файлов
    const svgHeader = vectorizerResult.data.svgContent.substring(0, 1000);
    const svgFooter = '</svg>';
    previewSvg = svgHeader.includes('<svg') ? 
      svgHeader.split('<svg')[0] + '<svg width="400" height="400" viewBox="0 0 400 400">' +
      '<text x="200" y="200" text-anchor="middle" fill="black">SVG превью недоступен (файл слишком большой)</text>' +
      svgFooter : 
      '<svg width="400" height="400" viewBox="0 0 400 400"><text x="200" y="200" text-anchor="middle" fill="black">SVG создан успешно</text></svg>';
  } else {
    // Обычное превью для небольших файлов
    previewSvg = vectorizerResult.data.svgContent
      .replace(/width="[^"]*"/g, 'width="400"')
      .replace(/height="[^"]*"/g, 'height="400"')
      .replace(/viewBox="[^"]*"/g, 'viewBox="0 0 400 400"');
    
    if (!previewSvg.includes('</svg>')) {
      previewSvg += '</svg>';
    }
  }
  
  svgPreview = `

**Превью результата:**
\`\`\`svg
${previewSvg}
\`\`\`

`;
}
```

### Файл: server/smart-router.js (строки 159-189)
```javascript
// Исправляем структуру ответа для ImageTracerJS векторизатора
const svgContent = result.data?.svgContent || result.result?.svgContent;
if (svgContent) {
  console.log('Smart-router: SVG контент получен, длина:', svgContent.length);
  
  // Проверяем, что это действительно SVG
  if (svgContent.includes('<svg')) {
    // Создаем уменьшенную версию для превью (максимум 400px)
    let previewSvg = svgContent
      .replace(/width="[^"]*"/g, 'width="400"')
      .replace(/height="[^"]*"/g, 'height="400"')
      .replace(/viewBox="[^"]*"/g, 'viewBox="0 0 400 400"');
    
    // Убеждаемся, что SVG корректно закрыт
    if (!previewSvg.includes('</svg>')) {
      previewSvg += '</svg>';
    }
    
    svgPreview = `

**Превью результата:**
\`\`\`svg
${previewSvg}
\`\`\`

`;
    console.log('Smart-router: SVG превью создан, длина:', previewSvg.length);
  } else {
    console.log('Smart-router: Контент не содержит SVG тег');
  }
}
```

### Проблема
SVG файлы создаются корректно (размер 2MB, много цветов), но в превью изображение не отображается визуально. Пользователь видит превью блок, но содержимое изображения отсутствует.

### Анализ проблемы
1. SVG файл корректный (1280x1280, множество path элементов)
2. Превью создается, но stroke-width="400" делает линии слишком толстыми
3. viewBox="0 0 400 400" не соответствует реальным размерам 1280x1280
4. Цвета слишком темные (rgb(59,49,55))