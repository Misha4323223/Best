import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download } from "lucide-react";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [isLoading, setIsLoading] = useState(false);
  const [svgData, setSvgData] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError("Пожалуйста, введите описание изображения");
      return;
    }

    setError(null);
    setIsLoading(true);
    setSvgData(null);

    try {
      const response = await fetch('/api/svg/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, style })
      });

      if (!response.ok) {
        throw new Error(`Ошибка при генерации изображения: ${response.status}`);
      }

      const data = await response.json();
      setSvgData(data.svg);
      setImageId(data.id);
    } catch (err) {
      console.error("Ошибка:", err);
      setError(err instanceof Error ? err.message : "Произошла ошибка при генерации изображения");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSVG = () => {
    if (!svgData) return;
    
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "image.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    if (!imageId) return;
    
    const a = document.createElement("a");
    a.href = `/api/svg/download?id=${imageId}&format=png`;
    a.download = "image.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-primary to-purple-600 text-transparent bg-clip-text">
        Генератор SVG изображений
      </h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Создать изображение</CardTitle>
            <CardDescription>
              Введите описание и выберите стиль для создания SVG
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="prompt" className="font-medium">
                  Описание изображения
                </label>
                <Textarea
                  id="prompt"
                  placeholder="Напишите детальное описание желаемого изображения..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="style" className="font-medium">
                  Стиль изображения
                </label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите стиль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">Реалистичный</SelectItem>
                    <SelectItem value="abstract">Абстрактный</SelectItem>
                    <SelectItem value="geometric">Геометрический</SelectItem>
                    <SelectItem value="minimalist">Минималистичный</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              <Button
                onClick={generateImage}
                disabled={isLoading || !prompt.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  "Создать SVG"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Результат</CardTitle>
            <CardDescription>
              {svgData
                ? "Ваше SVG изображение готово"
                : "Здесь появится результат"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && svgData && (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-md border flex justify-center">
                  <div
                    dangerouslySetInnerHTML={{ __html: svgData }}
                    className="max-w-full h-auto max-h-[300px]"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={downloadSVG}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    SVG
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={downloadPNG}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PNG
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && !svgData && (
              <div className="flex justify-center items-center py-16 text-gray-400">
                Создайте изображение с помощью формы слева
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}