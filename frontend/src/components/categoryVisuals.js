// Visual das categorias: cores e ícones. Fica em components/ (e não em domain/) porque depende do lucide-react,
// e as regras de domain/ não podem conhecer biblioteca de tela. As categorias em si (nome, tipo, padrão) vêm da API.
import {
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Droplets,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  GraduationCap,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  Lightbulb,
  Music,
  PawPrint,
  Pill,
  PiggyBank,
  Plane,
  Receipt,
  Scale,
  Scissors,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  Utensils,
  Wifi,
  Wrench,
} from 'lucide-react'

// Cores semânticas do sistema
export const COLORS = {
  receita: '#03fc07',
  despesa: '#fc0303',
  sistema: '#facc15', // "Ajuste Financeiro"
}

// Todos os ícones que podem aparecer em uma categoria (pelo nome)
export const ICONS = {
  Baby, Banknote, BookOpen, Briefcase, Bus, Car, Coffee, Droplets, Dumbbell, Film, Fuel, Gamepad2,
  GraduationCap, Gift, HeartPulse, Home, Landmark, Lightbulb, Music, PawPrint, Pill, PiggyBank,
  Plane, Receipt, Scale, Scissors, Shirt, ShoppingCart, Smartphone, Sparkles, TrendingUp, Utensils,
  Wifi, Wrench,
}

// Banco de ícones oferecido ao criar uma nova categoria
export const ICON_BANK = [
  'ShoppingCart', 'Coffee', 'HeartPulse', 'GraduationCap', 'Plane', 'Gift', 'Gamepad2', 'Dumbbell',
  'Shirt', 'PawPrint', 'Smartphone', 'Wifi', 'Fuel', 'Bus', 'Wrench', 'Baby',
  'Film', 'Music', 'BookOpen', 'PiggyBank', 'Landmark', 'Scissors', 'Pill', 'Sparkles',
]

export const categoryColor = (category) => (category.system ? COLORS.sistema : COLORS[category.type])
export const categoryIcon = (category) => ICONS[category.icon] ?? Receipt
