import { CheckpointManager } from '@/components/CheckpointManager';

export default function CheckpointsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Система чекпоинтов</h1>
        <p className="text-gray-600">
          Управление автоматическими сохранениями работы агента без ограничений
        </p>
      </div>
      
      <CheckpointManager />
    </div>
  );
}