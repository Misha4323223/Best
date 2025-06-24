/**
 * Система автоматизации для BOOOMERANGS
 * Автоматизация бизнес-процессов оптового менеджера
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Калькулятор цен для принтов и вышивки
 */
class PriceCalculator {
  constructor() {
    this.baseRates = {
      // Базовые расценки за единицу
      dtf_print: {
        small: 50,    // до 10x10 см
        medium: 120,  // до 20x20 см 
        large: 200,   // до 30x30 см
        xlarge: 350   // свыше 30x30 см
      },
      screen_print: {
        setup: 500,   // настройка печати
        per_color: 25, // за цвет
        min_qty: 50   // минимальный тираж
      },
      embroidery: {
        setup: 300,   // оцифровка
        per_1000_stitches: 15, // за 1000 стежков
        min_price: 80 // минимальная цена
      },
      garment_markup: 1.3 // наценка на изделие
    };
  }

  /**
   * Расчет стоимости DTF печати
   */
  calculateDTF(width, height, quantity, colors = 'full') {
    const area = width * height;
    let pricePerUnit;

    if (area <= 100) pricePerUnit = this.baseRates.dtf_print.small;
    else if (area <= 400) pricePerUnit = this.baseRates.dtf_print.medium;
    else if (area <= 900) pricePerUnit = this.baseRates.dtf_print.large;
    else pricePerUnit = this.baseRates.dtf_print.xlarge;

    // Скидки за тираж
    let discount = 1;
    if (quantity >= 100) discount = 0.85;
    else if (quantity >= 50) discount = 0.9;
    else if (quantity >= 20) discount = 0.95;

    const totalCost = pricePerUnit * quantity * discount;

    return {
      method: 'DTF печать',
      size: `${width}x${height} см`,
      pricePerUnit: Math.round(pricePerUnit * discount),
      quantity,
      totalCost: Math.round(totalCost),
      discount: Math.round((1 - discount) * 100)
    };
  }

  /**
   * Расчет стоимости трафаретной печати
   */
  calculateScreenPrint(colors, quantity) {
    if (quantity < this.baseRates.screen_print.min_qty) {
      return {
        error: `Минимальный тираж для трафаретной печати: ${this.baseRates.screen_print.min_qty} шт.`
      };
    }

    const setupCost = this.baseRates.screen_print.setup;
    const printCost = colors * this.baseRates.screen_print.per_color * quantity;
    const totalCost = setupCost + printCost;

    return {
      method: 'Трафаретная печать',
      colors,
      setupCost,
      printCost,
      pricePerUnit: Math.round(totalCost / quantity),
      quantity,
      totalCost
    };
  }

  /**
   * Расчет стоимости вышивки
   */
  calculateEmbroidery(stitches, quantity, needsDigitizing = true) {
    const digitizingCost = needsDigitizing ? this.baseRates.embroidery.setup : 0;
    const stitchCost = Math.ceil(stitches / 1000) * this.baseRates.embroidery.per_1000_stitches;
    
    let pricePerUnit = Math.max(stitchCost, this.baseRates.embroidery.min_price);
    
    // Скидки за тираж
    if (quantity >= 100) pricePerUnit *= 0.8;
    else if (quantity >= 50) pricePerUnit *= 0.85;
    else if (quantity >= 20) pricePerUnit *= 0.9;

    const totalCost = digitizingCost + (pricePerUnit * quantity);

    return {
      method: 'Машинная вышивка',
      stitches,
      digitizingCost,
      pricePerUnit: Math.round(pricePerUnit),
      quantity,
      totalCost: Math.round(totalCost)
    };
  }

  /**
   * Комплексный расчет с рекомендациями
   */
  getRecommendation(width, height, colors, quantity, hasDetails = false) {
    const results = [];

    // DTF всегда доступен
    results.push(this.calculateDTF(width, height, quantity, colors));

    // Трафарет только для больших тиражей
    if (quantity >= this.baseRates.screen_print.min_qty && colors <= 6) {
      results.push(this.calculateScreenPrint(colors, quantity));
    }

    // Вышивка для простых дизайнов
    if (!hasDetails && colors <= 8) {
      const estimatedStitches = (width * height) * 100; // примерная оценка
      results.push(this.calculateEmbroidery(estimatedStitches, quantity));
    }

    // Сортируем по стоимости за единицу
    results.sort((a, b) => (a.pricePerUnit || a.totalCost) - (b.pricePerUnit || b.totalCost));

    return {
      recommendation: results[0],
      alternatives: results.slice(1),
      summary: `Для тиража ${quantity} шт. рекомендуем: ${results[0].method}`
    };
  }
}

/**
 * Генератор коммерческих предложений
 */
class ProposalGenerator {
  constructor() {
    this.calculator = new PriceCalculator();
  }

  /**
   * Создание коммерческого предложения
   */
  async generateProposal(clientData, orderDetails) {
    const {
      clientName,
      clientCompany,
      email,
      phone
    } = clientData;

    const {
      productType,
      designs,
      quantity,
      deadline,
      additionalServices = []
    } = orderDetails;

    let totalCost = 0;
    const calculations = [];

    // Расчет по каждому дизайну
    for (const design of designs) {
      const calc = this.calculator.getRecommendation(
        design.width,
        design.height,
        design.colors,
        quantity,
        design.hasDetails
      );
      
      calculations.push({
        name: design.name,
        ...calc
      });
      
      totalCost += calc.recommendation.totalCost;
    }

    // Добавляем стоимость изделий
    const garmentCost = this.estimateGarmentCost(productType, quantity);
    totalCost += garmentCost;

    // Дополнительные услуги
    let additionalCost = 0;
    if (additionalServices.includes('express')) additionalCost += totalCost * 0.3;
    if (additionalServices.includes('packaging')) additionalCost += quantity * 25;
    if (additionalServices.includes('delivery')) additionalCost += 1500;

    const proposal = {
      proposalNumber: `BOOM-${Date.now()}`,
      date: new Date().toLocaleDateString('ru-RU'),
      client: {
        name: clientName,
        company: clientCompany,
        contacts: { email, phone }
      },
      order: {
        productType,
        quantity,
        deadline,
        designs: calculations
      },
      costs: {
        production: totalCost,
        garments: garmentCost,
        additional: additionalCost,
        total: totalCost + garmentCost + additionalCost
      },
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')
    };

    return this.formatProposal(proposal);
  }

  /**
   * Оценка стоимости изделий
   */
  estimateGarmentCost(productType, quantity) {
    const basePrices = {
      't-shirt': 350,
      'hoodie': 890,
      'polo': 450,
      'cap': 280,
      'bag': 320
    };

    const basePrice = basePrices[productType] || 400;
    
    // Оптовые скидки
    let discount = 1;
    if (quantity >= 100) discount = 0.7;
    else if (quantity >= 50) discount = 0.75;
    else if (quantity >= 20) discount = 0.8;
    else if (quantity >= 10) discount = 0.85;

    return Math.round(basePrice * quantity * discount);
  }

  /**
   * Форматирование КП в текст
   */
  formatProposal(proposal) {
    return `
📋 **КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ №${proposal.proposalNumber}**
📅 Дата: ${proposal.date}

👤 **КЛИЕНТ:**
• Контактное лицо: ${proposal.client.name}
• Компания: ${proposal.client.company}
• Email: ${proposal.client.contacts.email}
• Телефон: ${proposal.client.contacts.phone}

🎯 **ЗАКАЗ:**
• Изделие: ${proposal.order.productType}
• Количество: ${proposal.order.quantity} шт.
• Срок выполнения: ${proposal.order.deadline}

🎨 **ДИЗАЙНЫ И РАСЧЕТЫ:**
${proposal.order.designs.map((design, i) => `
${i + 1}. **${design.name}**
   Рекомендуем: ${design.recommendation.method}
   Стоимость: ${design.recommendation.totalCost} руб.
   ${design.alternatives.length > 0 ? `Альтернативы: ${design.alternatives.map(alt => `${alt.method} (${alt.totalCost} руб.)`).join(', ')}` : ''}
`).join('')}

💰 **СТОИМОСТЬ:**
• Производство: ${proposal.costs.production.toLocaleString()} руб.
• Изделия: ${proposal.costs.garments.toLocaleString()} руб.
• Доп. услуги: ${proposal.costs.additional.toLocaleString()} руб.
• **ИТОГО: ${proposal.costs.total.toLocaleString()} руб.**

⏰ Предложение действительно до: ${proposal.validUntil}

---
С уважением, команда BOOOMERANGS
`;
  }
}

/**
 * Анализатор трендов
 */
class TrendAnalyzer {
  /**
   * Анализ популярных тем и стилей
   */
  async analyzeTrends(query) {
    try {
      // Используем расширенный поиск для анализа трендов
      const { performAdvancedSearch } = require('./advanced-search-provider');
      
      const searchQueries = [
        `тренды дизайна 2024 2025 принты футболки`,
        `популярные стили одежды современная мода`,
        `модные принты графический дизайн тенденции`,
        `актуальные цвета дизайн текстиль`,
        `трендовые паттерны современный стиль`
      ];

      const results = [];
      
      for (const searchQuery of searchQueries) {
        const searchResult = await performAdvancedSearch(searchQuery, {
          searchType: 'comprehensive',
          language: 'ru',
          maxResults: 5,
          includeAnalysis: false
        });
        
        if (searchResult.success && searchResult.results) {
          results.push(...searchResult.results.slice(0, 3));
        }
      }

      return this.processTrendData(results, query);
      
    } catch (error) {
      console.error('Ошибка анализа трендов:', error);
      return {
        error: 'Ошибка анализа трендов',
        recommendation: 'Проверьте актуальные тренды вручную на Pinterest, Behance'
      };
    }
  }

  /**
   * Обработка данных о трендах
   */
  processTrendData(searchResults, originalQuery) {
    const trendKeywords = this.extractTrendKeywords(searchResults);
    const recommendations = this.generateTrendRecommendations(trendKeywords, originalQuery);

    return {
      query: originalQuery,
      trends: trendKeywords,
      recommendations,
      sources: searchResults.length,
      lastUpdated: new Date().toLocaleDateString('ru-RU')
    };
  }

  /**
   * Извлечение ключевых слов трендов с анализом контекста
   */
  extractTrendKeywords(results) {
    const allText = results.map(r => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    console.log('Анализируем текст для трендов:', allText.substring(0, 500));
    
    const trendPatterns = {
      'Минимализм': ['минимализм', 'простота', 'чистый дизайн', 'лаконичность', 'простые формы', 'minimal', 'clean'],
      'Винтаж/Ретро': ['винтаж', 'ретро', '80-е', '90-е', 'классика', 'олдскул', 'vintage', 'retro', 'classic'],
      'Яркие цвета': ['неон', 'яркие', 'кислотные', 'флуоресцентные', 'насыщенные цвета', 'neon', 'bright', 'vibrant'],
      'Геометрия': ['геометрия', 'геометрические', 'линии', 'формы', 'треугольники', 'круги', 'geometric', 'shapes'],
      'Природа': ['природа', 'растения', 'листья', 'цветы', 'эко', 'органические', 'nature', 'organic', 'botanical'],
      'Типографика': ['типографика', 'шрифт', 'буквы', 'текст', 'надписи', 'слоганы', 'typography', 'font', 'lettering'],
      'Градиенты': ['градиент', 'переходы', 'омбре', 'плавные', 'gradient', 'ombre', 'blend'],
      'Космос': ['космос', 'звезды', 'планеты', 'галактика', 'вселенная', 'space', 'galaxy', 'stars'],
      'Поп-культура': ['аниме', 'мем', 'игры', 'фильмы', 'сериалы', 'anime', 'meme', 'gaming', 'pop culture'],
      'Мотивация': ['мотивация', 'вдохновение', 'цитаты', 'позитив', 'motivation', 'inspiration', 'quotes'],
      'Y2K стиль': ['y2k', 'футуризм', 'киберпанк', 'техно', 'digital', 'cyber', 'futuristic'],
      'Абстракция': ['абстракция', 'абстрактный', 'сюрреализм', 'abstract', 'surreal', 'artistic'],
      'Монохром': ['монохром', 'черно-белый', 'grayscale', 'monochrome', 'black white'],
      'Этнические мотивы': ['этнический', 'народный', 'традиционный', 'ethnic', 'tribal', 'cultural'],
      'Спорт и активность': ['спорт', 'фитнес', 'активный', 'sport', 'fitness', 'athletic', 'active']
    };

    const foundTrends = [];
    for (const [category, keywords] of Object.entries(trendPatterns)) {
      const matches = keywords.filter(keyword => allText.includes(keyword));
      if (matches.length > 0) {
        foundTrends.push({
          category,
          matches,
          strength: matches.length
        });
      }
    }

    return foundTrends.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Генерация детальных рекомендаций по трендам
   */
  generateTrendRecommendations(trends, query) {
    const recommendations = [];

    trends.forEach(trend => {
      switch(trend.category) {
        case 'Минимализм':
          recommendations.push({
            trend: trend.category,
            description: 'Простые геометрические формы, максимум 2-3 цвета, много белого пространства',
            colors: ['Черный', 'Белый', 'Серый', 'Один акцентный цвет'],
            techniques: ['Векторная графика', 'Чистые линии', 'Простые шрифты'],
            examples: ['Логотипы без деталей', 'Геометрические фигуры', 'Типографические композиции']
          });
          break;
          
        case 'Винтаж/Ретро':
          recommendations.push({
            trend: trend.category,
            description: 'Отсылки к прошлым эпохам, состаренные эффекты, классические элементы',
            colors: ['Приглушенные тона', 'Сепия', 'Пастельные оттенки'],
            techniques: ['Гранжевые текстуры', 'Состаренные шрифты', 'Винтажные рамки'],
            examples: ['80-90е стилистика', 'Ретро логотипы', 'Классические паттерны']
          });
          break;
          
        case 'Яркие цвета':
          recommendations.push({
            trend: trend.category,
            description: 'Насыщенные, контрастные цвета для привлечения внимания',
            colors: ['Неоновые оттенки', 'Кислотные цвета', 'Контрастные сочетания'],
            techniques: ['Градиенты', 'Свечение', 'Высокий контраст'],
            examples: ['Неоновые надписи', 'Яркие иллюстрации', 'Контрастная типографика']
          });
          break;
          
        case 'Природа':
          recommendations.push({
            trend: trend.category,
            description: 'Эко-тематика, растительные мотивы, органические формы',
            colors: ['Зеленые оттенки', 'Земляные тона', 'Натуральная палитра'],
            techniques: ['Акварельные эффекты', 'Органические формы', 'Растительные паттерны'],
            examples: ['Листья и ветки', 'Эко-логотипы', 'Природные текстуры']
          });
          break;
          
        case 'Типографика':
          recommendations.push({
            trend: trend.category,
            description: 'Акцент на шрифтовых решениях и текстовых композициях',
            colors: ['Монохромная схема', 'Контрастный текст'],
            techniques: ['Крупные шрифты', 'Игра с размерами', 'Необычная компоновка'],
            examples: ['Мотивационные слоганы', 'Стильная типографика', 'Текстовые логотипы']
          });
          break;

        case 'Y2K стиль':
          recommendations.push({
            trend: trend.category,
            description: 'Футуристические элементы начала 2000х с цифровой эстетикой',
            colors: ['Металлик', 'Холодные оттенки', 'Неоновые акценты'],
            techniques: ['3D эффекты', 'Металлические текстуры', 'Голографические элементы'],
            examples: ['Киберпанк мотивы', 'Цифровые паттерны', 'Техно-элементы']
          });
          break;

        case 'Абстракция':
          recommendations.push({
            trend: trend.category,
            description: 'Нестандартные формы и художественные интерпретации',
            colors: ['Контрастные сочетания', 'Экспериментальная палитра'],
            techniques: ['Свободные формы', 'Асимметрия', 'Художественные мазки'],
            examples: ['Абстрактные композиции', 'Современное искусство', 'Креативные формы']
          });
          break;

        case 'Спорт и активность':
          recommendations.push({
            trend: trend.category,
            description: 'Динамичные дизайны для активного образа жизни',
            colors: ['Энергичные оттенки', 'Спортивные цвета'],
            techniques: ['Динамические линии', 'Движение в дизайне', 'Спортивная типографика'],
            examples: ['Логотипы команд', 'Мотивационные принты', 'Активная графика']
          });
          break;
          
        default:
          recommendations.push({
            trend: trend.category,
            description: `Актуальное направление с элементами: ${trend.matches.join(', ')}`,
            colors: ['Современная палитра'],
            techniques: ['Современные решения'],
            examples: ['Трендовые элементы']
          });
      }
    });

    if (recommendations.length === 0) {
      recommendations.push({
        trend: 'Базовые рекомендации',
        description: 'Универсальные принципы дизайна для текущего периода',
        colors: ['Экологичные оттенки', 'Естественные цвета'],
        techniques: ['Чистый дизайн', 'Персонализация'],
        examples: ['Локальная тематика', 'Экологические мотивы']
      });
    }

    return recommendations;
  }
}

/**
 * Главный модуль автоматизации
 */
class BOOOMERANGSAutomation {
  constructor() {
    this.priceCalculator = new PriceCalculator();
    this.proposalGenerator = new ProposalGenerator();
    this.trendAnalyzer = new TrendAnalyzer();
  }

  /**
   * Обработка запросов автоматизации
   */
  async processAutomationRequest(request) {
    const { type, data } = request;

    switch (type) {
      case 'price_calculation':
        return this.priceCalculator.getRecommendation(
          data.width, data.height, data.colors, data.quantity, data.hasDetails
        );

      case 'generate_proposal':
        return await this.proposalGenerator.generateProposal(data.client, data.order);

      case 'trend_analysis':
        return await this.trendAnalyzer.analyzeTrends(data.query);

      default:
        return { error: 'Неизвестный тип запроса автоматизации' };
    }
  }
}

module.exports = {
  BOOOMERANGSAutomation,
  PriceCalculator,
  ProposalGenerator,
  TrendAnalyzer
};