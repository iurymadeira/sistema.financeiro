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

export const ADJUSTMENT_ID = 'ajuste-financeiro'

export const DEFAULT_CATEGORIES = [
  // Despesas
  { id: 'alimentacao', name: 'Alimentação', type: 'despesa', icon: 'Utensils' },
  { id: 'transporte', name: 'Transporte', type: 'despesa', icon: 'Car' },
  { id: 'moradia', name: 'Moradia', type: 'despesa', icon: 'Home' },
  { id: 'energia', name: 'Conta de Energia', type: 'despesa', icon: 'Lightbulb' },
  { id: 'agua', name: 'Conta de Água', type: 'despesa', icon: 'Droplets' },
  // Receitas
  { id: 'salario', name: 'Salário', type: 'receita', icon: 'Banknote' },
  { id: 'investimentos', name: 'Investimentos', type: 'receita', icon: 'TrendingUp' },
  { id: 'consultorias', name: 'Consultorias', type: 'receita', icon: 'Briefcase' },
  // Uso exclusivo do sistema: nunca aparece para o usuário escolher e só é listada no histórico
  { id: ADJUSTMENT_ID, name: 'Ajuste Financeiro', type: 'despesa', icon: 'Scale', system: true },
]

export const categoryColor = (category) => (category.system ? COLORS.sistema : COLORS[category.type])
export const categoryIcon = (category) => ICONS[category.icon] ?? Receipt
