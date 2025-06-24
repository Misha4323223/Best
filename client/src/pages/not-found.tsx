import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
      <Card className="w-full max-w-md mx-4 p-6 shadow-xl border border-gray-200">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-6">
            <img src="/images/booomerangs-logo.svg" alt="BOOOMERANGS" className="h-28 w-auto" />
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">404</h1>
            <h2 className="text-xl font-semibold text-gray-800">Страница не найдена</h2>
          </div>

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            Запрошенная страница не существует или была перемещена
          </p>
          
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none transition-all shadow-md"
          >
            Вернуться на главную
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
