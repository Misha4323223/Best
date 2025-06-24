/**
 * API маршруты для системы чекпоинтов
 */

import { Router, Request, Response } from 'express';
import { checkpointManager, Checkpoint } from './checkpoint-system.js';
import { z } from 'zod';

const router = Router();

// Схема валидации для создания чекпоинта
const createCheckpointSchema = z.object({
  description: z.string().min(1, 'Описание обязательно'),
  action: z.enum(['create', 'modify', 'delete', 'execute']),
  code: z.string().optional(),
  files: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Сохранить новый чекпоинт
 * POST /api/checkpoint/save
 */
router.post('/save', async (req: Request, res: Response) => {
  try {
    const validatedData = createCheckpointSchema.parse(req.body);
    
    const checkpoint = await checkpointManager.saveCheckpoint(
      validatedData.description,
      validatedData.action,
      {
        code: validatedData.code,
        files: validatedData.files,
        metadata: validatedData.metadata
      }
    );

    res.json({
      success: true,
      checkpoint,
      message: `Чекпоинт ${checkpoint.step} сохранён`
    });
  } catch (error) {
    console.error('Ошибка сохранения чекпоинта:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

/**
 * Получить все чекпоинты
 * GET /api/checkpoint/list
 */
router.get('/list', (req: Request, res: Response) => {
  try {
    const checkpoints = checkpointManager.getAllCheckpoints();
    const stats = checkpointManager.getSessionStats();
    
    res.json({
      success: true,
      checkpoints,
      stats,
      total: checkpoints.length
    });
  } catch (error) {
    console.error('Ошибка получения чекпоинтов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки чекпоинтов'
    });
  }
});

/**
 * Получить конкретный чекпоинт
 * GET /api/checkpoint/:step
 */
router.get('/:step', (req: Request, res: Response) => {
  try {
    const step = parseInt(req.params.step);
    if (isNaN(step)) {
      return res.status(400).json({
        success: false,
        error: 'Номер шага должен быть числом'
      });
    }

    const checkpoint = checkpointManager.getCheckpoint(step);
    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        error: `Чекпоинт ${step} не найден`
      });
    }

    res.json({
      success: true,
      checkpoint
    });
  } catch (error) {
    console.error('Ошибка получения чекпоинта:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки чекпоинта'
    });
  }
});

/**
 * Откат к определённому шагу
 * POST /api/checkpoint/rollback/:step
 */
router.post('/rollback/:step', (req: Request, res: Response) => {
  try {
    const step = parseInt(req.params.step);
    if (isNaN(step)) {
      return res.status(400).json({
        success: false,
        error: 'Номер шага должен быть числом'
      });
    }

    const success = checkpointManager.rollbackToStep(step);
    if (!success) {
      return res.status(400).json({
        success: false,
        error: `Не удалось откатиться к шагу ${step}`
      });
    }

    const checkpoint = checkpointManager.getCheckpoint(step);
    res.json({
      success: true,
      message: `Откат к шагу ${step} выполнен`,
      checkpoint
    });
  } catch (error) {
    console.error('Ошибка отката:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка выполнения отката'
    });
  }
});

/**
 * Экспорт сессии
 * GET /api/checkpoint/export
 */
router.get('/export', (req: Request, res: Response) => {
  try {
    const filename = req.query.filename as string;
    const exportPath = checkpointManager.exportSession(filename);
    const stats = checkpointManager.getSessionStats();
    
    res.json({
      success: true,
      exportPath,
      stats,
      message: 'Сессия экспортирована'
    });
  } catch (error) {
    console.error('Ошибка экспорта:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка экспорта сессии'
    });
  }
});

/**
 * Статистика сессии
 * GET /api/checkpoint/stats
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = checkpointManager.getSessionStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

/**
 * Удалить все чекпоинты сессии
 * DELETE /api/checkpoint/clear
 */
router.delete('/clear', (req: Request, res: Response) => {
  try {
    const checkpoints = checkpointManager.getAllCheckpoints();
    const stats = checkpointManager.getSessionStats();
    
    // Создаём финальный экспорт перед удалением
    const exportPath = checkpointManager.exportSession(`final_export_${Date.now()}.json`);
    
    // Здесь можно добавить логику очистки, если нужно
    
    res.json({
      success: true,
      message: `Сессия завершена. Экспортировано ${checkpoints.length} шагов`,
      exportPath,
      stats
    });
  } catch (error) {
    console.error('Ошибка очистки:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка очистки сессии'
    });
  }
});

export default router;