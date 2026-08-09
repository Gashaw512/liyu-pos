// components/navigation/navigation.ts
import { Home, Package, ShoppingCart, BarChart3, Settings } from "lucide-react"

export interface NavItem {
  key: string
  nameAm: string
  nameEn: string
  path: string
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>
  roles: string[]
}

export const navigationConfig: NavItem[] = [
  {
    key: "dashboard",
    nameAm: "መነሻ",
    nameEn: "Home",
    path: "/dashboard",
    icon: Home,
    roles: ["owner", "manager", "cashier", "inventory_clerk", "waiter", "kitchen"]
  },
  {
    key: "inventory",
    nameAm: "ምርት",
    nameEn: "Products",
    path: "/inventory",
    icon: Package,
    roles: ["owner", "manager", "inventory_clerk"]
  },
  {
    key: "sales",
    nameAm: "ሽያጭ",
    nameEn: "Sales",
    path: "/sales",
    icon: ShoppingCart,
    roles: ["owner", "manager", "cashier", "waiter"]
  },
  {
    key: "reports",
    nameAm: "ሪፖርት",
    nameEn: "Reports",
    path: "/reports",
    icon: BarChart3,
    roles: ["owner", "manager"]
  },
  {
    key: "management",
    nameAm: "አስተዳደር",
    nameEn: "Manage",
    path: "/management",
    icon: Settings,
    roles: ["owner", "manager"]
  }
]