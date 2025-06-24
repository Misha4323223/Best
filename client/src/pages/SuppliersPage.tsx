import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MapPin, Globe, MessageCircle, Package, Star, Plus, Search, Filter } from "lucide-react";

interface Supplier {
  id: number;
  name: string;
  category: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country: string;
  website?: string;
  telegram?: string;
  whatsapp?: string;
  specialization?: string;
  brands: string[];
  minOrder?: string;
  paymentTerms?: string;
  deliveryTime?: string;
  notes?: string;
  rating: string;
  status: string;
}

// Стартовая база поставщиков уличной одежды
const initialSuppliers: Supplier[] = [
  {
    id: 1,
    name: "StreetWear Pro",
    category: "streetwear",
    contactPerson: "Алексей Михайлов",
    phone: "+7 (495) 123-45-67",
    email: "orders@streetwear-pro.ru",
    address: "ул. Тверская, 12",
    city: "Москва",
    country: "Россия",
    website: "streetwear-pro.ru",
    telegram: "@streetwear_pro",
    whatsapp: "+79161234567",
    specialization: "Худи, свитшоты, футболки",
    brands: ["Nike", "Adidas", "Supreme", "Off-White"],
    minOrder: "50 000 ₽",
    paymentTerms: "Предоплата 50%, остальное при получении",
    deliveryTime: "3-5 дней",
    notes: "Качественные реплики, быстрая доставка",
    rating: "⭐⭐⭐⭐⭐",
    status: "active"
  },
  {
    id: 2,
    name: "Urban Accessories Hub",
    category: "accessories", 
    contactPerson: "Мария Петрова",
    phone: "+7 (812) 987-65-43",
    email: "info@urbanacc.ru",
    address: "Невский пр., 85",
    city: "Санкт-Петербург",
    country: "Россия",
    website: "urbanacc.ru",
    telegram: "@urban_acc",
    specialization: "Кепки, рюкзаки, сумки, украшения",
    brands: ["New Era", "Herschel", "JanSport", "Vans"],
    minOrder: "30 000 ₽",
    paymentTerms: "100% предоплата",
    deliveryTime: "2-4 дня",
    notes: "Широкий ассортимент аксессуаров",
    rating: "⭐⭐⭐⭐",
    status: "active"
  },
  {
    id: 3,
    name: "Sneaker Kingdom",
    category: "shoes",
    contactPerson: "Дмитрий Козлов",
    phone: "+7 (495) 555-77-88",
    email: "sales@sneaker-kingdom.ru",
    city: "Москва",
    country: "Россия",
    telegram: "@sneaker_kingdom",
    whatsapp: "+79265557788",
    specialization: "Кроссовки, ботинки, сандалии",
    brands: ["Jordan", "Yeezy", "Balenciaga", "Golden Goose"],
    minOrder: "100 000 ₽",
    paymentTerms: "Предоплата 70%",
    deliveryTime: "5-7 дней",
    notes: "Премиум реплики кроссовок",
    rating: "⭐⭐⭐⭐⭐",
    status: "active"
  }
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    category: "streetwear",
    country: "Россия",
    rating: "⭐⭐⭐",
    status: "active",
    brands: []
  });

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || supplier.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const addSupplier = () => {
    if (newSupplier.name) {
      const supplier: Supplier = {
        id: Math.max(...suppliers.map(s => s.id)) + 1,
        name: newSupplier.name,
        category: newSupplier.category || "streetwear",
        contactPerson: newSupplier.contactPerson,
        phone: newSupplier.phone,
        email: newSupplier.email,
        address: newSupplier.address,
        city: newSupplier.city,
        country: newSupplier.country || "Россия",
        website: newSupplier.website,
        telegram: newSupplier.telegram,
        whatsapp: newSupplier.whatsapp,
        specialization: newSupplier.specialization,
        brands: newSupplier.brands || [],
        minOrder: newSupplier.minOrder,
        paymentTerms: newSupplier.paymentTerms,
        deliveryTime: newSupplier.deliveryTime,
        notes: newSupplier.notes,
        rating: newSupplier.rating || "⭐⭐⭐",
        status: newSupplier.status || "active"
      };
      setSuppliers([...suppliers, supplier]);
      setNewSupplier({
        category: "streetwear",
        country: "Россия", 
        rating: "⭐⭐⭐",
        status: "active",
        brands: []
      });
      setShowAddForm(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "streetwear": return "👕";
      case "accessories": return "🎒";
      case "shoes": return "👟";
      default: return "📦";
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case "streetwear": return "Уличная одежда";
      case "accessories": return "Аксессуары";
      case "shoes": return "Обувь";
      default: return "Другое";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            База поставщиков уличной одежды
          </h1>
          <p className="text-gray-400">Управление контактами поставщиков streetwear, аксессуаров и обуви</p>
        </div>

        {/* Поиск и фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск по названию, городу, специализации..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="streetwear">👕 Уличная одежда</SelectItem>
              <SelectItem value="accessories">🎒 Аксессуары</SelectItem>
              <SelectItem value="shoes">👟 Обувь</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить поставщика
          </Button>
        </div>

        {/* Форма добавления */}
        {showAddForm && (
          <Card className="mb-6 bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-purple-400">Добавить нового поставщика</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Название компании *"
                value={newSupplier.name || ""}
                onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                className="bg-gray-800 border-gray-600"
              />
              
              <Select value={newSupplier.category} onValueChange={(value) => setNewSupplier({...newSupplier, category: value})}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="streetwear">👕 Уличная одежда</SelectItem>
                  <SelectItem value="accessories">🎒 Аксессуары</SelectItem>
                  <SelectItem value="shoes">👟 Обувь</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Контактное лицо"
                value={newSupplier.contactPerson || ""}
                onChange={(e) => setNewSupplier({...newSupplier, contactPerson: e.target.value})}
                className="bg-gray-800 border-gray-600"
              />

              <Input
                placeholder="Телефон"
                value={newSupplier.phone || ""}
                onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                className="bg-gray-800 border-gray-600"
              />

              <Input
                placeholder="Email"
                value={newSupplier.email || ""}
                onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                className="bg-gray-800 border-gray-600"
              />

              <Input
                placeholder="Город"
                value={newSupplier.city || ""}
                onChange={(e) => setNewSupplier({...newSupplier, city: e.target.value})}
                className="bg-gray-800 border-gray-600"
              />

              <Input
                placeholder="Telegram"
                value={newSupplier.telegram || ""}
                onChange={(e) => setNewSupplier({...newSupplier, telegram: e.target.value})}
                className="bg-gray-800 border-gray-600"
              />

              <Input
                placeholder="Минимальный заказ"
                value={newSupplier.minOrder || ""}
                onChange={(e) => setNewSupplier({...newSupplier, minOrder: e.target.value})}
                className="bg-gray-800 border-gray-600"
              />

              <div className="md:col-span-2">
                <Textarea
                  placeholder="Специализация (какие товары поставляет)"
                  value={newSupplier.specialization || ""}
                  onChange={(e) => setNewSupplier({...newSupplier, specialization: e.target.value})}
                  className="bg-gray-800 border-gray-600"
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button onClick={addSupplier} className="bg-green-600 hover:bg-green-700">
                  Добавить поставщика
                </Button>
                <Button onClick={() => setShowAddForm(false)} variant="outline" className="border-gray-600">
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Список поставщиков */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="bg-gray-900 border-gray-700 hover:border-purple-500 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-purple-400 mb-1">
                      {getCategoryIcon(supplier.category)} {supplier.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-blue-900 text-blue-300">
                      {getCategoryName(supplier.category)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 text-sm">{supplier.rating}</div>
                    <Badge variant={supplier.status === "active" ? "default" : "secondary"} className="mt-1">
                      {supplier.status === "active" ? "Активен" : "Неактивен"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {supplier.contactPerson && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300">{supplier.contactPerson}</span>
                  </div>
                )}

                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-green-400" />
                    <span className="text-gray-300">{supplier.phone}</span>
                  </div>
                )}

                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-300">{supplier.email}</span>
                  </div>
                )}

                {supplier.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-red-400" />
                    <span className="text-gray-300">{supplier.city}</span>
                  </div>
                )}

                {supplier.telegram && (
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-300">{supplier.telegram}</span>
                  </div>
                )}

                {supplier.specialization && (
                  <div className="text-sm">
                    <span className="text-gray-400">Специализация:</span>
                    <p className="text-gray-300 mt-1">{supplier.specialization}</p>
                  </div>
                )}

                {supplier.brands && supplier.brands.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-400">Бренды:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {supplier.brands.map((brand, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {brand}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {supplier.minOrder && (
                  <div className="text-sm">
                    <span className="text-gray-400">Мин. заказ:</span>
                    <span className="text-green-400 ml-2">{supplier.minOrder}</span>
                  </div>
                )}

                {supplier.deliveryTime && (
                  <div className="text-sm">
                    <span className="text-gray-400">Доставка:</span>
                    <span className="text-yellow-400 ml-2">{supplier.deliveryTime}</span>
                  </div>
                )}

                {supplier.notes && (
                  <div className="text-sm border-t border-gray-700 pt-3">
                    <span className="text-gray-400">Заметки:</span>
                    <p className="text-gray-300 mt-1">{supplier.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-gray-400 mb-2">Поставщики не найдены</h3>
            <p className="text-gray-500">Попробуйте изменить параметры поиска</p>
          </div>
        )}

        {/* Статистика */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{suppliers.length}</div>
              <div className="text-gray-400">Всего поставщиков</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{suppliers.filter(s => s.status === 'active').length}</div>
              <div className="text-gray-400">Активных</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{new Set(suppliers.map(s => s.city).filter(Boolean)).size}</div>
              <div className="text-gray-400">Городов</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}