import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const schema = z.object({
  token: z.string().min(1, { message: "Токен доступа обязателен" }),
});

type FormData = z.infer<typeof schema>;

export default function BooomerangsAuth() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: data.token }),
      });

      if (!response.ok) {
        throw new Error("Ошибка авторизации");
      }

      const userData = await response.json();
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user", JSON.stringify(userData.user));

      toast({
        title: "Успешно",
        description: "Добро пожаловать в чат!",
      });

      setLocation("/chat");
    } catch (error) {
      console.error(error);
      toast({
        title: "Ошибка",
        description: "Неверный токен доступа",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-r from-blue-800 via-blue-600 to-indigo-700">
      <div className="w-full max-w-md p-8 mx-auto bg-white rounded-3xl shadow-2xl border border-opacity-20 border-white">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-white border-4 border-blue-500 flex items-center justify-center text-4xl font-bold text-blue-500 shadow-lg">
              B
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">
            BOOOMERANGS
          </h1>
          
          <p className="text-gray-500 mb-8">
            Бесплатный доступ к AI без платных API ключей
          </p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              ACCESS TOKEN
            </label>
            <input
              id="token"
              type="password"
              {...register("token")}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.token ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Введите свой токен доступа"
            />
            {errors.token && (
              <p className="text-sm text-red-500">{errors.token.message}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg text-white font-medium transition-all flex items-center justify-center space-x-2"
            style={{
              background: "linear-gradient(to right, #3b82f6, #4f46e5)",
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)"
            }}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Подключение...</span>
              </>
            ) : (
              <span>Войти в чат</span>
            )}
          </button>
        </form>
        
        {/* Примеры сообщений */}
        <div className="mt-10 pt-8 border-t border-gray-200">
          <h3 className="text-center text-lg font-semibold text-gray-700 mb-6">
            Примеры сообщений
          </h3>
          
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            {/* Сообщение пользователя */}
            <div className="flex justify-end">
              <div className="max-w-[80%]">
                <div className="px-4 py-3 rounded-[18px] rounded-br-[4px] text-white relative"
                  style={{
                    background: "linear-gradient(to right, #3b82f6, #4f46e5)",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                  }}>
                  <p>Привет! Расскажи о возможностях BOOOMERANGS AI</p>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right mr-2">
                  14:25
                </div>
              </div>
            </div>
            
            {/* Сообщение от AI */}
            <div className="flex">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white font-medium mr-2 shadow-md">
                B
              </div>
              <div className="max-w-[80%]">
                <div className="px-4 py-3 bg-white rounded-[18px] rounded-bl-[4px] relative shadow-sm border border-gray-100">
                  <p className="text-gray-800">
                    Привет! BOOOMERANGS AI предоставляет бесплатный доступ к возможностям искусственного интеллекта без необходимости платных API ключей.
                    <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      AI
                    </span>
                  </p>
                </div>
                <div className="text-xs text-gray-500 mt-1 ml-2">
                  14:26
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}